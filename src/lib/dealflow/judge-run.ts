import { createServerFn } from "@tanstack/react-start";
import { JUDGE_PROMPT, gradeCase, type GradedCase, type JudgeCase } from "@/lib/dealflow/judge";

function isDecision(value: unknown): value is JudgeCase["actual"] {
  return value === "Approve" || value === "Escalate" || value === "Reject";
}

function asCase(value: unknown): JudgeCase | null {
  if (!value || typeof value !== "object") return null;
  const row = value as JudgeCase;
  if (typeof row.id !== "string" || !isDecision(row.actual)) return null;
  return {
    id: row.id.slice(0, 40),
    expected: isDecision(row.expected) ? row.expected : null,
    actual: row.actual,
    confidence: Number(row.confidence) || 0,
    threshold: Number(row.threshold) || 0,
    cited: Array.isArray(row.cited) ? row.cited.map(String).slice(0, 8) : [],
    noteAttack: typeof row.noteAttack === "string" ? row.noteAttack.slice(0, 220) : null,
    specialistDecisions: Array.isArray(row.specialistDecisions)
      ? row.specialistDecisions.filter(isDecision).slice(0, 2)
      : [],
    assignee: typeof row.assignee === "string" ? row.assignee.slice(0, 80) : null,
    slaHours: typeof row.slaHours === "number" ? row.slaHours : null,
  };
}

export const runLlmJudge = createServerFn({ method: "POST" })
  .validator((input: { cases: JudgeCase[] }) => {
    const cases = Array.isArray(input?.cases) ? input.cases.map(asCase).filter((row): row is JudgeCase => Boolean(row)) : [];
    return { cases: cases.slice(0, 12) };
  })
  .handler(async ({ data }) => {
    const rubric = data.cases.map(gradeCase);
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey || data.cases.length === 0) {
      return {
        source: "rubric" as const,
        note: apiKey
          ? "Nothing to grade."
          : "The model is not configured here. The same five checks ran on-box. The decision hop did not wait on a model.",
        cases: rubric,
        inputTokens: 0,
        outputTokens: 0,
        traceId: null,
      };
    }
    try {
      const messages = [
        { role: "system" as const, content: JUDGE_PROMPT },
        {
          role: "user" as const,
          content: JSON.stringify({
            cases: data.cases.map((row) => ({
              id: row.id,
              expected: row.expected,
              actual: row.actual,
              confidence: row.confidence,
              threshold: row.threshold,
              cited: row.cited,
              noteAttack: row.noteAttack,
              assignee: row.assignee,
              slaHours: row.slaHours,
            })),
          }),
        },
      ];
      const { runTracedModel } = await import("@/lib/dealflow/langfuse.server");
      const traced = await runTracedModel({
        name: "llm-judge",
        userId: "revops",
        sessionId: data.cases.map((row) => row.id).join(",").slice(0, 200),
        segment: "eval",
        model: "grok-4.5",
        messages,
        run: async () => {
          const res = await fetch("https://api.x.ai/v1/chat/completions", {
            method: "POST",
            signal: AbortSignal.timeout(25000),
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: "grok-4.5",
              temperature: 0,
              max_tokens: 1200,
              response_format: { type: "json_object" },
              messages,
            }),
          });
          if (!res.ok) {
            return { output: `HTTP ${res.status}`, inputTokens: 0, outputTokens: 0, value: null };
          }
          const body = (await res.json()) as {
            choices?: { message?: { content?: string } }[];
            usage?: { prompt_tokens?: number; completion_tokens?: number };
          };
          const raw = body.choices?.[0]?.message?.content ?? "";
          return {
            output: raw,
            inputTokens: body.usage?.prompt_tokens ?? 0,
            outputTokens: body.usage?.completion_tokens ?? 0,
            value: body,
          };
        },
      });
      if (!traced.value) {
        return {
          source: "rubric" as const,
          note: "The model did not return a grade. The on-box judge scored the same checks.",
          cases: rubric,
          inputTokens: 0,
          outputTokens: 0,
          traceId: traced.traceId,
        };
      }
      const body = traced.value;
      const raw = body.choices?.[0]?.message?.content ?? "";
      const cleaned = raw.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
      const parsed = JSON.parse(cleaned) as { cases?: { id?: string; pass?: boolean; failed?: string[] }[] };
      const byId = new Map((parsed.cases ?? []).map((row) => [row.id, row]));
      const cases: GradedCase[] = data.cases.map((row) => {
        const local = gradeCase(row);
        const model = byId.get(row.id);
        if (!model || typeof model.pass !== "boolean") return local;
        const failed = new Set(model.failed ?? []);
        return {
          id: row.id,
          pass: failed.size === 0 && local.pass && model.pass !== false,
          checks: local.checks.map((check) => ({
            ...check,
            pass: failed.has(check.id) ? false : check.pass,
            detail: failed.has(check.id) ? `${check.detail} The model failed this check.` : check.detail,
          })),
        };
      });
      return {
        source: "grok" as const,
        note: "Grok graded the engine output. It did not decide the quotes.",
        cases,
        inputTokens: body.usage?.prompt_tokens ?? 0,
        outputTokens: body.usage?.completion_tokens ?? 0,
        traceId: traced.traceId,
      };
    } catch {
      return {
        source: "rubric" as const,
        note: "The model could not be reached. The on-box judge scored the same checks.",
        cases: rubric,
        inputTokens: 0,
        outputTokens: 0,
        traceId: null,
      };
    }
  });
