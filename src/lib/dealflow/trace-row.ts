import type { Decision, FinalDecision, LangfuseTraceInput, Quote } from "@/lib/dealflow/types";

export function traceFromDecision(
  quote: Quote,
  decision: FinalDecision,
  extra?: Partial<Pick<LangfuseTraceInput, "kind" | "judgeSource" | "judgePass" | "inputTokens" | "outputTokens">>,
): LangfuseTraceInput {
  return {
    kind: extra?.kind ?? "decision",
    quoteId: quote.id,
    account: quote.account.name,
    sellerId: quote.seller.id,
    segment: quote.account.segment,
    decision: decision.overallDecision,
    confidence: decision.overallConfidence,
    rule: decision.rule,
    engineMs: decision.engineMs,
    noteAttack: decision.noteAttack,
    cited: decision.specialists.flatMap((agent) => agent.cited),
    expected: quote.goldenExpected,
    assignee: decision.assignment?.assignee ?? null,
    slaHours: decision.assignment?.slaHours ?? null,
    specialists: decision.specialists.slice(0, 2).map((agent) => ({
      name: agent.agentName.startsWith("Payment") ? ("payment-terms" as const) : ("discount-pricing" as const),
      decision: agent.decision,
      confidence: agent.confidence,
      cited: agent.cited.slice(0, 4),
    })),
    judgeSource: extra?.judgeSource ?? null,
    judgePass: extra?.judgePass ?? null,
    inputTokens: extra?.inputTokens ?? 0,
    outputTokens: extra?.outputTokens ?? 0,
  };
}

export function rememberTraces(
  result: { delivered: boolean; host: string; note: string; traces: { quoteId: string; traceId: string }[] },
  rows: { quoteId: string; kind: "decision" | "judge"; decision: Decision }[],
  push: (event: {
    id: string;
    at: string;
    quoteId: string;
    kind: "decision" | "judge";
    decision: string;
    delivered: boolean;
    traceId: string;
    host: string;
    note: string;
  }) => void,
) {
  const at = new Date().toISOString();
  result.traces.forEach((trace, index) => {
    const row = rows[index];
    if (!row) return;
    push({
      id: `${at}-${row.quoteId}-${index}`,
      at,
      quoteId: row.quoteId,
      kind: row.kind,
      decision: row.decision,
      delivered: result.delivered,
      traceId: trace.traceId,
      host: result.host,
      note: result.note,
    });
  });
}
