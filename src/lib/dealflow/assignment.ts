import type { AgentDecision, Assignment, AssignmentRule, Decision, Quote } from "@/lib/dealflow/types";

function named(rule: AssignmentRule, cash: boolean): { assignee: string; externalId: string } {
  if (cash && rule.assigneeCash) {
    return { assignee: rule.assigneeCash, externalId: rule.externalIdCash || rule.externalId };
  }
  return { assignee: rule.assignee, externalId: rule.externalId };
}

export function assignCase(
  quote: Quote,
  discount: AgentDecision,
  payment: AgentDecision,
  overall: Decision,
  rules: AssignmentRule[],
  net: number,
): Assignment | null {
  if (overall === "Approve") return null;
  const flags = [...discount.flags, ...payment.flags];
  const hardViolation =
    overall === "Reject" ||
    flags.some((flag) => flag.startsWith("Exceeds maximum") || flag.includes("High value + high-risk"));
  const poorTerms = payment.flags.some((flag) => /High-risk|Elevated|Worsening/.test(flag));
  const highDiscount = discount.flags.length > 0;
  const gaming = flags.some((flag) => flag.includes("period-end"));
  const material = flags.some(
    (flag) => flag.includes("jump") || flag.includes("Worsening") || flag.includes("Elevated") || flag.includes("Above standard"),
  );

  let ruleId: Assignment["ruleId"] = "mild";
  if (hardViolation) ruleId = "violation";
  else if ((highDiscount && poorTerms) || (net > 200000 && poorTerms)) ruleId = "severe";
  else if (gaming) ruleId = "gaming";
  else if (material || highDiscount || poorTerms) ruleId = "material";

  const rule = rules.find((item) => item.id === ruleId) ?? rules.find((item) => item.id === "mild");
  if (!rule) return null;

  const discountHit = discount.decision !== "Approve";
  const cashHit = payment.decision !== "Approve";
  let picked = named(rule, false);
  if (rule.assigneeCash && (ruleId === "material" || ruleId === "violation")) {
    if (cashHit && !discountHit) picked = named(rule, true);
    else if (cashHit && discountHit) {
      picked = {
        assignee: `${rule.assignee} + ${rule.assigneeCash}`,
        externalId: [rule.externalId, rule.externalIdCash].filter(Boolean).join(" + "),
      };
    }
  }

  const reason =
    ruleId === "violation"
      ? `Clear policy violation on ${quote.id}. ${flags.slice(0, 2).join("; ") || "A specialist rejected."}`
      : ruleId === "severe"
        ? `High discount with weak cash terms, or a large deal on weak terms. Net ${Math.round(net).toLocaleString("en-US")}.`
        : ruleId === "gaming"
          ? "Quarter-end elevated discount. Tighter SLA so the period-close queue sees it first."
          : ruleId === "material"
            ? cashHit && !discountHit
              ? `Payment terms moved past the standard book. ${flags[0] ?? "Cash exception needs Finance."}`
              : `Discount moved past the standard book. ${flags[0] ?? "Exception needs an owner."}`
            : "Mild exception inside the ceiling. A manager can clear it without an executive.";

  return {
    ruleId,
    assignee: picked.assignee,
    queue: rule.queue,
    slaHours: rule.slaHours,
    reason,
    externalId: picked.externalId,
    integration: rule.integration,
  };
}