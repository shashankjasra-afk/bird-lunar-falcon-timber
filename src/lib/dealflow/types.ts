export type Segment = "Enterprise" | "Mid-Market" | "SMB";
export type QuoteType = "New" | "Renewal" | "Add-on" | "Expansion";
export type TypeKey = "new_business" | "renewal" | "expansion" | "addon";
export type PaymentTerms = "Due on Receipt" | "Net-30" | "Net-45" | "Net-60" | "Net-90";
export type BillingFrequency = "Monthly" | "Quarterly" | "Annual" | "Multi-Year Prepay";
export type Decision = "Approve" | "Escalate" | "Reject";
export type Stage = "draft" | "submitted" | "approved" | "sent" | "signed" | "converted" | "rejected";
export type RiskBucket = "preferred" | "acceptable" | "elevated" | "high_risk";
export type Role = "seller" | "desk" | "admin";

export interface LineItem {
  id: string;
  product: string;
  quantity: number;
  listPrice: number;
  discountPct: number;
}

export interface Quote {
  id: string;
  type: QuoteType;
  scenario: string;
  account: {
    name: string;
    segment: Segment;
    region: string;
    existingAcv: number | null;
  };
  seller: { id: string; name: string };
  quoteDate: string;
  contractMonths: number;
  paymentTerms: PaymentTerms;
  billingFrequency: BillingFrequency;
  lineItems: LineItem[];
  historical: {
    previousDiscountPct: number | null;
    previousPaymentTerms: PaymentTerms | null;
    previousBillingFrequency: BillingFrequency | null;
  } | null;
  notes: string;
  stage: Stage;
  submittedAt: string | null;
  decision: FinalDecision | null;
  runs: FinalDecision[];
  humanActions: HumanAction[];
  stageHistory: StageEvent[];
  goldenExpected: Decision | null;
}

export interface StageEvent {
  stage: Stage;
  at: string;
  by: string;
  note: string;
}

export interface HumanAction {
  at: string;
  actor: string;
  action: "approve" | "reject" | "return";
  comment: string;
}

export interface AgentDecision {
  agentName: string;
  decision: Decision;
  confidence: number;
  reasoning: string[];
  comments: string;
  flags: string[];
  cited: string[];
  formula?: string;
}

export interface Beat {
  id: string;
  kind: "receive" | "parallel" | "aggregate" | "write" | "think" | "tool" | "guard";
  title: string;
  body: string;
}

export interface FinalDecision {
  quoteId: string;
  overallDecision: Decision;
  overallConfidence: number;
  specialists: AgentDecision[];
  consolidated: string[];
  finalComments: string;
  audit: string[];
  actions: string[];
  beats: Beat[];
  engineMs: number;
  threshold: number;
  rule: string;
  confidenceFormula?: string;
  resultingStage: "approved" | "submitted" | "rejected";
  writeback: string;
  assignment: Assignment | null;
  noteAttack: string | null;
  hop: "agents" | "tools";
  model: string | null;
  inputTokens: number;
  outputTokens: number;
}

export interface DiscountBand {
  maxStandard: number;
  maxException: number;
  maxIncreaseVsPrevious?: number;
  volumeTiers?: { minAcv: number; maxAcv: number; maxDiscount: number }[];
}

export interface DiscountPolicy {
  policyId: string;
  policyName: string;
  version: string;
  owner: string;
  lastUpdated: string;
  segments: Record<Segment, Record<TypeKey, DiscountBand>>;
  specialRules: { id: string; name: string; description: string }[];
}

export interface PaymentPolicy {
  policyId: string;
  policyName: string;
  version: string;
  owner: string;
  lastUpdated: string;
  terms: Record<PaymentTerms, RiskBucket>;
  billing: Record<BillingFrequency, RiskBucket>;
  changeRules: { id: string; name: string; description: string }[];
}

export interface Settings {
  companyName: string;
  confidenceThreshold: number;
  prepayCreditPts: number;
  respectReject: boolean;
  fiscalYearEnd: string;
  assignmentRules: AssignmentRule[];
}

export type AssignmentRuleId = "mild" | "material" | "severe" | "gaming" | "violation";

export interface AssignmentRule {
  id: AssignmentRuleId;
  label: string;
  assignee: string;
  assigneeCash: string;
  queue: string;
  slaHours: number;
  externalId: string;
  externalIdCash: string;
  integration: string;
}

export interface Assignment {
  ruleId: AssignmentRuleId;
  assignee: string;
  queue: string;
  slaHours: number;
  reason: string;
  externalId: string;
  integration: string;
}

export type PolicyVersionStatus = "live" | "archived";

export interface PolicyVersion {
  id: string;
  version: string;
  status: PolicyVersionStatus;
  owner: string;
  sourceName: string;
  sourceKind: "seed" | "upload" | "paste" | "edit";
  extractor: "seed" | "grok" | "local";
  note: string;
  confirmedBy: string | null;
  confirmedAt: string | null;
  createdAt: string;
  discount: DiscountPolicy;
  payment: PaymentPolicy;
}

export interface PolicyPatch {
  bands: {
    segment: Segment;
    dealType: TypeKey;
    maxStandard?: number;
    maxException?: number;
    maxIncreaseVsPrevious?: number;
  }[];
  terms: Partial<Record<PaymentTerms, RiskBucket>>;
  billing: Partial<Record<BillingFrequency, RiskBucket>>;
  suggestedThreshold: number | null;
}

export interface PendingReview {
  sourceName: string;
  extractor: "grok" | "local";
  note: string;
  owner: string;
  discount: DiscountPolicy;
  payment: PaymentPolicy;
  suggestedThreshold: number | null;
  changes: string[];
}

export interface CustomerPack {
  id: string;
  discountPolicy: DiscountPolicy;
  paymentPolicy: PaymentPolicy;
  settings: Settings;
  versions: PolicyVersion[];
}

export interface CatalogItem {
  sku: string;
  name: string;
  listPrice: number;
  family: string;
}

export interface LangfuseEvent {
  id: string;
  at: string;
  quoteId: string;
  kind: "decision" | "judge";
  decision: string;
  delivered: boolean;
  traceId: string;
  host: string;
  note: string;
}

export interface LangfuseTraceInput {
  kind: "decision" | "judge";
  quoteId: string;
  account: string;
  sellerId: string;
  segment: string;
  decision: Decision;
  confidence: number;
  rule: string;
  engineMs: number;
  noteAttack: string | null;
  cited: string[];
  expected: Decision | null;
  assignee: string | null;
  slaHours: number | null;
  specialists: { name: "discount-pricing" | "payment-terms"; decision: Decision; confidence: number; cited: string[] }[];
  judgeSource: "grok" | "rubric" | null;
  judgePass: boolean | null;
  inputTokens: number;
  outputTokens: number;
}
