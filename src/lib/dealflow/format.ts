import type { Quote, Stage, TypeKey } from "@/lib/dealflow/types";

const moneyFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const moneyExact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function money(n: number): string {
  return moneyFmt.format(Math.round(n));
}

export function moneyExactFmt(n: number): string {
  return moneyExact.format(n);
}

export function pct(n: number): string {
  return `${n.toFixed(1)}%`;
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function lineNet(listPrice: number, discountPct: number): number {
  return round2(listPrice * (1 - discountPct / 100));
}

export function quoteTotals(quote: Pick<Quote, "lineItems">): {
  list: number;
  net: number;
  discount: number;
} {
  const list = quote.lineItems.reduce((sum, item) => sum + item.listPrice * item.quantity, 0);
  const net = quote.lineItems.reduce(
    (sum, item) => sum + lineNet(item.listPrice, item.discountPct) * item.quantity,
    0,
  );
  const discount = list === 0 ? 0 : round1((1 - net / list) * 100);
  return { list, net, discount };
}

export function typeKey(type: Quote["type"]): TypeKey {
  if (type === "New") return "new_business";
  if (type === "Renewal") return "renewal";
  if (type === "Expansion") return "expansion";
  return "addon";
}

export function typeLabel(key: TypeKey): string {
  if (key === "new_business") return "New business";
  if (key === "renewal") return "Renewal";
  if (key === "expansion") return "Expansion";
  return "Add-on";
}

const STAGE_LABEL: Record<Stage, string> = {
  draft: "Draft",
  submitted: "Submit for approval",
  approved: "Approved",
  sent: "Sent to customer",
  signed: "Signed by customer",
  converted: "Converted",
  rejected: "Rejected",
};

export function stageLabel(stage: Stage): string {
  return STAGE_LABEL[stage];
}

export function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDay(iso: string): string {
  const date = new Date(iso.includes("T") ? iso : `${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function toPayload(quote: Quote) {
  const totals = quoteTotals(quote);
  return {
    quote_id: quote.id,
    quote_type: quote.type,
    account: {
      name: quote.account.name,
      segment: quote.account.segment,
      region: quote.account.region,
      existing_acv: quote.account.existingAcv,
    },
    seller: { id: quote.seller.id, name: quote.seller.name },
    submission_date: quote.quoteDate,
    contract_length_months: quote.contractMonths,
    payment_terms: quote.paymentTerms,
    billing_frequency: quote.billingFrequency,
    line_items: quote.lineItems.map((item) => ({
      product: item.product,
      quantity: item.quantity,
      list_price: item.listPrice,
      proposed_discount_pct: item.discountPct,
      net_price: lineNet(item.listPrice, item.discountPct),
    })),
    historical: quote.historical
      ? {
          previous_discount_pct: quote.historical.previousDiscountPct,
          previous_payment_terms: quote.historical.previousPaymentTerms,
          previous_billing_frequency: quote.historical.previousBillingFrequency,
        }
      : null,
    totals: {
      list: Math.round(totals.list),
      net: Math.round(totals.net),
      discount_pct: totals.discount,
    },
    notes: quote.notes,
  };
}
