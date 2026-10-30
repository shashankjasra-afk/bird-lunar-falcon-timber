import { assignCase } from "@/lib/dealflow/assignment";
import { cashInvestigation, discountInvestigation } from "@/lib/dealflow/history";
import { quoteTotals, round1, typeKey } from "@/lib/dealflow/format";
import { defaultAssignmentRules } from "@/lib/dealflow/policies";
import type {
  AgentDecision,
  Beat,
  Decision,
  DiscountPolicy,
  FinalDecision,
  PaymentPolicy,
  PaymentTerms,
  Quote,
  Settings,
} from "@/lib/dealflow/types";

const TERM_ORDER: PaymentTerms[] = ["Due on Receipt", "Net-30", "Net-45", "Net-60", "Net-90"];

const NOTE_ATTACK = [
  /ignore (?:all |the |your )?(?:discount |payment |commercial )?(?:policy|book|rules)/i,
  /you are now/i,
  /admin mode/i,
  /do not escalate/i,
  /mark (?:this |the )?quote approved/i,
  /override (?:the |all )?(?:policy|book|rules)/i,
  /disregard (?:the |all )?(?:discount |payment |commercial )?(?:policy|book|rules)/i,
  /\bsystem\s*:/i,
];

export function detectNoteAttack(notes: string): string | null {
  const line = notes
    .split("\n")
    .map((row) => row.trim())
    .find((row) => NOTE_ATTACK.some((pattern) => pattern.test(row)));
  if (!line) return null;
  return line.slice(0, 220);
}

function clamp(n: number): number {
  return Math.max(5, Math.min(97, Math.round(n)));
}

function isWorse(previous: string, current: string): boolean {
  const a = TERM_ORDER.indexOf(previous as PaymentTerms);
  const b = TERM_ORDER.indexOf(current as PaymentTerms);
  if (a === -1 || b === -1) return true;
  return b > a;
}

function nearQuarterEnd(quoteDate: string, maxStandard: number, discount: number): boolean {
  const [yearRaw, monthRaw, dayRaw] = quoteDate.split("-").map(Number);
  if (!yearRaw || !monthRaw || !dayRaw) return false;
  const quarterEnds = [1, 4, 7, 10];
  if (!quarterEnds.includes(monthRaw)) return false;
  const lastDay = new Date(Date.UTC(yearRaw, monthRaw, 0)).getUTCDate();
  const inWindow = dayRaw >= lastDay - 4;
  return inWindow && discount >= maxStandard - 2;
}

function reviewDiscount(
  quote: Quote,
  policy: DiscountPolicy,
  settings: Settings,
): AgentDecision {
  const totals = quoteTotals(quote);
  const key = typeKey(quote.type);
  const segmentPolicy = policy.segments[quote.account.segment] ?? policy.segments.Enterprise;
  const band = segmentPolicy[key] ?? segmentPolicy.new_business;
  const credit =
    quote.billingFrequency === "Multi-Year Prepay" ? settings.prepayCreditPts : 0;
  const maxStandard = band.maxStandard + credit;
  const maxException = band.maxException + credit;
  const maxJump = (band.maxIncreaseVsPrevious ?? 5) + credit;

  const reasoning: string[] = [];
  const flags: string[] = [];
  const cited: string[] = [`${policy.policyId} → ${quote.account.segment}.${key}`];
  let confidence = 88;
  const cuts: string[] = [];

  reasoning.unshift(discountInvestigation(quote));
  if (credit > 0) {
    reasoning.push(
      `CR-02: Multi-year prepay adds ${credit} pts. Standard ceiling ${band.maxStandard}% → ${maxStandard}%. Exception ceiling ${band.maxException}% → ${maxException}%.`,
    );
    cited.push("CR-02 multi-year prepay allowance");
  } else {
    reasoning.push(
      `Standard ceiling ${maxStandard}%. Exception ceiling ${maxException}%.`,
    );
  }

  const discount = totals.discount;
  if (discount <= maxStandard) {
    reasoning.push(
      `Proposed discount ${discount}% is inside the standard ceiling of ${maxStandard}%.`,
    );
    cited.push(`Within standard (${maxStandard}%)`);
  } else if (discount <= maxException) {
    const delta = round1(discount - maxStandard);
    reasoning.push(
      `Proposed discount ${discount}% is ${delta} pts over standard and still under the exception ceiling of ${maxException}%.`,
    );
    flags.push(`Above standard discount (by ${delta} pts)`);
    cited.push(`Between standard (${maxStandard}%) and exception (${maxException}%)`);
    confidence -= 18;
    cuts.push("−18 above the standard ceiling");
  } else {
    const delta = round1(discount - maxException);
    reasoning.push(
      `Proposed discount ${discount}% exceeds the exception ceiling of ${maxException}% by ${delta} pts.`,
    );
    flags.push("Exceeds maximum exception discount");
    cited.push(`Above exception ceiling (${maxException}%)`);
    confidence -= 45;
    cuts.push("−45 past the exception ceiling");
  }

  if (quote.historical?.previousDiscountPct != null) {
    const prev = quote.historical.previousDiscountPct;
    const jump = round1(discount - prev);
    reasoning.push(`Previous contract discount was ${prev}%. This ask is ${jump >= 0 ? "+" : ""}${jump} pts.`);
    if (jump > maxJump) {
      flags.push(`Discount jump vs history exceeds policy (${jump} pts > ${maxJump} pts)`);
      cited.push(`SR-02 historical jump (limit ${maxJump} pts)`);
      confidence -= 15;
      cuts.push(`−15 jump above the ${maxJump} pt step`);
      reasoning.push(
        `SR-02: an increase above ${maxJump} pts versus the prior contract goes to Deal Desk.`,
      );
    } else if (jump > 0) {
      reasoning.push(`The ${jump} pt change is inside the allowed ${maxJump} pt band.`);
    }
  }

  const tiers = band.volumeTiers;
  if (tiers?.length) {
    const tier = tiers.find((row) => totals.net >= row.minAcv && totals.net < row.maxAcv);
    if (tier && discount > tier.maxDiscount + 3) {
      reasoning.push(
        `Net ${Math.round(totals.net).toLocaleString("en-US")} sits in a volume tier capped at ${tier.maxDiscount}%.`,
      );
      flags.push(`Above volume-tier maximum (${tier.maxDiscount}%)`);
      confidence -= 12;
      cuts.push("−12 above the volume tier");
    } else if (tier) {
      reasoning.push(
        `Net value sits in the ${tier.maxDiscount}% volume tier. Discount is inside that band.`,
      );
    }
  }

  if (totals.net < 50000 && discount > 25) {
    flags.push("High discount on small deal (< $50k)");
    cited.push("SR-03 small deal high discount");
    confidence -= 15;
    cuts.push("−15 small deal above 25%");
    reasoning.push("SR-03: under $50k net and above 25% off is escalated by default.");
  }

  if (nearQuarterEnd(quote.quoteDate, maxStandard, discount)) {
    flags.push("Near period-end with elevated discount");
    cited.push("SR-01 quarter-end elevated scrutiny");
    confidence -= 10;
    cuts.push("−10 quarter-end window");
    reasoning.push(
      "SR-01: quote date is in the last 5 days of a fiscal quarter and the discount is within 2 pts of the standard ceiling.",
    );
  }

  const clamped = clamp(confidence);
  confidence = clamped;
  let decision: Decision;
  let comments: string;
  let floorNote = "";
  if (flags.includes("Exceeds maximum exception discount")) {
    decision = "Reject";
    comments = `Reject. ${discount}% exceeds the ${maxException}% exception ceiling in ${policy.policyId} for ${quote.account.segment} ${quote.type}. This needs a VP exception.`;
  } else if (flags.length && confidence < 68) {
    decision = "Escalate";
    comments = `Escalate to Deal Desk. ${discount}% is over the ${maxStandard}% standard and/or trips a special rule. Cited: ${cited.slice(0, 3).join(", ")}.`;
  } else if (flags.length) {
    decision = "Escalate";
    comments = `Escalate. Not a hard breach, but the discount profile has risk flags under ${policy.policyId}.`;
  } else {
    decision = "Approve";
    comments = `Approve. ${discount}% is inside the ${maxStandard}% standard for ${quote.account.segment} ${quote.type} (${policy.policyId}).`;
    const floored = Math.max(confidence, 84);
    floorNote = floored === confidence ? " Clean approve keeps the score. The floor is 84." : " Clean approve lifts the score to the 84 floor.";
    confidence = floored;
  }

  const formula = `Start 88${cuts.length ? " " + cuts.join(" ") : ""}. Clamp 5–97 → ${clamped}.${floorNote} = ${confidence}%.`;
  reasoning.push(formula);

  return {
    agentName: "Discount & Pricing",
    decision,
    confidence,
    reasoning,
    comments,
    flags,
    cited,
    formula,
  };
}

function reviewPayment(quote: Quote, policy: PaymentPolicy): AgentDecision {
  const totals = quoteTotals(quote);
  const reasoning: string[] = [];
  const flags: string[] = [];
  const cited: string[] = [policy.policyId];
  let confidence = 90;
  const cuts: string[] = [];
  const terms = quote.paymentTerms;
  const billing = quote.billingFrequency;
  const termBucket = policy.terms[terms] ?? "high_risk";
  const billBucket = policy.billing[billing] ?? "high_risk";

  reasoning.push(`Loaded ${policy.policyName} ${policy.version} (${policy.policyId}).`);

  if (termBucket === "preferred") {
    reasoning.push(`${terms} is a preferred payment term.`);
    cited.push("Preferred payment terms");
  } else if (termBucket === "acceptable") {
    reasoning.push(`${terms} is acceptable. Soft flag only.`);
    flags.push(`Non-preferred payment terms (${terms})`);
    cited.push("Acceptable payment terms");
    confidence -= 8;
    cuts.push("−8 acceptable terms");
  } else if (termBucket === "elevated") {
    reasoning.push(`${terms} is elevated risk and stretches DSO.`);
    flags.push(`Elevated payment terms (${terms})`);
    cited.push("Elevated payment terms");
    confidence -= 22;
    cuts.push("−22 elevated terms");
  } else {
    reasoning.push(`${terms} is high-risk and outside ordinary policy.`);
    flags.push(`High-risk payment terms (${terms})`);
    cited.push("High-risk payment terms");
    confidence -= 40;
    cuts.push("−40 high-risk terms");
  }

  if (billBucket === "preferred") {
    reasoning.push(`${billing} is a preferred billing frequency.`);
    if (billing === "Multi-Year Prepay") {
      reasoning.push("Multi-year prepay is a cash and retention positive.");
      const lifted = Math.min(97, confidence + 6);
      cuts.push(`+6 multi-year prepay → ${lifted}`);
      confidence = lifted;
    }
    cited.push("Preferred billing frequency");
  } else if (billBucket === "acceptable") {
    reasoning.push(`${billing} billing is acceptable.`);
    confidence -= 5;
    cuts.push("−5 acceptable billing");
  } else {
    reasoning.push(`${billing} billing is high-risk: more overhead and slower cash.`);
    flags.push(`High-risk billing frequency (${billing})`);
    cited.push("High-risk billing");
    confidence -= 20;
    cuts.push("−20 high-risk billing");
  }

  const prev = quote.historical?.previousPaymentTerms;
  if (prev && prev !== terms) {
    reasoning.push(`Payment terms move from ${prev} to ${terms}.`);
    if (isWorse(prev, terms)) {
      flags.push("Worsening of payment terms vs previous contract");
      cited.push("CR-01 worsening on renewal");
      confidence -= 18;
      cuts.push("−18 worse than the last contract");
      reasoning.push("CR-01: a longer payment term than the prior contract must be escalated.");
    } else {
      reasoning.push("The new terms are shorter than the prior contract. No worsening flag.");
    }
  }

  if (totals.net > 200000 && termBucket === "high_risk") {
    flags.push("High value + high-risk terms");
    cited.push("CR-03 high value + high risk");
    confidence -= 12;
    cuts.push("−12 high value with high-risk terms");
    reasoning.push("CR-03: above $200k net with high-risk terms needs VP Finance.");
  }

  const payClamped = clamp(confidence);
  confidence = payClamped;
  const bothHighRisk = termBucket === "high_risk" && billBucket === "high_risk";
  let decision: Decision;
  let comments: string;
  let floorNote = "";
  if (bothHighRisk) {
    decision = "Reject";
    comments = `Reject. ${terms} together with ${billing} is an unacceptable cash position under ${policy.policyId}. Needs a VP Finance exception.`;
  } else if (flags.length && confidence < 70) {
    decision = "Escalate";
    comments = `Escalate. Terms (${terms}) and/or billing (${billing}) leave preferred standards or worsen the prior contract. Cited: ${cited.slice(0, 3).join(", ")}.`;
  } else if (flags.length) {
    decision = "Escalate";
    comments = `Escalate. Not a hard cash breach, but flags require Deal Desk under ${policy.policyId}.`;
  } else {
    decision = "Approve";
    comments = `Approve. ${terms} and ${billing} sit in preferred or acceptable standards (${policy.policyId}).`;
    const floored = Math.max(confidence, 85);
    floorNote = floored === confidence ? " Clean approve keeps the score. The floor is 85." : " Clean approve lifts the score to the 85 floor.";
    confidence = floored;
  }

  const formula = `Start 90${cuts.length ? " " + cuts.join(" ") : ""}. Clamp 5–97 → ${payClamped}.${floorNote} = ${confidence}%.`;
  reasoning.push(formula);

  reasoning.unshift(cashInvestigation(quote));

  return {
    agentName: "Payment Terms & Billing",
    decision,
    confidence,
    reasoning,
    comments,
    flags,
    cited,
    formula,
  };
}

function stageFor(decision: Decision): FinalDecision["resultingStage"] {
  if (decision === "Approve") return "approved";
  if (decision === "Reject") return "rejected";
  return "submitted";
}

function writebackFor(decision: Decision, assignment: { assignee: string; slaHours: number; reason: string } | null): string {
  if (decision === "Approve") {
    return "The agents wrote the stage from Submit for approval to Approved. No person is in the queue. The seller can send the quote.";
  }
  if (!assignment) {
    return decision === "Reject"
      ? "The agents rejected the quote and returned it to the seller."
      : "The agents held the quote at Submit for approval.";
  }
  const lead = decision === "Reject" ? "The agents rejected the quote." : "The agents held the quote on Submit for approval.";
  return `${lead} Assigned to: ${assignment.assignee} | SLA: ${assignment.slaHours}h | Reason: ${assignment.reason}`;
}

export function reviewQuote(
  quote: Quote,
  discountPolicy: DiscountPolicy,
  paymentPolicy: PaymentPolicy,
  settings: Settings,
): FinalDecision {
  const started = performance.now();
  const totals = quoteTotals(quote);
  const discount = reviewDiscount(quote, discountPolicy, settings);
  const payment = reviewPayment(quote, paymentPolicy);
  const decisions = [discount.decision, payment.decision];
  const confidences = [discount.confidence, payment.confidence];
  const flags = [...discount.flags, ...payment.flags];

  let overall: Decision;
  let confidence: number;
  let reason: string;
  let rule: string;

  if (decisions.includes("Reject")) {
    if (settings.respectReject) {
      overall = "Reject";
      confidence = Math.min(...confidences);
      reason = "A specialist rejected. The orchestrator is set to respect Reject.";
      rule = "R1 · any Reject → Reject";
    } else {
      overall = "Escalate";
      confidence = Math.min(...confidences);
      reason = "A specialist rejected, but the orchestrator is set to escalate instead of hard-reject.";
      rule = "R1b · Reject downgraded to Escalate";
    }
  } else if (decisions.includes("Escalate")) {
    overall = "Escalate";
    confidence = Math.min(...confidences);
    reason = "A specialist escalated. Overall decision follows the stricter agent.";
    rule = "R2 · any Escalate → Escalate";
  } else {
    const avg = Math.floor(confidences.reduce((sum, n) => sum + n, 0) / confidences.length);
    if (avg >= settings.confidenceThreshold) {
      overall = "Approve";
      confidence = avg;
      reason = "Both specialists approved, and average confidence clears the threshold.";
      rule = `R3 · all Approve and confidence ≥ ${settings.confidenceThreshold}`;
    } else {
      overall = "Escalate";
      confidence = avg;
      reason = `Both specialists approved, but average confidence ${avg}% is under the ${settings.confidenceThreshold}% threshold.`;
      rule = `R4 · all Approve but confidence < ${settings.confidenceThreshold}`;
    }
  }

  const scoreHow =
    decisions.includes("Reject") || decisions.includes("Escalate")
      ? `min(${discount.confidence}, ${payment.confidence}) = ${Math.min(...confidences)}`
      : `floor((${discount.confidence} + ${payment.confidence}) / 2) = ${Math.floor((discount.confidence + payment.confidence) / 2)}`;
  const beforeGuard = confidence;

  const noteAttack = detectNoteAttack(quote.notes);
  const citedCount = discount.cited.length + payment.cited.length;
  if (citedCount === 0) {
    overall = "Escalate";
    reason = "Output guardrail. Neither book cited a policy rule, so a person writes the stage.";
    rule = "G-OUT · no citation, hold";
  } else if (noteAttack && overall === "Approve") {
    overall = "Escalate";
    confidence = Math.min(confidence, settings.confidenceThreshold - 1);
    reason = "Output guardrail. The notes tried to steer an approval, so the quote is held even if the books were clean.";
    rule = "G-OUT · a note cannot produce Approve";
  }

  const confidenceFormula =
    beforeGuard === confidence
      ? `Orchestrator confidence = ${scoreHow}.`
      : `Orchestrator confidence = ${scoreHow}. The note cap is min(${beforeGuard}, ${settings.confidenceThreshold - 1}) = ${confidence}.`;

  const resultingStage = stageFor(overall);
  const assignment = assignCase(
    quote,
    discount,
    payment,
    overall,
    settings.assignmentRules?.length ? settings.assignmentRules : defaultAssignmentRules,
    totals.net,
  );
  const writeback = writebackFor(overall, assignment);
  const actions =
    overall === "Approve"
      ? [
          "Seller can send the order form to the customer.",
          "Notify the seller that the approval agents approved the quote.",
        ]
      : [
          assignment
            ? `Assigned to: ${assignment.assignee} | SLA: ${assignment.slaHours}h | Reason: ${assignment.reason}`
            : "Route the quote to a person.",
          assignment ? `Queue: ${assignment.queue}.` : "",
          flags.length ? `Flags: ${flags.slice(0, 3).join(", ")}.` : "",
        ].filter(Boolean);

  const audit = [
    `Orchestrator received ${quote.id} (${quote.type}) for ${quote.account.name}.`,
    "Discount agent and payment agent each called a policy tool. Quote notes were not an input.",
    `${discount.agentName} → ${discount.decision} (${discount.confidence}%).`,
    `${payment.agentName} → ${payment.decision} (${payment.confidence}%).`,
    `Orchestrator applied ${rule}.`,
    `Cited ${discountPolicy.policyId} and ${paymentPolicy.policyId}.`,
    `Final ${overall} at ${confidence}%. ${writeback}`,
  ];
  if (noteAttack) {
    audit.push(`Notes tried to steer the agents ("${noteAttack}"). The agents did not follow them.`);
  }
  if (assignment) {
    audit.push(
      `Assigned to: ${assignment.assignee} | SLA: ${assignment.slaHours}h | Reason: ${assignment.reason} Resolves to ${assignment.externalId}.`,
    );
  }

  const beats: Beat[] = [
    {
      id: "receive",
      kind: "think",
      title: "Orchestrator planned the hop",
      body: `Read the quote through tools, ask the discount agent, ask the payment agent, then write one label. ${quote.id} · ${quote.type} · ${quote.account.name}.`,
    },
    {
      id: "parallel",
      kind: "tool",
      title: "Agents called the policy tools",
      body: `Discount & Pricing loaded ${discountPolicy.policyId}. Payment Terms & Billing loaded ${paymentPolicy.policyId}. Notes stayed out of both calls.${noteAttack ? " A note tried to give an instruction and was flagged, not obeyed." : ""}`,
    },
    {
      id: "aggregate",
      kind: "think",
      title: "Orchestrator combined the specialists",
      body: `${rule}. ${reason}`,
    },
    {
      id: "write",
      kind: "write",
      title: "Stage write-back",
      body: writeback,
    },
  ];

  const engineMs = Math.max(1, Math.round(performance.now() - started));

  return {
    quoteId: quote.id,
    overallDecision: overall,
    overallConfidence: confidence,
    specialists: [discount, payment],
    consolidated: [reason, `${discount.agentName}: ${discount.comments}`, `${payment.agentName}: ${payment.comments}`],
    finalComments: `${overall} at ${confidence}% confidence. ${reason}`,
    audit,
    actions,
    beats,
    engineMs,
    threshold: settings.confidenceThreshold,
    rule,
    confidenceFormula,
    resultingStage,
    writeback,
    assignment,
    noteAttack,
    hop: "tools",
    model: null,
    inputTokens: 0,
    outputTokens: 0,
  };
}

export function evaluateGolden(
  quotes: Quote[],
  discountPolicy: DiscountPolicy,
  paymentPolicy: PaymentPolicy,
  settings: Settings,
): { id: string; name: string; scenario: string; expected: Decision; actual: Decision; pass: boolean; attack: boolean }[] {
  return quotes
    .filter((quote) => quote.goldenExpected)
    .map((quote) => {
      const result = reviewQuote(quote, discountPolicy, paymentPolicy, settings);
      const expected = quote.goldenExpected as Decision;
      return {
        id: quote.id,
        name: quote.account.name,
        scenario: quote.scenario,
        expected,
        actual: result.overallDecision,
        pass: result.overallDecision === expected,
        attack: Boolean(result.noteAttack),
      };
    });
}
