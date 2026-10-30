import { createServerFn } from "@tanstack/react-start";
import type { Decision, LangfuseTraceInput } from "@/lib/dealflow/types";

function isDecision(value: unknown): value is Decision {
  return value === "Approve" || value === "Escalate" || value === "Reject";
}

function asRow(value: unknown): LangfuseTraceInput | null {
  if (!value || typeof value !== "object") return null;
  const row = value as LangfuseTraceInput;
  if ((row.kind !== "decision" && row.kind !== "judge") || typeof row.quoteId !== "string" || !isDecision(row.decision)) {
    return null;
  }
  return {
    kind: row.kind,
    quoteId: row.quoteId.slice(0, 40),
    account: String(row.account ?? "").slice(0, 80),
    sellerId: String(row.sellerId ?? "").slice(0, 80),
    segment: String(row.segment ?? "").slice(0, 40),
    decision: row.decision,
    confidence: Number(row.confidence) || 0,
    rule: String(row.rule ?? "").slice(0, 160),
    engineMs: Number(row.engineMs) || 0,
    noteAttack: typeof row.noteAttack === "string" ? row.noteAttack.slice(0, 220) : null,
    cited: Array.isArray(row.cited) ? row.cited.map(String).slice(0, 6) : [],
    expected: isDecision(row.expected) ? row.expected : null,
    assignee: typeof row.assignee === "string" ? row.assignee.slice(0, 80) : null,
    slaHours: typeof row.slaHours === "number" ? row.slaHours : null,
    specialists: Array.isArray(row.specialists)
      ? row.specialists
          .filter((item) => item && (item.name === "discount-pricing" || item.name === "payment-terms"))
          .slice(0, 2)
          .map((item) => ({
            name: item.name,
            decision: isDecision(item.decision) ? item.decision : row.decision,
            confidence: Number(item.confidence) || 0,
            cited: Array.isArray(item.cited) ? item.cited.map(String).slice(0, 4) : [],
          }))
      : [],
    judgeSource: row.judgeSource === "grok" || row.judgeSource === "rubric" ? row.judgeSource : null,
    judgePass: typeof row.judgePass === "boolean" ? row.judgePass : null,
    inputTokens: Number(row.inputTokens) || 0,
    outputTokens: Number(row.outputTokens) || 0,
  };
}

export const getLangfuseStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { langfuseStatus } = await import("@/lib/dealflow/langfuse.server");
  return langfuseStatus();
});

export const recordTraces = createServerFn({ method: "POST" })
  .validator((input: { rows: LangfuseTraceInput[] }) => {
    const rows = Array.isArray(input?.rows) ? input.rows.map(asRow).filter((row): row is LangfuseTraceInput => Boolean(row)) : [];
    return { rows: rows.slice(0, 12) };
  })
  .handler(async ({ data }) => {
    const { emitDealflowTraces } = await import("@/lib/dealflow/langfuse.server");
    return emitDealflowTraces(data.rows);
  });
