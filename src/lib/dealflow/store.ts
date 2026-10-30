import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { reviewQuote } from "@/lib/dealflow/engine";
import {
  buildCustomerPacks,
  cloneDiscount,
  clonePayment,
} from "@/lib/dealflow/policies";
import { blankQuote, buildInitialQuotes } from "@/lib/dealflow/seed";
import type {
  AssignmentRule,
  BillingFrequency,
  CustomerPack,
  DiscountPolicy,
  FinalDecision,
  LineItem,
  PaymentPolicy,
  PaymentTerms,
  PendingReview,
  PolicyVersion,
  Quote,
  RiskBucket,
  Role,
  Segment,
  Settings,
  Stage,
  TypeKey,
  LangfuseEvent,
} from "@/lib/dealflow/types";

const DESK_ACTOR = "Alex Okonkwo";

interface DealflowState {
  quotes: Quote[];
  discountPolicy: DiscountPolicy;
  paymentPolicy: PaymentPolicy;
  settings: Settings;
  versions: PolicyVersion[];
  packs: CustomerPack[];
  activePackId: string;
  pendingReview: PendingReview | null;
  langfuseLog: LangfuseEvent[];
  selectedId: string | null;
  role: Role;
  select: (id: string | null) => void;
  setRole: (role: Role) => void;
  updateQuote: (id: string, patch: Partial<Quote>) => void;
  updateAccount: (id: string, patch: Partial<Quote["account"]>) => void;
  updateLine: (id: string, lineId: string, patch: Partial<LineItem>) => void;
  addLine: (id: string, item: LineItem) => void;
  removeLine: (id: string, lineId: string) => void;
  createDraft: () => string;
  commitDecision: (id: string, decision: FinalDecision) => void;
  advance: (id: string) => void;
  revise: (id: string) => void;
  humanDecide: (id: string, action: "approve" | "reject" | "return", comment: string) => void;
  setThreshold: (value: number) => void;
  setCompanyName: (value: string) => void;
  setPrepayCredit: (value: number) => void;
  setRespectReject: (value: boolean) => void;
  setDiscountBand: (
    segment: Segment,
    key: TypeKey,
    field: "maxStandard" | "maxException" | "maxIncreaseVsPrevious",
    value: number,
  ) => void;
  setTermRisk: (term: PaymentTerms, bucket: RiskBucket) => void;
  setBillingRisk: (billing: BillingFrequency, bucket: RiskBucket) => void;
  setAssignmentRule: (
    id: AssignmentRule["id"],
    patch: Partial<Pick<AssignmentRule, "assignee" | "assigneeCash" | "queue" | "slaHours" | "externalId" | "externalIdCash">>,
  ) => void;
  switchPack: (id: string) => void;
  setPending: (pending: PendingReview) => void;
  setPendingOwner: (owner: string) => void;
  discardPending: () => void;
  confirmPending: () => void;
  publishWorkingCopy: () => void;
  pushLangfuse: (event: LangfuseEvent) => void;
  resetWorkspace: () => void;
}

function patchQuote(quotes: Quote[], id: string, recipe: (quote: Quote) => Quote): Quote[] {
  return quotes.map((quote) => (quote.id === id ? recipe(quote) : quote));
}

function nextVersionLabel(versions: PolicyVersion[]): string {
  const live = versions.find((version) => version.status === "live");
  const base = (live?.version ?? "2026.Q3").split("-r")[0] ?? "2026.Q3";
  return `${base}-r${versions.length + 1}`;
}

function archiveLive(versions: PolicyVersion[]): PolicyVersion[] {
  return versions.map((version) => (version.status === "live" ? { ...version, status: "archived" } : version));
}

function snapshotPack(state: {
  activePackId: string;
  discountPolicy: DiscountPolicy;
  paymentPolicy: PaymentPolicy;
  settings: Settings;
  versions: PolicyVersion[];
}): CustomerPack {
  return {
    id: state.activePackId,
    discountPolicy: cloneDiscount(state.discountPolicy),
    paymentPolicy: clonePayment(state.paymentPolicy),
    settings: structuredClone(state.settings),
    versions: structuredClone(state.versions),
  };
}

const openingPacks = buildCustomerPacks();
const opening = openingPacks[0];

const memoryStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

export const useDealflow = create<DealflowState>()(
  persist(
    (set, get) => ({
      quotes: buildInitialQuotes(),
      discountPolicy: cloneDiscount(opening.discountPolicy),
      paymentPolicy: clonePayment(opening.paymentPolicy),
      settings: structuredClone(opening.settings),
      versions: structuredClone(opening.versions),
      packs: openingPacks,
      activePackId: opening.id,
      pendingReview: null,
      langfuseLog: [],
      selectedId: "Q-2026-1001",
      role: "seller",
      select: (id) => set({ selectedId: id }),
      setRole: (role) => set({ role }),
      updateQuote: (id, patch) =>
        set({
          quotes: patchQuote(get().quotes, id, (quote) =>
            quote.stage === "draft" ? { ...quote, ...patch, id: quote.id, stage: quote.stage } : quote,
          ),
        }),
      updateAccount: (id, patch) =>
        set({
          quotes: patchQuote(get().quotes, id, (quote) =>
            quote.stage === "draft" ? { ...quote, account: { ...quote.account, ...patch } } : quote,
          ),
        }),
      updateLine: (id, lineId, patch) =>
        set({
          quotes: patchQuote(get().quotes, id, (quote) =>
            quote.stage === "draft"
              ? {
                  ...quote,
                  lineItems: quote.lineItems.map((item) =>
                    item.id === lineId ? { ...item, ...patch } : item,
                  ),
                }
              : quote,
          ),
        }),
      addLine: (id, item) =>
        set({
          quotes: patchQuote(get().quotes, id, (quote) =>
            quote.stage === "draft" ? { ...quote, lineItems: [...quote.lineItems, item] } : quote,
          ),
        }),
      removeLine: (id, lineId) =>
        set({
          quotes: patchQuote(get().quotes, id, (quote) =>
            quote.stage === "draft" && quote.lineItems.length > 1
              ? { ...quote, lineItems: quote.lineItems.filter((item) => item.id !== lineId) }
              : quote,
          ),
        }),
      createDraft: () => {
        const quote = blankQuote();
        set({ quotes: [quote, ...get().quotes], selectedId: quote.id });
        return quote.id;
      },
      commitDecision: (id, decision) => {
        const at = new Date().toISOString();
        set({
          quotes: patchQuote(get().quotes, id, (quote) => {
            if (quote.stage !== "draft") return quote;
            const stage = decision.resultingStage;
            return {
              ...quote,
              stage,
              decision,
              runs: [...quote.runs, decision],
              submittedAt: at,
              stageHistory: [
                ...quote.stageHistory,
                { stage: "submitted", at, by: quote.seller.name, note: "Submitted for approval." },
                { stage, at, by: "DealFlow Orchestrator", note: decision.writeback },
              ],
            };
          }),
        });
      },
      advance: (id) => {
        const order: Partial<Record<Stage, { stage: Stage; note: string }>> = {
          approved: { stage: "sent", note: "Order form sent to the customer." },
          sent: { stage: "signed", note: "Customer signed." },
          signed: { stage: "converted", note: "Converted to a subscription." },
        };
        const at = new Date().toISOString();
        set({
          quotes: patchQuote(get().quotes, id, (quote) => {
            const next = order[quote.stage];
            if (!next) return quote;
            return {
              ...quote,
              stage: next.stage,
              stageHistory: [
                ...quote.stageHistory,
                { stage: next.stage, at, by: quote.seller.name, note: next.note },
              ],
            };
          }),
        });
      },
      revise: (id) => {
        const at = new Date().toISOString();
        set({
          quotes: patchQuote(get().quotes, id, (quote) => {
            if (quote.stage !== "rejected") return quote;
            return {
              ...quote,
              stage: "draft",
              stageHistory: [
                ...quote.stageHistory,
                {
                  stage: "draft",
                  at,
                  by: quote.seller.name,
                  note: "Seller reopened the quote to revise terms.",
                },
              ],
            };
          }),
        });
      },
      humanDecide: (id, action, comment) => {
        const at = new Date().toISOString();
        const trimmed = comment.trim() || "Deal Desk review.";
        set({
          quotes: patchQuote(get().quotes, id, (quote) => {
            if (quote.stage !== "submitted") return quote;
            if (action === "return") {
              return {
                ...quote,
                stage: "draft",
                humanActions: [...quote.humanActions, { at, actor: DESK_ACTOR, action, comment: trimmed }],
                stageHistory: [
                  ...quote.stageHistory,
                  { stage: "draft", at, by: DESK_ACTOR, note: `Returned to seller. ${trimmed}` },
                ],
              };
            }
            const stage: Stage = action === "approve" ? "approved" : "rejected";
            const queue = quote.decision?.assignment;
            const actor = queue ? `${DESK_ACTOR} for ${queue.assignee}` : DESK_ACTOR;
            return {
              ...quote,
              stage,
              humanActions: [...quote.humanActions, { at, actor, action, comment: trimmed }],
              stageHistory: [
                ...quote.stageHistory,
                {
                  stage,
                  at,
                  by: actor,
                  note:
                    action === "approve"
                      ? `Approved on the assigned queue. ${trimmed}`
                      : `Rejected on the assigned queue. ${trimmed}`,
                },
              ],
            };
          }),
        });
      },
      setThreshold: (value) =>
        set({ settings: { ...get().settings, confidenceThreshold: value } }),
      setCompanyName: (value) =>
        set({ settings: { ...get().settings, companyName: value } }),
      setPrepayCredit: (value) =>
        set({ settings: { ...get().settings, prepayCreditPts: value } }),
      setRespectReject: (value) =>
        set({ settings: { ...get().settings, respectReject: value } }),
      setDiscountBand: (segment, key, field, value) => {
        const policy = cloneDiscount(get().discountPolicy);
        policy.segments[segment][key][field] = value;
        set({ discountPolicy: policy });
      },
      setTermRisk: (term, bucket) => {
        const policy = clonePayment(get().paymentPolicy);
        policy.terms[term] = bucket;
        set({ paymentPolicy: policy });
      },
      setBillingRisk: (billing, bucket) => {
        const policy = clonePayment(get().paymentPolicy);
        policy.billing[billing] = bucket;
        set({ paymentPolicy: policy });
      },
      setAssignmentRule: (id, patch) =>
        set({
          settings: {
            ...get().settings,
            assignmentRules: get().settings.assignmentRules.map((rule) =>
              rule.id === id ? { ...rule, ...patch } : rule,
            ),
          },
        }),
      switchPack: (id) => {
        const current = get();
        if (id === current.activePackId) return;
        const packs = current.packs.map((pack) => (pack.id === current.activePackId ? snapshotPack(current) : pack));
        const next = packs.find((pack) => pack.id === id);
        if (!next) return;
        set({
          packs,
          activePackId: next.id,
          discountPolicy: cloneDiscount(next.discountPolicy),
          paymentPolicy: clonePayment(next.paymentPolicy),
          settings: structuredClone(next.settings),
          versions: structuredClone(next.versions),
          pendingReview: null,
        });
      },
      setPending: (pending) => set({ pendingReview: pending }),
      setPendingOwner: (owner) => {
        const pending = get().pendingReview;
        if (!pending) return;
        set({ pendingReview: { ...pending, owner } });
      },
      discardPending: () => set({ pendingReview: null }),
      confirmPending: () => {
        const pending = get().pendingReview;
        if (!pending) return;
        const at = new Date().toISOString();
        const version: PolicyVersion = {
          id: `ver-${Date.now()}`,
          version: nextVersionLabel(get().versions),
          status: "live",
          owner: pending.owner,
          sourceName: pending.sourceName,
          sourceKind: pending.sourceName.toLowerCase().includes("paste") ? "paste" : "upload",
          extractor: pending.extractor,
          note: pending.note,
          confirmedBy: pending.owner,
          confirmedAt: at,
          createdAt: at,
          discount: cloneDiscount(pending.discount),
          payment: clonePayment(pending.payment),
        };
        version.discount.version = version.version;
        version.discount.owner = pending.owner;
        version.discount.lastUpdated = at.slice(0, 10);
        version.payment.version = version.version;
        version.payment.owner = pending.owner;
        version.payment.lastUpdated = at.slice(0, 10);
        set({
          versions: [version, ...archiveLive(get().versions)],
          discountPolicy: cloneDiscount(version.discount),
          paymentPolicy: clonePayment(version.payment),
          settings:
            pending.suggestedThreshold == null
              ? get().settings
              : { ...get().settings, confidenceThreshold: pending.suggestedThreshold },
          pendingReview: null,
        });
      },
      publishWorkingCopy: () => {
        const at = new Date().toISOString();
        const version: PolicyVersion = {
          id: `ver-${Date.now()}`,
          version: nextVersionLabel(get().versions),
          status: "live",
          owner: "Revenue Operations",
          sourceName: "Working copy edited in the console",
          sourceKind: "edit",
          extractor: "seed",
          note: "Published from the policy console without a new document.",
          confirmedBy: "Revenue Operations",
          confirmedAt: at,
          createdAt: at,
          discount: cloneDiscount(get().discountPolicy),
          payment: clonePayment(get().paymentPolicy),
        };
        version.discount.version = version.version;
        version.discount.lastUpdated = at.slice(0, 10);
        version.payment.version = version.version;
        version.payment.lastUpdated = at.slice(0, 10);
        set({
          versions: [version, ...archiveLive(get().versions)],
          discountPolicy: cloneDiscount(version.discount),
          paymentPolicy: clonePayment(version.payment),
        });
      },
      pushLangfuse: (event) => set({ langfuseLog: [event, ...(get().langfuseLog ?? [])].slice(0, 40) }),
      resetWorkspace: () => {
        const packs = buildCustomerPacks();
        const first = packs[0];
        set({
          quotes: buildInitialQuotes(),
          discountPolicy: cloneDiscount(first.discountPolicy),
          paymentPolicy: clonePayment(first.paymentPolicy),
          settings: structuredClone(first.settings),
          versions: structuredClone(first.versions),
          packs,
          activePackId: first.id,
          pendingReview: null,
          langfuseLog: [],
          selectedId: "Q-2026-1001",
        });
      },
    }),
    {
      name: "helio-dealflow-v5",
      version: 5,
      skipHydration: true,
      storage: createJSONStorage(() =>
        typeof window === "undefined" ? memoryStorage : window.localStorage,
      ),
      partialize: (state) => ({
        quotes: state.quotes,
        discountPolicy: state.discountPolicy,
        paymentPolicy: state.paymentPolicy,
        settings: state.settings,
        versions: state.versions,
        packs: state.packs,
        activePackId: state.activePackId,
        pendingReview: state.pendingReview,
        langfuseLog: state.langfuseLog,
        selectedId: state.selectedId,
        role: state.role,
      }),
    },
  ),
);

export function previewDecision(quote: Quote): FinalDecision {
  const { discountPolicy, paymentPolicy, settings } = useDealflow.getState();
  return reviewQuote(quote, discountPolicy, paymentPolicy, settings);
}

export const DESK_LEAD = DESK_ACTOR;
