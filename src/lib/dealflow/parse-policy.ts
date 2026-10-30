import { cloneDiscount, clonePayment } from "@/lib/dealflow/policies";
import type {
  BillingFrequency,
  DiscountPolicy,
  PaymentPolicy,
  PaymentTerms,
  PolicyPatch,
  RiskBucket,
  Segment,
  TypeKey,
} from "@/lib/dealflow/types";

const SEGMENTS: Segment[] = ["Enterprise", "Mid-Market", "SMB"];
const TERMS: PaymentTerms[] = ["Due on Receipt", "Net-30", "Net-45", "Net-60", "Net-90"];
const BILLING: BillingFrequency[] = ["Monthly", "Quarterly", "Annual", "Multi-Year Prepay"];

function dealType(sentence: string): TypeKey | null {
  const lower = sentence.toLowerCase();
  if (lower.includes("new business")) return "new_business";
  if (lower.includes("renewal")) return "renewal";
  if (lower.includes("expansion")) return "expansion";
  if (lower.includes("add-on") || lower.includes("addon") || lower.includes("add on")) return "addon";
  return null;
}

function segmentOf(sentence: string): Segment | null {
  return SEGMENTS.find((segment) => sentence.includes(segment)) ?? null;
}

function num(pattern: RegExp, sentence: string): number | undefined {
  const match = pattern.exec(sentence);
  if (!match?.[1]) return undefined;
  const value = Number(match[1]);
  if (!Number.isFinite(value) || value < 0 || value > 80) return undefined;
  return value;
}

function bucket(window: string): RiskBucket | null {
  if (/high[- ]risk|not allowed|unacceptable|reject/i.test(window)) return "high_risk";
  if (/elevated|needs finance|finance review/i.test(window)) return "elevated";
  if (/acceptable/i.test(window)) return "acceptable";
  if (/preferred/i.test(window)) return "preferred";
  return null;
}

export function parsePolicyText(text: string): PolicyPatch {
  const bands: PolicyPatch["bands"] = [];
  const sentences = text.split(/\n+|(?<=\.)\s+/);
  for (const sentence of sentences) {
    const segment = segmentOf(sentence);
    const type = dealType(sentence);
    if (!segment || !type) continue;
    const maxStandard = num(/standard(?: discount)?(?: is| of|:)?\s*(\d{1,2})\s*%/i, sentence);
    const maxException = num(/exception(?: ceiling|s)?(?: is| of|:| stop at)?\s*(\d{1,2})\s*%/i, sentence);
    const maxIncreaseVsPrevious = num(/(?:jump|increase)[^.\n]{0,60}?(\d{1,2})\s*(?:point|pt|%)/i, sentence);
    if (maxStandard == null && maxException == null && maxIncreaseVsPrevious == null) continue;
    const existing = bands.find((band) => band.segment === segment && band.dealType === type);
    const next = existing ?? { segment, dealType: type };
    if (maxStandard != null) next.maxStandard = maxStandard;
    if (maxException != null) next.maxException = maxException;
    if (maxIncreaseVsPrevious != null) next.maxIncreaseVsPrevious = maxIncreaseVsPrevious;
    if (!existing) bands.push(next);
  }

  const terms: PolicyPatch["terms"] = {};
  for (const term of TERMS) {
    const at = text.indexOf(term);
    if (at === -1) continue;
    const found = bucket(text.slice(at, at + 90));
    if (found) terms[term] = found;
  }

  const billing: PolicyPatch["billing"] = {};
  for (const name of BILLING) {
    const at = text.toLowerCase().indexOf(name.toLowerCase());
    if (at === -1) continue;
    const found = bucket(text.slice(at, at + 90));
    if (found) billing[name] = found;
  }

  const thresholdMatch = /(\d{1,2})\s*%\s*confident/i.exec(text);
  const suggested = thresholdMatch ? Number(thresholdMatch[1]) : null;

  return {
    bands,
    terms,
    billing,
    suggestedThreshold: suggested != null && suggested >= 50 && suggested <= 95 ? suggested : null,
  };
}

export function applyPolicyPatch(
  baseDiscount: DiscountPolicy,
  basePayment: PaymentPolicy,
  patch: PolicyPatch,
): {
  discount: DiscountPolicy;
  payment: PaymentPolicy;
  suggestedThreshold: number | null;
  changes: string[];
} {
  const discount = cloneDiscount(baseDiscount);
  const payment = clonePayment(basePayment);
  const changes: string[] = [];

  for (const band of patch.bands) {
    const target = discount.segments[band.segment]?.[band.dealType];
    if (!target) continue;
    if (band.maxStandard != null && band.maxStandard !== target.maxStandard) {
      changes.push(`${band.segment} ${band.dealType} standard ${target.maxStandard}% → ${band.maxStandard}%`);
      target.maxStandard = band.maxStandard;
    }
    if (band.maxException != null && band.maxException !== target.maxException) {
      changes.push(`${band.segment} ${band.dealType} exception ${target.maxException}% → ${band.maxException}%`);
      target.maxException = band.maxException;
    }
    if (
      band.maxIncreaseVsPrevious != null &&
      band.maxIncreaseVsPrevious !== target.maxIncreaseVsPrevious
    ) {
      changes.push(
        `${band.segment} ${band.dealType} jump ${target.maxIncreaseVsPrevious ?? "—"} → ${band.maxIncreaseVsPrevious}`,
      );
      target.maxIncreaseVsPrevious = band.maxIncreaseVsPrevious;
    }
    if (target.maxException < target.maxStandard) target.maxException = target.maxStandard;
  }

  for (const [term, risk] of Object.entries(patch.terms) as [PaymentTerms, RiskBucket][]) {
    if (!risk || payment.terms[term] === risk) continue;
    changes.push(`${term} ${payment.terms[term]} → ${risk}`);
    payment.terms[term] = risk;
  }
  for (const [name, risk] of Object.entries(patch.billing) as [BillingFrequency, RiskBucket][]) {
    if (!risk || payment.billing[name] === risk) continue;
    changes.push(`${name} ${payment.billing[name]} → ${risk}`);
    payment.billing[name] = risk;
  }

  return { discount, payment, suggestedThreshold: patch.suggestedThreshold, changes };
}

export function patchFromModel(value: unknown): PolicyPatch | null {
  if (!value || typeof value !== "object") return null;
  const record = value as {
    bands?: unknown;
    terms?: unknown;
    billing?: unknown;
    suggestedThreshold?: unknown;
  };
  const parsed = parsePolicyText("");
  if (Array.isArray(record.bands)) {
    for (const row of record.bands) {
      if (!row || typeof row !== "object") continue;
      const item = row as Record<string, unknown>;
      const segment = SEGMENTS.find((name) => name === item.segment);
      const dealType = ["new_business", "renewal", "expansion", "addon"].find((name) => name === item.dealType) as
        | TypeKey
        | undefined;
      if (!segment || !dealType) continue;
      const band: PolicyPatch["bands"][number] = { segment, dealType };
      for (const key of ["maxStandard", "maxException", "maxIncreaseVsPrevious"] as const) {
        const num = item[key];
        if (typeof num === "number" && num >= 0 && num <= 80) band[key] = num;
      }
      parsed.bands.push(band);
    }
  }
  if (record.terms && typeof record.terms === "object") {
    for (const term of TERMS) {
      const risk = (record.terms as Record<string, unknown>)[term];
      if (risk === "preferred" || risk === "acceptable" || risk === "elevated" || risk === "high_risk") {
        parsed.terms[term] = risk;
      }
    }
  }
  if (record.billing && typeof record.billing === "object") {
    for (const name of BILLING) {
      const risk = (record.billing as Record<string, unknown>)[name];
      if (risk === "preferred" || risk === "acceptable" || risk === "elevated" || risk === "high_risk") {
        parsed.billing[name] = risk;
      }
    }
  }
  if (typeof record.suggestedThreshold === "number") {
    const n = Math.round(record.suggestedThreshold);
    if (n >= 50 && n <= 95) parsed.suggestedThreshold = n;
  }
  const found =
    parsed.bands.length > 0 ||
    Object.keys(parsed.terms).length > 0 ||
    Object.keys(parsed.billing).length > 0 ||
    parsed.suggestedThreshold != null;
  return found ? parsed : null;
}
