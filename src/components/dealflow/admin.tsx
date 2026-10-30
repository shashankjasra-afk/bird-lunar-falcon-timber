import { useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { EconomicsPanel, GoldenPanel, HarnessPanel, HitlPanel, InputGuardsPanel, JudgePanel, OutputGuardsPanel, PrdPanel } from "@/components/dealflow/capstone";
import { AgentsDemo } from "@/components/dealflow/agents-demo";
import { FlowPanel } from "@/components/dealflow/flow";
import { LangfusePanel } from "@/components/dealflow/langfuse";
import { OnboardPanel } from "@/components/dealflow/onboard";
import { cn } from "@/lib/cn";
import { typeLabel } from "@/lib/dealflow/format";
import {
  BILLING,
  CATALOG,
  PAYMENT_TERMS,
  SEGMENTS,
  TYPE_KEYS,
} from "@/lib/dealflow/policies";
import { useDealflow } from "@/lib/dealflow/store";
import type { AssignmentRule, RiskBucket, Segment } from "@/lib/dealflow/types";

export type AdminTab =
  | "golden"
  | "harness"
  | "input"
  | "output"
  | "economics"
  | "prd"
  | "judge"
  | "hitl"
  | "book"
  | "onboard"
  | "discount"
  | "cash"
  | "queues"
  | "orch"
  | "langfuse"
  | "flow"
  | "agents";

const TABS: { id: AdminTab; label: string }[] = [
  { id: "harness", label: "Eval harness" },
  { id: "input", label: "Input guards" },
  { id: "output", label: "Output guards" },
  { id: "economics", label: "Token cost" },
  { id: "prd", label: "AI-native PRD" },
  { id: "judge", label: "LLM judge" },
  { id: "hitl", label: "HITL design" },
  { id: "book", label: "Data book" },
  { id: "onboard", label: "Onboard policy" },
  { id: "discount", label: "Discount policy" },
  { id: "cash", label: "Payment policy" },
  { id: "queues", label: "Escalation queues" },
  { id: "orch", label: "Engine" },
];

const BUCKETS: { id: RiskBucket; label: string }[] = [
  { id: "preferred", label: "Preferred" },
  { id: "acceptable", label: "Acceptable" },
  { id: "elevated", label: "Elevated" },
  { id: "high_risk", label: "High risk" },
];

const field =
  "h-11 w-full rounded-md border border-line bg-paper px-3 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal";
const btn =
  "inline-flex h-11 items-center justify-center rounded-md px-4 text-sm font-semibold transition-transform duration-150 ease-out active:scale-[0.96]";

export function AdminWorkspace({ tab }: { tab: AdminTab }) {
  const navigate = useNavigate();
  const companyName = useDealflow((state) => state.settings.companyName);
  const versions = useDealflow((state) => state.versions);
  const packs = useDealflow((state) => state.packs);
  const activePackId = useDealflow((state) => state.activePackId);
  const switchPack = useDealflow((state) => state.switchPack);
  const live = versions.find((version) => version.status === "live");

  if (tab === "golden" || tab === "langfuse" || tab === "flow" || tab === "agents") {
    return (
      <div className="space-y-5">
        {tab === "golden" && <GoldenPanel />}
        {tab === "langfuse" && <LangfusePanel />}
        {tab === "flow" && <FlowPanel />}
        {tab === "agents" && <AgentsDemo />}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl text-ink">Policy console</h1>
        <p className="mt-1 max-w-2xl text-sm text-pretty text-muted">
          {companyName} configures the book the agents read. On submit, a discount agent, a payment agent, and an orchestrator decide Approve, Escalate, or Reject. A guardrail blocks a label that is looser than the book, and a note cannot produce Approve. Salesforce CPQ, Revenue Cloud, DealHub, Conga, and Zuora stay the system of record.
        </p>
        {live && (
          <p className="mt-2 text-sm text-ink">
            Live book {live.version} · owner {live.owner} · confirmed {live.confirmedAt?.slice(0, 10) ?? "—"}
          </p>
        )}
        <label className="mt-4 block max-w-sm text-sm">
          <span className="mb-1 block text-xs font-semibold tracking-widest text-muted uppercase">Customer pack</span>
          <select
            className={field}
            value={activePackId}
            onChange={(event) => switchPack(event.target.value)}
          >
            {packs.map((pack) => (
              <option key={pack.id} value={pack.id}>
                {pack.settings.companyName}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-muted">
            Helio and Northstar are separate packs. Each company keeps its own book, threshold, and queues. Switching the live pack changes the next hop. It does not rewrite quotes already decided.
          </span>
        </label>
      </div>
      <div className="sticky top-0 z-20 -mx-4 border-y border-line bg-paper px-4 py-3 sm:-mx-6 sm:px-6" role="tablist" aria-label="Policy console">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              className={cn(
                "min-h-12 touch-manipulation rounded-md px-3 text-sm font-semibold",
                tab === item.id ? "bg-teal text-paper" : "bg-card text-ink ring-1 ring-line",
              )}
              onClick={() => void navigate({ to: "/admin", search: { tab: item.id } })}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      {tab === "harness" && <HarnessPanel />}
      {tab === "input" && <InputGuardsPanel />}
      {tab === "output" && <OutputGuardsPanel />}
      {tab === "economics" && <EconomicsPanel />}
      {tab === "prd" && <PrdPanel />}
      {tab === "judge" && <JudgePanel />}
      {tab === "hitl" && <HitlPanel />}
      {tab === "book" && <DataBook />}
      {tab === "onboard" && <OnboardPanel />}
      {tab === "discount" && <DiscountBook />}
      {tab === "cash" && <CashBook />}
      {tab === "queues" && <QueueBook />}
      {tab === "orch" && <OrchestratorBook />}
    </div>
  );
}

function DataBook() {
  const quotes = useDealflow((state) => state.quotes);
  const discount = useDealflow((state) => state.discountPolicy);
  const payment = useDealflow((state) => state.paymentPolicy);
  const versions = useDealflow((state) => state.versions);
  const publishWorkingCopy = useDealflow((state) => state.publishWorkingCopy);
  const resetWorkspace = useDealflow((state) => state.resetWorkspace);
  const [armed, setArmed] = useState(false);

  const accounts = useMemo(() => {
    const map = new Map<string, (typeof quotes)[number]>();
    for (const quote of quotes) {
      if (!map.has(quote.account.name)) map.set(quote.account.name, quote);
    }
    return [...map.values()];
  }, [quotes]);

  const sellers = useMemo(() => {
    const map = new Map<string, string>();
    for (const quote of quotes) map.set(quote.seller.id, quote.seller.name);
    return [...map.entries()];
  }, [quotes]);

  const labeled = quotes.filter((quote) => quote.goldenExpected);

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-line bg-card p-4">
        <h2 className="font-display text-2xl text-ink">How this book was loaded</h2>
        <p className="mt-2 max-w-3xl text-sm text-pretty text-ink-soft">
          On 15 July 2026 Revenue Operations published two policy packs and a product catalog. The quote book is a closed extract in the same shape a Salesforce CPQ webhook would send. Agents do not train on these rows. They apply the packs at submit time and write the stage back.
        </p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-3">
          <Fact label="Catalog" value={`${CATALOG.length} SKUs`} detail="List price is the price book. Quotes copy it onto the line." />
          <Fact label={discount.policyId} value={discount.version} detail={`${discount.owner}. Effective ${discount.lastUpdated}.`} />
          <Fact label={payment.policyId} value={payment.version} detail={`${payment.owner}. Effective ${payment.lastUpdated}.`} />
        </dl>
      </section>

      <Panel title="Policy versions">
        <ul className="divide-y divide-line text-sm">
          {versions.map((version) => (
            <li key={version.id} className="px-3 py-3">
              <p className="font-semibold">
                {version.version} · {version.status === "live" ? "Live" : "Archived"} · {version.owner}
              </p>
              <p className="text-ink-soft">
                {version.sourceName}. Confirmed by {version.confirmedBy ?? "—"} on {version.confirmedAt?.slice(0, 10) ?? "—"}. Extractor {version.extractor}.
              </p>
            </li>
          ))}
        </ul>
        <div className="border-t border-line px-3 py-3">
          <button type="button" className={cn(btn, "bg-card text-ink ring-1 ring-line")} onClick={() => publishWorkingCopy()}>
            Publish working copy as a new version
          </button>
          <p className="mt-2 text-sm text-muted">
            Ceiling edits apply to the next decision immediately. Publishing archives the previous live version and stamps ownership.
          </p>
        </div>
      </Panel>

      <Panel title="Product catalog">
        <div className="overflow-x-auto">
          <table className="w-full min-w-max text-left text-sm">
            <thead className="border-b border-line text-xs tracking-widest text-muted uppercase">
              <tr>
                <th className="px-3 py-2 font-semibold">SKU</th>
                <th className="px-3 py-2 font-semibold">Product</th>
                <th className="px-3 py-2 font-semibold">Family</th>
                <th className="px-3 py-2 font-semibold">List price</th>
              </tr>
            </thead>
            <tbody>
              {CATALOG.map((item) => (
                <tr key={item.sku} className="border-b border-line last:border-0">
                  <td className="px-3 py-3 font-medium">{item.sku}</td>
                  <td className="px-3 py-3">{item.name}</td>
                  <td className="px-3 py-3 text-ink-soft">{item.family}</td>
                  <td className="px-3 py-3 tabular-nums">${item.listPrice.toLocaleString("en-US")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Accounts in the extract">
          <ul className="divide-y divide-line text-sm">
            {accounts.map((quote) => (
              <li key={quote.account.name} className="flex items-start justify-between gap-3 px-3 py-3">
                <div>
                  <p className="font-semibold">{quote.account.name}</p>
                  <p className="text-muted">
                    {quote.account.segment} · {quote.account.region}
                  </p>
                </div>
                <p className="shrink-0 tabular-nums text-ink-soft">
                  {quote.account.existingAcv == null
                    ? "New logo"
                    : `ACV $${Math.round(quote.account.existingAcv).toLocaleString("en-US")}`}
                </p>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Sellers">
          <ul className="divide-y divide-line text-sm">
            {sellers.map(([id, name]) => (
              <li key={id} className="flex items-center justify-between px-3 py-3">
                <p className="font-semibold">{name}</p>
                <p className="text-muted">{id}</p>
              </li>
            ))}
          </ul>
          <p className="border-t border-line px-3 py-3 text-sm text-muted">
            {labeled.length} quotes carry one expected label each. Open Golden set for the record. The other quotes are already on the path so the company view is not empty.
          </p>
        </Panel>
      </div>

      <Panel title="Labeled quotes">
        <div className="overflow-x-auto">
          <table className="w-full min-w-max text-left text-sm">
            <thead className="border-b border-line text-xs tracking-widest text-muted uppercase">
              <tr>
                <th className="px-3 py-2 font-semibold">Quote</th>
                <th className="px-3 py-2 font-semibold">Account</th>
                <th className="px-3 py-2 font-semibold">Type</th>
                <th className="px-3 py-2 font-semibold">Expected</th>
                <th className="px-3 py-2 font-semibold">Why it is in the set</th>
              </tr>
            </thead>
            <tbody>
              {labeled.map((quote) => (
                <tr key={quote.id} className="border-b border-line last:border-0">
                  <td className="px-3 py-3 font-medium">{quote.id}</td>
                  <td className="px-3 py-3">{quote.account.name}</td>
                  <td className="px-3 py-3">{quote.type}</td>
                  <td className="px-3 py-3 font-semibold">{quote.goldenExpected}</td>
                  <td className="px-3 py-3 text-ink-soft">{quote.scenario}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <button
          type="button"
          className={cn(btn, armed ? "bg-rust text-paper" : "bg-card text-ink ring-1 ring-line")}
          onClick={() => {
            if (!armed) {
              setArmed(true);
              return;
            }
            resetWorkspace();
            setArmed(false);
          }}
        >
          {armed ? "Confirm reset" : "Reset demo book"}
        </button>
        {armed && (
          <button type="button" className={cn(btn, "text-ink")} onClick={() => setArmed(false)}>
            Cancel
          </button>
        )}
        <p className="text-sm text-muted">Restores policies, thresholds, and every quote to the loaded extract.</p>
      </div>
    </div>
  );
}

function DiscountBook() {
  const policy = useDealflow((state) => state.discountPolicy);
  const setDiscountBand = useDealflow((state) => state.setDiscountBand);
  const [segment, setSegment] = useState<Segment>("Enterprise");
  const bands = policy.segments[segment];

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-line bg-card p-4">
        <p className="text-xs font-semibold tracking-widest text-teal uppercase">{policy.policyId}</p>
        <h2 className="font-display text-2xl text-ink">{policy.policyName}</h2>
        <p className="mt-1 text-sm text-muted">
          {policy.version} · {policy.owner} · effective {policy.lastUpdated}
        </p>
        <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Segment">
          {SEGMENTS.map((item) => (
            <button
              key={item}
              type="button"
              className={cn(btn, "shrink-0", segment === item ? "bg-teal text-paper" : "bg-paper text-ink ring-1 ring-line")}
              onClick={() => setSegment(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </section>
      <Panel title={`${segment} ceilings`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-max text-left text-sm">
            <thead className="border-b border-line text-xs tracking-widest text-muted uppercase">
              <tr>
                <th className="px-3 py-2 font-semibold">Deal type</th>
                <th className="px-3 py-2 font-semibold">Standard %</th>
                <th className="px-3 py-2 font-semibold">Exception %</th>
                <th className="px-3 py-2 font-semibold">Max jump vs prior</th>
              </tr>
            </thead>
            <tbody>
              {TYPE_KEYS.map((key) => {
                const band = bands[key];
                return (
                  <tr key={key} className="border-b border-line last:border-0">
                    <td className="px-3 py-3 font-medium">{typeLabel(key)}</td>
                    <td className="px-3 py-3">
                      <NumberCell
                        label={`Standard discount for ${segment} ${typeLabel(key)}`}
                        value={band.maxStandard}
                        onChange={(value) => setDiscountBand(segment, key, "maxStandard", value)}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <NumberCell
                        label={`Exception discount for ${segment} ${typeLabel(key)}`}
                        value={band.maxException}
                        onChange={(value) => setDiscountBand(segment, key, "maxException", value)}
                      />
                    </td>
                    <td className="px-3 py-3">
                      {band.maxIncreaseVsPrevious == null ? (
                        <span className="text-muted">Not used</span>
                      ) : (
                        <NumberCell
                          label={`Max jump for ${segment} ${typeLabel(key)}`}
                          value={band.maxIncreaseVsPrevious}
                          onChange={(value) => setDiscountBand(segment, key, "maxIncreaseVsPrevious", value)}
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {bands.new_business.volumeTiers && (
          <div className="border-t border-line px-3 py-3 text-sm text-ink-soft">
            <p className="font-semibold text-ink">New-business volume tiers</p>
            <ul className="mt-2 space-y-1">
              {bands.new_business.volumeTiers.map((tier) => (
                <li key={tier.minAcv}>
                  Net ${tier.minAcv.toLocaleString("en-US")}–${tier.maxAcv.toLocaleString("en-US")} · tier cap {tier.maxDiscount}%
                </li>
              ))}
            </ul>
          </div>
        )}
      </Panel>
      <RuleList
        title="Special rules the discount agent cites"
        rules={policy.specialRules}
      />
    </div>
  );
}

function CashBook() {
  const policy = useDealflow((state) => state.paymentPolicy);
  const settings = useDealflow((state) => state.settings);
  const setTermRisk = useDealflow((state) => state.setTermRisk);
  const setBillingRisk = useDealflow((state) => state.setBillingRisk);
  const setPrepayCredit = useDealflow((state) => state.setPrepayCredit);

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-line bg-card p-4">
        <p className="text-xs font-semibold tracking-widest text-teal uppercase">{policy.policyId}</p>
        <h2 className="font-display text-2xl text-ink">{policy.policyName}</h2>
        <p className="mt-1 text-sm text-muted">
          {policy.version} · {policy.owner} · effective {policy.lastUpdated}
        </p>
      </section>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Payment terms">
          <ul className="divide-y divide-line">
            {PAYMENT_TERMS.map((term) => (
              <li key={term} className="grid items-center gap-2 px-3 py-3 sm:grid-cols-2">
                <p className="text-sm font-semibold">{term}</p>
                <select
                  className={field}
                  aria-label={`Risk for ${term}`}
                  value={policy.terms[term]}
                  onChange={(event) => setTermRisk(term, event.target.value as RiskBucket)}
                >
                  {BUCKETS.map((bucket) => (
                    <option key={bucket.id} value={bucket.id}>
                      {bucket.label}
                    </option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Billing frequency">
          <ul className="divide-y divide-line">
            {BILLING.map((billing) => (
              <li key={billing} className="grid items-center gap-2 px-3 py-3 sm:grid-cols-2">
                <p className="text-sm font-semibold">{billing}</p>
                <select
                  className={field}
                  aria-label={`Risk for ${billing}`}
                  value={policy.billing[billing]}
                  onChange={(event) => setBillingRisk(billing, event.target.value as RiskBucket)}
                >
                  {BUCKETS.map((bucket) => (
                    <option key={bucket.id} value={bucket.id}>
                      {bucket.label}
                    </option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
          <label className="block border-t border-line px-3 py-3 text-sm">
            <span className="mb-1 block text-xs font-semibold tracking-widest text-muted uppercase">
              Multi-year prepay credit (points)
            </span>
            <input
              className={field}
              type="number"
              min={0}
              max={20}
              value={settings.prepayCreditPts}
              onChange={(event) => setPrepayCredit(clamp(Number(event.target.value), 0, 20))}
            />
            <span className="mt-1 block text-muted">
              Added to the standard ceiling, the exception ceiling, and the allowed historical jump.
            </span>
          </label>
        </Panel>
      </div>
      <RuleList title="Change rules the payment agent cites" rules={policy.changeRules} />
    </div>
  );
}

function OrchestratorBook() {
  const settings = useDealflow((state) => state.settings);
  const setThreshold = useDealflow((state) => state.setThreshold);
  const setRespectReject = useDealflow((state) => state.setRespectReject);
  const setCompanyName = useDealflow((state) => state.setCompanyName);

  return (
    <div className="space-y-4">
      <section className="grid gap-4 rounded-lg border border-line bg-card p-4 lg:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-semibold tracking-widest text-muted uppercase">Company</span>
          <input
            className={field}
            value={settings.companyName}
            onChange={(event) => setCompanyName(event.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-semibold tracking-widest text-muted uppercase">
            Auto-approve confidence · {settings.confidenceThreshold}%
          </span>
          <input
            className="mt-3 w-full accent-teal"
            type="range"
            min={50}
            max={95}
            value={settings.confidenceThreshold}
            onChange={(event) => setThreshold(Number(event.target.value))}
          />
          <span className="mt-2 block text-muted">
            Both specialists must approve, and their average confidence must clear this line. Otherwise the quote stays on Submit for approval.
          </span>
        </label>
        <label className="flex items-start gap-3 text-sm lg:col-span-2">
          <input
            className="mt-1 size-5 accent-teal"
            type="checkbox"
            checked={settings.respectReject}
            onChange={(event) => setRespectReject(event.target.checked)}
          />
          <span>
            <span className="font-semibold">Respect a specialist Reject</span>
            <span className="mt-1 block text-muted">
              On: any Reject becomes the company decision. Off: a Reject is downgraded to Escalate so a person still writes the stage.
            </span>
          </span>
        </label>
      </section>

      <section className="rounded-lg border border-line bg-card p-4">
        <h2 className="font-display text-2xl text-ink">Rules the engine applies</h2>
        <p className="mt-2 max-w-3xl text-sm text-ink-soft">
          The agents apply these rules after they read the book. The model writes the thinking and the label. The guardrail keeps the label from getting looser than the tools, and it blocks an approval that came from the notes. G007 stays Approve only while the line stays at {settings.confidenceThreshold}%.
        </p>
        <ol className="mt-3 space-y-2 text-sm text-ink-soft">
          <li>R1. Any book Reject becomes Reject, unless that switch above is off.</li>
          <li>R2. Any book Escalate becomes Escalate. The quote stays on Submit for approval.</li>
          <li>R3. Both Approve and average confidence is at least {settings.confidenceThreshold}% → Approve. Stage jumps to Approved.</li>
          <li>R4. Both Approve but confidence is under the line → Escalate.</li>
          <li>R5. Quote notes are never an input. An instruction hidden there does not change the label.</li>
        </ol>
      </section>
    </div>
  );
}

function QueueBook() {
  const rules = useDealflow((state) => state.settings.assignmentRules);
  const setAssignmentRule = useDealflow((state) => state.setAssignmentRule);

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-line bg-card p-4">
        <h2 className="font-display text-2xl text-ink">Who gets the quote</h2>
        <p className="mt-2 max-w-3xl text-sm text-pretty text-ink-soft">
          Approve has no queue. Escalate and Reject assign a role, a queue, and an SLA. The SLA is the cost of waiting: a held enterprise quote is a day of close, so the desk gets 24 hours. Period-close is 12 hours because a slipped quarter-end signature costs more. Names here resolve to a Salesforce queue, a DealHub group, or a CPQ step.
        </p>
      </section>
      <div className="space-y-3">
        {rules.map((rule) => (
          <QueueCard key={rule.id} rule={rule} onChange={(patch) => setAssignmentRule(rule.id, patch)} />
        ))}
      </div>
    </div>
  );
}

function QueueCard({
  rule,
  onChange,
}: {
  rule: AssignmentRule;
  onChange: (
    patch: Partial<Pick<AssignmentRule, "assignee" | "assigneeCash" | "queue" | "slaHours" | "externalId" | "externalIdCash">>,
  ) => void;
}) {
  const split = rule.assigneeCash !== "";
  return (
    <section className="grid gap-3 rounded-lg border border-line bg-card p-4 lg:grid-cols-3">
      <div className="lg:col-span-3">
        <h3 className="font-semibold text-ink">{rule.label}</h3>
        <p className="mt-1 text-sm text-muted">{rule.integration}</p>
      </div>
      <label className="block text-sm">
        <span className="mb-1 block text-xs font-semibold tracking-widest text-muted uppercase">
          {split ? "Discount assignee" : "Assignee"}
        </span>
        <input className={field} value={rule.assignee} onChange={(event) => onChange({ assignee: event.target.value })} />
      </label>
      {split && (
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-semibold tracking-widest text-muted uppercase">Cash assignee</span>
          <input
            className={field}
            value={rule.assigneeCash}
            onChange={(event) => onChange({ assigneeCash: event.target.value })}
          />
        </label>
      )}
      <label className="block text-sm">
        <span className="mb-1 block text-xs font-semibold tracking-widest text-muted uppercase">Queue</span>
        <input className={field} value={rule.queue} onChange={(event) => onChange({ queue: event.target.value })} />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-xs font-semibold tracking-widest text-muted uppercase">Resolver id</span>
        <input
          className={field}
          value={rule.externalId}
          onChange={(event) => onChange({ externalId: event.target.value })}
        />
      </label>
      {split && (
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-semibold tracking-widest text-muted uppercase">Cash resolver id</span>
          <input
            className={field}
            value={rule.externalIdCash}
            onChange={(event) => onChange({ externalIdCash: event.target.value })}
          />
        </label>
      )}
      <label className="block text-sm">
        <span className="mb-1 block text-xs font-semibold tracking-widest text-muted uppercase">SLA hours</span>
        <input
          className={field}
          type="number"
          min={1}
          max={120}
          value={rule.slaHours}
          onChange={(event) => onChange({ slaHours: clamp(Number(event.target.value), 1, 120) })}
        />
      </label>
    </section>
  );
}

function Fact({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-md bg-paper px-3 py-3">
      <dt className="text-xs tracking-widest text-muted uppercase">{label}</dt>
      <dd className="mt-1 font-display text-2xl text-ink">{value}</dd>
      <dd className="mt-1 text-sm text-ink-soft">{detail}</dd>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-lg border border-line bg-card">
      <h2 className="border-b border-line px-3 py-3 font-semibold text-ink">{title}</h2>
      {children}
    </section>
  );
}

function RuleList({ title, rules }: { title: string; rules: { id: string; name: string; description: string }[] }) {
  return (
    <section className="rounded-lg border border-line bg-card p-4">
      <h2 className="font-semibold text-ink">{title}</h2>
      <ul className="mt-3 space-y-3">
        {rules.map((rule) => (
          <li key={rule.id} className="text-sm">
            <p className="font-semibold">
              {rule.id} · {rule.name}
            </p>
            <p className="text-ink-soft">{rule.description}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function NumberCell({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <input
      className="h-11 w-24 rounded-md border border-line bg-paper px-2 tabular-nums"
      type="number"
      min={0}
      max={80}
      aria-label={label}
      value={value}
      onChange={(event) => onChange(clamp(Number(event.target.value), 0, 80))}
    />
  );
}

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}
