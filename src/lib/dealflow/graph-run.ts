import { createServerFn } from "@tanstack/react-start";
import { reviewQuote } from "@/lib/dealflow/engine";
import type { Decision, DiscountPolicy, PaymentPolicy, Quote, Settings } from "@/lib/dealflow/types";

export interface GraphNode {
  node: string;
  summary: string;
}

export interface GraphResult {
  stack: string[];
  quoteId: string;
  overall: Decision;
  confidence: number;
  rule: string;
  guardrail: string;
  plan: string;
  nodes: GraphNode[];
}

function isDecision(value: unknown): value is Decision {
  return value === "Approve" || value === "Escalate" || value === "Reject";
}

export async function callGraph(quote: Quote, discountPolicy: DiscountPolicy, paymentPolicy: PaymentPolicy, settings: Settings): Promise<GraphResult | null> {
  const grounded = reviewQuote(quote, discountPolicy, paymentPolicy, settings);
  const [discount, payment] = grounded.specialists;
  if (!discount || !payment) return null;
  const payload = {
    quote_id: quote.id,
    account: quote.account.name,
    segment: quote.account.segment,
    quote_type: quote.type,
    threshold: settings.confidenceThreshold,
    respect_reject: settings.respectReject,
    note_attack: grounded.noteAttack,
    discount_decision: discount.decision,
    discount_confidence: discount.confidence,
    discount_thought: discount.comments,
    discount_cited: discount.cited,
    payment_decision: payment.decision,
    payment_confidence: payment.confidence,
    payment_thought: payment.comments,
    payment_cited: payment.cited,
  };
  try {
    const res = await fetch("http://127.0.0.1:8091/hop", {
      method: "POST",
      signal: AbortSignal.timeout(4000),
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as {
      stack?: string[];
      quote_id?: string;
      overall?: string;
      confidence?: number;
      rule?: string;
      guardrail?: string;
      plan?: string;
      nodes?: { node?: string; summary?: string }[];
    };
    if (!isDecision(body.overall) || !Array.isArray(body.nodes)) return null;
    return {
      stack: Array.isArray(body.stack) ? body.stack.map(String) : ["Python", "LangGraph", "Pydantic"],
      quoteId: String(body.quote_id ?? quote.id),
      overall: body.overall,
      confidence: Number(body.confidence) || 0,
      rule: String(body.rule ?? ""),
      guardrail: String(body.guardrail ?? ""),
      plan: String(body.plan ?? ""),
      nodes: body.nodes.map((node) => ({ node: String(node.node ?? ""), summary: String(node.summary ?? "") })),
    };
  } catch {
    return null;
  }
}

export const runLangGraph = createServerFn({ method: "POST" })
  .validator((input: { quote: Quote; discountPolicy: DiscountPolicy; paymentPolicy: PaymentPolicy; settings: Settings }) => input)
  .handler(async ({ data }) => {
    const graph = await callGraph(data.quote, data.discountPolicy, data.paymentPolicy, data.settings);
    if (!graph) {
      return {
        ok: false as const,
        note: "The Python graph is not answering on port 8091. The page is still using the in-app reading.",
        graph: null,
      };
    }
    return { ok: true as const, note: "LangGraph finished. Each node returned a Pydantic object.", graph };
  });
