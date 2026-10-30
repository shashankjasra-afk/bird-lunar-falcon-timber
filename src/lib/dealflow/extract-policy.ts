import { createServerFn } from "@tanstack/react-start";
import { parsePolicyText, patchFromModel } from "@/lib/dealflow/parse-policy";
import type { PolicyPatch } from "@/lib/dealflow/types";

export const extractPolicyDocument = createServerFn({ method: "POST" })
  .validator((input: { text: string }) => {
    if (!input || typeof input.text !== "string") {
      throw new Error("Missing document");
    }
    return { text: input.text.slice(0, 14000) };
  })
  .handler(async ({ data }) => {
    const text = data.text.trim();
    if (text.length < 40) {
      return { ok: false as const, error: "Paste or upload a policy with at least a few rules." };
    }
    const local = parsePolicyText(text);
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      return {
        ok: true as const,
        extractor: "local" as const,
        note: "The model is not configured in this environment. The on-box extractor read the document. RevOps still has to confirm before it goes live.",
        patch: local,
      };
    }
    try {
      const messages = [
        {
          role: "system" as const,
          content:
            "You extract SaaS CPQ approval policy from messy documents into JSON. Include only numbers and risk labels the document actually states. Do not invent. segments: Enterprise, Mid-Market, SMB. dealType: new_business, renewal, expansion, addon. Risk values: preferred, acceptable, elevated, high_risk. Term keys: Due on Receipt, Net-30, Net-45, Net-60, Net-90. Billing keys: Monthly, Quarterly, Annual, Multi-Year Prepay. suggestedThreshold is the auto-approve confidence if stated, else null.",
        },
        {
          role: "user" as const,
          content: `${text}\n\nReturn JSON: {"bands":[{"segment":"Enterprise","dealType":"renewal","maxStandard":20,"maxException":26,"maxIncreaseVsPrevious":4}],"terms":{"Net-60":"elevated"},"billing":{"Monthly":"high_risk"},"suggestedThreshold":80}`,
        },
      ];
      const { runTracedModel } = await import("@/lib/dealflow/langfuse.server");
      const traced = await runTracedModel({
        name: "policy-extract",
        userId: "revops",
        sessionId: "policy-onboard",
        segment: "policy",
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
              max_tokens: 1800,
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
          return {
            output: body.choices?.[0]?.message?.content ?? "",
            inputTokens: body.usage?.prompt_tokens ?? 0,
            outputTokens: body.usage?.completion_tokens ?? 0,
            value: body.choices?.[0]?.message?.content ?? "",
          };
        },
      });
      if (!traced.value) {
        return {
          ok: true as const,
          extractor: "local" as const,
          note: "The model did not return rules. The on-box extractor read the document instead. RevOps still confirms before it goes live.",
          patch: local,
          traceId: traced.traceId,
        };
      }
      const cleaned = traced.value.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
      const modelPatch = patchFromModel(JSON.parse(cleaned) as unknown);
      const patch: PolicyPatch = modelPatch ?? local;
      return {
        ok: true as const,
        extractor: modelPatch ? ("grok" as const) : ("local" as const),
        note: modelPatch
          ? "Grok extracted structured rules from the document. Nothing is live until RevOps confirms."
          : "The model reply was not usable. The on-box extractor read the document. RevOps still confirms before it goes live.",
        patch,
        traceId: traced.traceId,
      };
    } catch {
      return {
        ok: true as const,
        extractor: "local" as const,
        note: "The model could not be reached. The on-box extractor read the document. RevOps still confirms before it goes live.",
        patch: local,
        traceId: null,
      };
    }
  });
