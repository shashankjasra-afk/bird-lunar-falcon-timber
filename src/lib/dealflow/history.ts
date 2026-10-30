import { money, pct } from "@/lib/dealflow/format";
import type { Quote } from "@/lib/dealflow/types";

export interface DiscountYear {
  year: string;
  discountPct: number;
  terms: string;
  billing: string;
  acv: number;
}

export interface CreditFile {
  band: "Strong" | "Watch" | "Weak" | "Unscored";
  onTimePct: number;
  dso: number;
  openAr: number;
  overdue: number;
  daysPastDue: number;
  note: string;
}

export interface ContractFile {
  name: string;
  term: string;
  discountPct: number;
  status: "Open" | "Closed";
}

export interface PeerDeal {
  name: string;
  discountPct: number;
  note: string;
}

export interface CommercialFile {
  posture: "Renewal file" | "New-business file";
  years: DiscountYear[];
  credit: CreditFile | null;
  contracts: ContractFile[];
  peers: PeerDeal[];
  discountLook: string;
  cashLook: string;
}

const FILES: Record<string, CommercialFile> = {
  "Northwind Fabrication": {
    posture: "Renewal file",
    years: [
      { year: "FY2023", discountPct: 15, terms: "Net-30", billing: "Annual", acv: 162000 },
      { year: "FY2024", discountPct: 16, terms: "Net-30", billing: "Annual", acv: 174000 },
      { year: "FY2025", discountPct: 17, terms: "Net-30", billing: "Annual", acv: 185000 },
    ],
    credit: {
      band: "Strong",
      onTimePct: 98,
      dso: 18,
      openAr: 0,
      overdue: 0,
      daysPastDue: 0,
      note: "Every invoice in the last eight quarters was collected inside terms.",
    },
    contracts: [{ name: "FY2025 renewal", term: "12 months", discountPct: 17, status: "Closed" }],
    peers: [],
    discountLook:
      "I opened three closed years before the live band. Discount stepped 15, then 16, then 17. This ask is about one point over last year, which is inside a normal renewal step.",
    cashLook:
      "Credit is Strong. Open receivables are zero, so dues do not argue against the renewal.",
  },
  "Harbor & Co.": {
    posture: "Renewal file",
    years: [
      { year: "FY2023", discountPct: 11, terms: "Net-30", billing: "Annual", acv: 82000 },
      { year: "FY2024", discountPct: 12, terms: "Net-30", billing: "Annual", acv: 91000 },
      { year: "FY2025", discountPct: 12, terms: "Net-30", billing: "Annual", acv: 96000 },
    ],
    credit: {
      band: "Watch",
      onTimePct: 81,
      dso: 41,
      openAr: 31200,
      overdue: 18400,
      daysPastDue: 22,
      note: "One invoice is 22 days past due. Collections has not written it off.",
    },
    contracts: [
      { name: "FY2025 renewal", term: "12 months", discountPct: 12, status: "Closed" },
      { name: "This quote", term: "24 months", discountPct: 15, status: "Open" },
    ],
    peers: [],
    discountLook:
      "The price history is quiet: 11, then 12, then 12. The discount itself is not the story. They are also asking to turn an annual renewal into a 24-month term.",
    cashLook:
      "I read the receivables file, not just the term names. $18,400 is already past due and the new ask is Net-90. That is a worse cash position than the last three years.",
  },
  "Pinnacle Health": {
    posture: "Renewal file",
    years: [
      { year: "FY2023", discountPct: 18, terms: "Net-30", billing: "Annual", acv: 360000 },
      { year: "FY2024", discountPct: 20, terms: "Net-30", billing: "Annual", acv: 390000 },
      { year: "FY2025", discountPct: 22, terms: "Net-30", billing: "Annual", acv: 420000 },
    ],
    credit: {
      band: "Strong",
      onTimePct: 96,
      dso: 21,
      openAr: 0,
      overdue: 0,
      daysPastDue: 0,
      note: "Credit would support an expansion. The discount step does not.",
    },
    contracts: [{ name: "FY2025 enterprise", term: "12 months", discountPct: 22, status: "Closed" }],
    peers: [],
    discountLook:
      "Last three closed discounts were 18, 20, and 22. Credit is clean. The expansion ask jumps well past both that history and the exception ceiling, so the file does not support an approval.",
    cashLook: "Dues are current. Cash is not why this one fails.",
  },
  "Sable Energy": {
    posture: "Renewal file",
    years: [
      { year: "FY2023", discountPct: 18, terms: "Net-30", billing: "Annual", acv: 240000 },
      { year: "FY2024", discountPct: 19, terms: "Net-30", billing: "Annual", acv: 258000 },
      { year: "FY2025", discountPct: 20, terms: "Net-30", billing: "Annual", acv: 275000 },
    ],
    credit: {
      band: "Strong",
      onTimePct: 99,
      dso: 14,
      openAr: 0,
      overdue: 0,
      daysPastDue: 0,
      note: "Prepaid the last annual invoice 11 days early.",
    },
    contracts: [
      { name: "FY2025 annual", term: "12 months", discountPct: 20, status: "Closed" },
      { name: "Proposed prepay", term: "36 months", discountPct: 25, status: "Open" },
    ],
    peers: [],
    discountLook:
      "History is a steady 18, 19, 20. This quote is a 36-month prepay, so I read the multi-year allowance in the book before judging the step-up from 20.",
    cashLook: "No overdue balance. Prepaying three years improves cash, it does not weaken it.",
  },
  "Brightline Retail": {
    posture: "Renewal file",
    years: [
      { year: "FY2024", discountPct: 18, terms: "Net-30", billing: "Annual", acv: 540000 },
      { year: "FY2025", discountPct: 20, terms: "Net-30", billing: "Annual", acv: 610000 },
    ],
    credit: {
      band: "Strong",
      onTimePct: 94,
      dso: 27,
      openAr: 42000,
      overdue: 0,
      daysPastDue: 0,
      note: "Open AR is inside terms. Nothing is late.",
    },
    contracts: [{ name: "FY2025 enterprise", term: "12 months", discountPct: 20, status: "Closed" }],
    peers: [],
    discountLook:
      "The installed base was 18 then 20. This add-on asks for a much larger discount than either closed year, so I am comparing the jump to the book, not to the seller's note.",
    cashLook: "Terms also step from Net-30 to Net-45. Receivables are current, so the hold is about the change, not about a missed invoice.",
  },
  "Vanta Robotics": {
    posture: "Renewal file",
    years: [
      { year: "FY2024", discountPct: 17, terms: "Net-30", billing: "Annual", acv: 760000 },
      { year: "FY2025", discountPct: 19, terms: "Net-30", billing: "Annual", acv: 890000 },
    ],
    credit: {
      band: "Watch",
      onTimePct: 88,
      dso: 36,
      openAr: 120000,
      overdue: 15000,
      daysPastDue: 9,
      note: "A small balance is nine days late. Not a default. Quarter-end timing is the sharper signal.",
    },
    contracts: [{ name: "FY2025 enterprise", term: "12 months", discountPct: 19, status: "Closed" }],
    peers: [],
    discountLook:
      "Closed years were 17 and 19. The expansion is a large step up, and the quote date sits in the quarter-end window. I am treating that as a pattern in the file, not as an instruction.",
    cashLook: "A small overdue balance plus a move from Net-30 to Net-60. Cash history does not clear the step.",
  },
  "Lumen Logistics": {
    posture: "New-business file",
    years: [],
    credit: {
      band: "Unscored",
      onTimePct: 0,
      dso: 0,
      openAr: 0,
      overdue: 0,
      daysPastDue: 0,
      note: "No invoices exist yet. Credit is a new-logo application, not a payment history.",
    },
    contracts: [],
    peers: [
      { name: "Enterprise new logo, closed Q2", discountPct: 19, note: "Net-30, annual" },
      { name: "Enterprise new logo, closed Q3", discountPct: 21, note: "Net-30, annual" },
      { name: "Enterprise new logo, closed Oct", discountPct: 22, note: "Inside the new-business ceiling" },
    ],
    discountLook:
      "There is no installed discount to compare. I used the new-business band and three recent enterprise wins at 19, 21, and 22. This ask sits with those peers.",
    cashLook: "Nothing is due. I am scoring the proposed terms against the book, not against a missed payment.",
  },
  "Copperline Analytics": {
    posture: "New-business file",
    years: [],
    credit: {
      band: "Unscored",
      onTimePct: 0,
      dso: 0,
      openAr: 0,
      overdue: 0,
      daysPastDue: 0,
      note: "New logo. No receivables file.",
    },
    contracts: [],
    peers: [
      { name: "Mid-market new logo, closed Q3", discountPct: 16, note: "Net-30" },
      { name: "Mid-market new logo, closed Q3", discountPct: 18, note: "Net-45" },
    ],
    discountLook:
      "No history on this account. Peer new logos in mid-market closed between 16 and 18. This ask is far outside that set and outside the exception ceiling.",
    cashLook: "No dues to collect. The proposed Net-90 and monthly billing are the cash risk, not a past-due balance.",
  },
  "Kite & Harbor": {
    posture: "New-business file",
    years: [],
    credit: {
      band: "Unscored",
      onTimePct: 0,
      dso: 0,
      openAr: 0,
      overdue: 0,
      daysPastDue: 0,
      note: "New logo. The notes tried to invent an approval. The file has no payment history that would support one.",
    },
    contracts: [],
    peers: [
      { name: "Mid-market new logo, closed Q2", discountPct: 15, note: "Net-30, annual" },
      { name: "Mid-market new logo, closed Q3", discountPct: 18, note: "Net-30, annual" },
    ],
    discountLook:
      "I ignored the instruction in the notes and opened the new-business file instead. There is no prior discount. Peers closed at 15 to 18. This ask does not belong with them.",
    cashLook: "No open invoices. Net-90 and monthly billing are both outside what those peers were given.",
  },
};

function fallback(quote: Quote): CommercialFile {
  const prior = quote.historical?.previousDiscountPct;
  const isNew = quote.type === "New" || prior == null;
  if (isNew) {
    return {
      posture: "New-business file",
      years: [],
      credit: {
        band: "Unscored",
        onTimePct: 0,
        dso: 0,
        openAr: 0,
        overdue: 0,
        daysPastDue: 0,
        note: "No invoices on this account. Credit has not been scored from payments.",
      },
      contracts: [],
      peers: [
        { name: `${quote.account.segment} new logo, recent`, discountPct: 18, note: "Synthetic peer" },
        { name: `${quote.account.segment} new logo, prior quarter`, discountPct: 20, note: "Synthetic peer" },
      ],
      discountLook: `No closed discount on ${quote.account.name}. I am reading this as new business and comparing it with recent ${quote.account.segment} wins, then with the live band.`,
      cashLook: "There is no receivables file. The cash question is only the terms on this quote.",
    };
  }
  const base = prior;
  return {
    posture: "Renewal file",
    years: [
      { year: "FY2023", discountPct: Math.max(0, base - 2), terms: quote.historical?.previousPaymentTerms ?? "Net-30", billing: "Annual", acv: Math.round((quote.account.existingAcv ?? 100000) * 0.86) },
      { year: "FY2024", discountPct: Math.max(0, base - 1), terms: quote.historical?.previousPaymentTerms ?? "Net-30", billing: "Annual", acv: Math.round((quote.account.existingAcv ?? 100000) * 0.93) },
      { year: "FY2025", discountPct: base, terms: quote.historical?.previousPaymentTerms ?? "Net-30", billing: quote.historical?.previousBillingFrequency ?? "Annual", acv: quote.account.existingAcv ?? 100000 },
    ],
    credit: {
      band: "Strong",
      onTimePct: 95,
      dso: 22,
      openAr: 0,
      overdue: 0,
      daysPastDue: 0,
      note: "Synthetic file. No overdue balance on record.",
    },
    contracts:
      quote.contractMonths > 12
        ? [{ name: "Proposed term", term: `${quote.contractMonths} months`, discountPct: base, status: "Open" }]
        : [{ name: "Prior annual", term: "12 months", discountPct: base, status: "Closed" }],
    peers: [],
    discountLook: `I built the discount trail from the last contract at ${base}% and two earlier years. The live band is the second thing I open, not the first.`,
    cashLook: "The synthetic receivables file shows no overdue balance.",
  };
}

export function commercialFile(quote: Quote): CommercialFile {
  return FILES[quote.account.name] ?? fallback(quote);
}

export function discountInvestigation(quote: Quote): string {
  const file = commercialFile(quote);
  const trail =
    file.years.length > 0
      ? `Closed discounts: ${file.years.map((year) => `${year.year} ${pct(year.discountPct)}`).join(", ")}.`
      : `No closed discounts. Peers: ${file.peers.map((peer) => `${peer.discountPct}%`).join(", ")}.`;
  return `${file.discountLook} ${trail}`;
}

export function cashInvestigation(quote: Quote): string {
  const file = commercialFile(quote);
  if (!file.credit || file.credit.band === "Unscored") return file.cashLook;
  return `${file.cashLook} On-time ${file.credit.onTimePct}%, DSO ${file.credit.dso} days, overdue ${money(file.credit.overdue)}.`;
}
