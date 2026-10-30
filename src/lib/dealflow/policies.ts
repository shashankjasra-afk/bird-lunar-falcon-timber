import type {
  AssignmentRule,
  BillingFrequency,
  CatalogItem,
  CustomerPack,
  DiscountPolicy,
  PaymentPolicy,
  PaymentTerms,
  PolicyVersion,
  Segment,
  Settings,
  TypeKey,
} from "@/lib/dealflow/types";

const band = (
  maxStandard: number,
  maxException: number,
  maxIncreaseVsPrevious?: number,
  volumeTiers?: { minAcv: number; maxAcv: number; maxDiscount: number }[],
) => ({
  maxStandard,
  maxException,
  ...(maxIncreaseVsPrevious !== undefined ? { maxIncreaseVsPrevious } : {}),
  ...(volumeTiers ? { volumeTiers } : {}),
});

export const TYPE_KEYS: TypeKey[] = ["new_business", "renewal", "expansion", "addon"];
export const SEGMENTS: Segment[] = ["Enterprise", "Mid-Market", "SMB"];

export const defaultDiscountPolicy: DiscountPolicy = {
  policyId: "DISC-POL-2026-01",
  policyName: "Discount & Pricing Policy",
  version: "2026.Q3",
  owner: "Revenue Operations",
  lastUpdated: "2026-07-15",
  segments: {
    Enterprise: {
      new_business: band(25, 32, undefined, [
        { minAcv: 0, maxAcv: 100000, maxDiscount: 18 },
        { minAcv: 100000, maxAcv: 300000, maxDiscount: 22 },
        { minAcv: 300000, maxAcv: 999999999, maxDiscount: 25 },
      ]),
      renewal: band(22, 28, 5),
      expansion: band(28, 35, 8),
      addon: band(30, 35),
    },
    "Mid-Market": {
      new_business: band(20, 28, undefined, [
        { minAcv: 0, maxAcv: 50000, maxDiscount: 15 },
        { minAcv: 50000, maxAcv: 150000, maxDiscount: 18 },
        { minAcv: 150000, maxAcv: 999999999, maxDiscount: 20 },
      ]),
      renewal: band(18, 25, 4),
      expansion: band(25, 30, 6),
      addon: band(25, 30),
    },
    SMB: {
      new_business: band(15, 22),
      renewal: band(12, 18, 3),
      expansion: band(18, 22, 5),
      addon: band(20, 25),
    },
  },
  specialRules: [
    {
      id: "SR-01",
      name: "Quarter-end elevated scrutiny",
      description:
        "A discount within 2 points of the standard ceiling, dated in the last 5 days of a fiscal quarter, is flagged.",
    },
    {
      id: "SR-02",
      name: "Large jump vs historical",
      description:
        "A discount increase above the segment’s allowed jump versus the previous contract requires Deal Desk review.",
    },
    {
      id: "SR-03",
      name: "Small deal, high discount",
      description: "Deals under $50k net asking more than 25% off are escalated.",
    },
    {
      id: "CR-02",
      name: "Multi-year prepay allowance",
      description:
        "Multi-year prepay adds the configured credit (default 5 pts) to the standard ceiling, the exception ceiling, and the allowed historical jump.",
    },
  ],
};

export const PAYMENT_TERMS: PaymentTerms[] = [
  "Due on Receipt",
  "Net-30",
  "Net-45",
  "Net-60",
  "Net-90",
];

export const BILLING: BillingFrequency[] = [
  "Multi-Year Prepay",
  "Annual",
  "Quarterly",
  "Monthly",
];

export const defaultPaymentPolicy: PaymentPolicy = {
  policyId: "PAY-POL-2026-01",
  policyName: "Payment Terms & Billing Policy",
  version: "2026.Q3",
  owner: "Revenue Operations & Finance",
  lastUpdated: "2026-07-15",
  terms: {
    "Due on Receipt": "preferred",
    "Net-30": "preferred",
    "Net-45": "acceptable",
    "Net-60": "elevated",
    "Net-90": "high_risk",
  },
  billing: {
    Annual: "preferred",
    "Multi-Year Prepay": "preferred",
    Quarterly: "acceptable",
    Monthly: "high_risk",
  },
  changeRules: [
    {
      id: "CR-01",
      name: "Worsening terms on renewal",
      description: "Moving a renewal onto longer payment terms is a mandatory escalation.",
    },
    {
      id: "CR-03",
      name: "High value and high-risk terms",
      description: "Net value above $200k on high-risk payment terms needs VP Finance review.",
    },
  ],
};

export const defaultAssignmentRules: AssignmentRule[] = [
  {
    id: "mild",
    label: "Mild discount or term exception",
    assignee: "Deal Desk Manager",
    assigneeCash: "",
    queue: "Deal Desk — standard exceptions",
    slaHours: 24,
    externalId: "SFDC:Deal_Desk_Manager",
    externalIdCash: "",
    integration: "Salesforce queue or DealHub group",
  },
  {
    id: "material",
    label: "Material discount or payment-term change",
    assignee: "RevOps Manager",
    assigneeCash: "Finance",
    queue: "RevOps / Finance exceptions",
    slaHours: 24,
    externalId: "SFDC:RevOps_Manager",
    externalIdCash: "SFDC:Finance",
    integration: "Discount exceptions resolve to RevOps. Cash-term changes resolve to Finance.",
  },
  {
    id: "severe",
    label: "High discount plus poor terms, or a large deal",
    assignee: "VP Sales + Finance",
    assigneeCash: "",
    queue: "Executive commercial exception",
    slaHours: 24,
    externalId: "CPQ:VP_Sales_Finance",
    externalIdCash: "",
    integration: "CPQ approval step for VP Sales and Finance together",
  },
  {
    id: "gaming",
    label: "Gaming or quarter-end signal",
    assignee: "Deal Desk Lead",
    assigneeCash: "",
    queue: "Period-close review",
    slaHours: 12,
    externalId: "SFDC:Deal_Desk_Lead",
    externalIdCash: "",
    integration: "Salesforce queue for period-close review",
  },
  {
    id: "violation",
    label: "Clear policy violation",
    assignee: "VP Sales",
    assigneeCash: "VP Finance",
    queue: "Executive exception",
    slaHours: 24,
    externalId: "CPQ:VP_Sales",
    externalIdCash: "CPQ:VP_Finance",
    integration: "Discount breaches resolve to VP Sales. Cash breaches resolve to VP Finance.",
  },
];

export const defaultSettings: Settings = {
  companyName: "Helio",
  confidenceThreshold: 75,
  prepayCreditPts: 5,
  respectReject: true,
  fiscalYearEnd: "31 January",
  assignmentRules: defaultAssignmentRules.map((rule) => ({ ...rule })),
};

export const CATALOG: CatalogItem[] = [
  { sku: "HL-REV-ENT", name: "Helio Revenue — Enterprise", listPrice: 1650, family: "Revenue" },
  { sku: "HL-REV-PRO", name: "Helio Revenue — Professional", listPrice: 100, family: "Revenue" },
  { sku: "HL-REV-UNL", name: "Helio Revenue — Unlimited", listPrice: 300, family: "Revenue" },
  { sku: "HL-ASSIST", name: "Helio Assist", listPrice: 50, family: "Revenue" },
  { sku: "HL-SVC-UNL", name: "Helio Service — Unlimited", listPrice: 300, family: "Service" },
  { sku: "HL-FIELD", name: "Helio Field", listPrice: 150, family: "Service" },
  { sku: "HL-PLAT", name: "Helio Platform", listPrice: 25, family: "Platform" },
  { sku: "HL-ANLY", name: "Helio Analytics", listPrice: 70, family: "Analytics" },
  { sku: "HL-ENG", name: "Helio Engage", listPrice: 1250, family: "Marketing" },
];

export function cloneDiscount(policy: DiscountPolicy): DiscountPolicy {
  return structuredClone(policy);
}

export function clonePayment(policy: PaymentPolicy): PaymentPolicy {
  return structuredClone(policy);
}

export const SAMPLE_POLICY_TEXT = `Helio commercial policy
Source: Confluence — Finance and RevOps working draft
Owner: Finance

Discount book
Enterprise new business: standard discount is 25%, exception is 32%.
Enterprise renewal: standard discount is 20%, exception is 26%, max increase vs prior contract is 4 points.
Enterprise expansion: standard discount is 28%, exception is 35%, max increase vs prior contract is 8 points.
Enterprise add-on: standard discount is 30%, exception is 35%.
Mid-Market new business: standard discount is 18%, exception is 25%.
Mid-Market renewal: standard discount is 16%, exception is 22%, max increase vs prior contract is 4 points.
Mid-Market expansion: standard discount is 22%, exception is 28%, max increase vs prior contract is 6 points.
Mid-Market add-on: standard discount is 22%, exception is 28%.
SMB new business: standard discount is 15%, exception is 22%.
SMB renewal: standard discount is 12%, exception is 18%, max increase vs prior contract is 3 points.
SMB expansion: standard discount is 18%, exception is 22%, max increase vs prior contract is 5 points.
SMB add-on: standard discount is 20%, exception is 25%.

Payment terms
Due on Receipt is preferred.
Net-30 is preferred.
Net-45 is acceptable.
Net-60 needs Finance review.
Net-90 is high-risk and not allowed.

Billing
Annual billing is preferred.
Multi-Year Prepay is preferred.
Quarterly billing is acceptable.
Monthly billing is high-risk.

Auto-approve only when both agents are at least 80% confident.
`;

export function seedPolicyVersion(): PolicyVersion {
  return {
    id: "ver-2026-q3",
    version: "2026.Q3",
    status: "live",
    owner: "Revenue Operations",
    sourceName: "Loaded CPQ extract",
    sourceKind: "seed",
    extractor: "seed",
    note: "Initial book for this customer. Same shape a Salesforce CPQ, Revenue Cloud, DealHub, Conga, or Zuora connector would sync.",
    confirmedBy: "Revenue Operations",
    confirmedAt: "2026-07-15T00:00:00.000Z",
    createdAt: "2026-07-15T00:00:00.000Z",
    discount: cloneDiscount(defaultDiscountPolicy),
    payment: clonePayment(defaultPaymentPolicy),
  };
}

function tightenDiscount(): DiscountPolicy {
  const policy = cloneDiscount(defaultDiscountPolicy);
  policy.policyId = "NS-DISC-2026-Q2";
  policy.policyName = "Northstar discount book";
  policy.version = "2026.Q2";
  policy.owner = "Finance";
  policy.lastUpdated = "2026-04-02";
  for (const segment of SEGMENTS) {
    for (const key of TYPE_KEYS) {
      const band = policy.segments[segment][key];
      band.maxStandard = Math.max(8, band.maxStandard - 7);
      band.maxException = Math.max(band.maxStandard, band.maxException - 8);
      if (band.maxIncreaseVsPrevious != null) {
        band.maxIncreaseVsPrevious = Math.max(2, band.maxIncreaseVsPrevious - 1);
      }
    }
  }
  return policy;
}

function northstarPayment(): PaymentPolicy {
  const policy = clonePayment(defaultPaymentPolicy);
  policy.policyId = "NS-PAY-2026-Q2";
  policy.policyName = "Northstar payment & billing book";
  policy.version = "2026.Q2";
  policy.owner = "Finance";
  policy.lastUpdated = "2026-04-02";
  policy.terms["Net-45"] = "elevated";
  policy.terms["Net-60"] = "high_risk";
  policy.billing.Quarterly = "elevated";
  return policy;
}

function northstarSettings(): Settings {
  return {
    companyName: "Northstar",
    confidenceThreshold: 85,
    prepayCreditPts: 3,
    respectReject: true,
    fiscalYearEnd: "31 December",
    assignmentRules: defaultAssignmentRules.map((rule) => ({
      ...rule,
      externalId: rule.externalId.replace("SFDC:", "SFDC:NS_").replace("CPQ:", "CPQ:NS_"),
      externalIdCash: rule.externalIdCash ? rule.externalIdCash.replace("SFDC:", "SFDC:NS_").replace("CPQ:", "CPQ:NS_") : "",
    })),
  };
}

export function buildCustomerPacks(): CustomerPack[] {
  const helioDiscount = cloneDiscount(defaultDiscountPolicy);
  const helioPayment = clonePayment(defaultPaymentPolicy);
  const northstarDiscount = tightenDiscount();
  const northstarCash = northstarPayment();
  return [
    {
      id: "helio",
      discountPolicy: helioDiscount,
      paymentPolicy: helioPayment,
      settings: {
        ...defaultSettings,
        assignmentRules: defaultSettings.assignmentRules.map((rule) => ({ ...rule })),
      },
      versions: [seedPolicyVersion()],
    },
    {
      id: "northstar",
      discountPolicy: northstarDiscount,
      paymentPolicy: northstarCash,
      settings: northstarSettings(),
      versions: [
        {
          id: "ver-ns-2026-q2",
          version: "2026.Q2",
          status: "live",
          owner: "Finance",
          sourceName: "Northstar order policy",
          sourceKind: "seed",
          extractor: "seed",
          note: "Stricter security-vendor book. Lower ceilings, shorter cash, higher auto-approve bar.",
          confirmedBy: "Finance",
          confirmedAt: "2026-04-02T00:00:00.000Z",
          createdAt: "2026-04-02T00:00:00.000Z",
          discount: cloneDiscount(northstarDiscount),
          payment: clonePayment(northstarCash),
        },
      ],
    },
  ];
}
