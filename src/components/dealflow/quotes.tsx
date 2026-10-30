import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AgentCard, AgentTheater, AssignmentBanner, DecisionBadge } from "@/components/dealflow/decision";
import { QuotePath } from "@/components/dealflow/path";
import { cn } from "@/lib/cn";
import {
  formatDay,
  formatWhen,
  lineNet,
  money,
  moneyExactFmt,
  pct,
  quoteTotals,
  stageLabel,
  toPayload,
} from "@/lib/dealflow/format";
import { commercialFile } from "@/lib/dealflow/history";
import { CATALOG } from "@/lib/dealflow/policies";
import { previewDecision, useDealflow } from "@/lib/dealflow/store";
import { runAgentHop } from "@/lib/dealflow/agent-run";
import { recordTraces } from "@/lib/dealflow/langfuse-run";
import { rememberTraces, traceFromDecision } from "@/lib/dealflow/trace-row";
import type {
  BillingFrequency,
  FinalDecision,
  PaymentTerms,
  Quote,
  QuoteType,
  Segment,
  Stage,
} from "@/lib/dealflow/types";

const DEMOS = [
  ["Q-2026-1001", "Clean approve"],
  ["Q-2026-1002", "Hard reject"],
  ["Q-2026-1003", "Desk hold"],
  ["Q-2026-1008", "Quarter-end"],
] as const;

const STAGES: Stage[] = ["draft", "submitted", "approved", "sent", "signed", "converted", "rejected"];
const TYPES: QuoteType[] = ["New", "Renewal", "Add-on", "Expansion"];
const SEGMENTS: Segment[] = ["Enterprise", "Mid-Market", "SMB"];
const TERMS: PaymentTerms[] = ["Due on Receipt", "Net-30", "Net-45", "Net-60", "Net-90"];
const BILLING: BillingFrequency[] = ["Annual", "Multi-Year Prepay", "Quarterly", "Monthly"];

const field =
  "h-11 w-full rounded-md border border-line bg-card px-3 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal";
const btn =
  "inline-flex h-11 items-center justify-center rounded-md px-4 text-sm font-semibold transition-transform duration-150 ease-out active:scale-[0.96] disabled:opacity-50";

function stageChip(stage: Stage): string {
  if (stage === "rejected") return "bg-rust-soft text-rust";
  if (stage === "submitted") return "bg-brass-soft text-brass";
  if (stage === "draft") return "bg-paper-2 text-ink-soft";
  return "bg-ok-soft text-ok";
}

export function QuotesWorkspace() {
  const quotes = useDealflow((state) => state.quotes);
  const selectedId = useDealflow((state) => state.selectedId);
  const select = useDealflow((state) => state.select);
  const createDraft = useDealflow((state) => state.createDraft);
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState<Stage | "all">("all");
  const [pane, setPane] = useState<"list" | "detail">("list");

  const counts = useMemo(() => {
    const map = Object.fromEntries(STAGES.map((item) => [item, 0])) as Record<Stage, number>;
    for (const quote of quotes) map[quote.stage] += 1;
    return map;
  }, [quotes]);

  const visible = quotes.filter((quote) => {
    const hay = `${quote.id} ${quote.account.name} ${quote.seller.name} ${quote.type}`.toLowerCase();
    if (query && !hay.includes(query.toLowerCase())) return false;
    if (stage !== "all" && quote.stage !== stage) return false;
    return true;
  });

  const selected = quotes.find((quote) => quote.id === selectedId) ?? visible[0] ?? quotes[0];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-display text-3xl text-ink">Quotes</h1>
          <p className="mt-1 max-w-2xl text-sm text-pretty text-muted">
            Select a quote. Submit for approval is the only step the agents write. Everything after Approved is the seller.
          </p>
        </div>
        <button
          type="button"
          className={cn(btn, "bg-card text-ink ring-1 ring-line")}
          onClick={() => {
            createDraft();
            setPane("detail");
          }}
        >
          New draft
        </button>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Golden quotes">
        {DEMOS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={cn(btn, "shrink-0 bg-teal-soft text-teal-deep", selected?.id === id && "ring-2 ring-teal")}
            onClick={() => {
              select(id);
              setStage("all");
              setPane("detail");
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {STAGES.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setStage(stage === item ? "all" : item)}
            className={cn(
              "rounded-lg border px-3 py-2 text-left",
              stage === item ? "border-teal bg-teal-soft" : "border-line bg-card",
            )}
          >
            <p className="text-xs text-muted">{stageLabel(item)}</p>
            <p className="font-display text-2xl tabular-nums text-ink">{counts[item]}</p>
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <aside className={cn("min-w-0 space-y-3", pane === "detail" && "hidden lg:block")}>
          <input
            className={field}
            placeholder="Search account, seller, quote"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search quotes"
          />
          <ul className="space-y-2">
            {visible.map((quote) => {
              const totals = quoteTotals(quote);
              const active = quote.id === selected?.id;
              return (
                <li key={quote.id}>
                  <button
                    type="button"
                    onClick={() => {
                      select(quote.id);
                      setPane("detail");
                    }}
                    className={cn(
                      "w-full rounded-lg border px-3 py-3 text-left",
                      active ? "border-teal bg-teal-soft" : "border-line bg-card",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-ink">{quote.account.name}</p>
                      <span className={cn("shrink-0 rounded-full px-2 py-1 text-xs font-semibold", stageChip(quote.stage))}>
                        {stageLabel(quote.stage)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {quote.id} · {quote.type} · {quote.seller.name}
                    </p>
                    <p className="mt-2 text-sm tabular-nums text-ink-soft">
                      {money(totals.net)} net · {pct(totals.discount)} off
                    </p>
                  </button>
                </li>
              );
            })}
            {visible.length === 0 && <li className="text-sm text-muted">No quotes in this view.</li>}
          </ul>
        </aside>
        <section className={cn("min-w-0", pane === "list" && "hidden lg:block")}>
          {selected ? (
            <QuoteDetail quote={selected} onBack={() => setPane("list")} />
          ) : (
            <p className="text-sm text-muted">Select a quote to open it.</p>
          )}
        </section>
      </div>
    </div>
  );
}

function QuoteDetail({ quote, onBack }: { quote: Quote; onBack: () => void }) {
  const updateQuote = useDealflow((state) => state.updateQuote);
  const updateAccount = useDealflow((state) => state.updateAccount);
  const updateLine = useDealflow((state) => state.updateLine);
  const addLine = useDealflow((state) => state.addLine);
  const removeLine = useDealflow((state) => state.removeLine);
  const commitDecision = useDealflow((state) => state.commitDecision);
  const advance = useDealflow((state) => state.advance);
  const revise = useDealflow((state) => state.revise);
  const [script, setScript] = useState<FinalDecision | null>(null);
  const [mode, setMode] = useState<"commit" | "preview">("preview");
  const [sku, setSku] = useState(CATALOG[0]?.sku ?? "");
  const [asking, setAsking] = useState(false);
  const [showReasoning, setShowReasoning] = useState(false);
  const committed = useRef<string | null>(null);
  const totals = quoteTotals(quote);
  const editable = quote.stage === "draft";
  const running = Boolean(script && mode === "commit" && quote.stage === "draft");

  useEffect(() => {
    setScript(null);
    committed.current = null;
    setShowReasoning(false);
  }, [quote.id]);

  function start(next: "commit" | "preview") {
    if (next === "preview") {
      committed.current = null;
      setMode(next);
      setScript(previewDecision(quote));
      return;
    }
    setAsking(true);
    const state = useDealflow.getState();
    void runAgentHop({
      data: {
        quote,
        discountPolicy: state.discountPolicy,
        paymentPolicy: state.paymentPolicy,
        settings: state.settings,
      },
    })
      .then((result) => {
        committed.current = null;
        setMode("commit");
        setScript(result.decision);
      })
      .catch(() => {
        committed.current = null;
        setMode("commit");
        setScript(previewDecision(quote));
      })
      .finally(() => setAsking(false));
  }

  function finish() {
    if (mode !== "commit" || !script) return;
    const key = `${script.quoteId}:${script.rule}:${script.overallDecision}`;
    if (committed.current === key) return;
    committed.current = key;
    commitDecision(quote.id, script);
    const row = traceFromDecision(quote, script);
    void recordTraces({ data: { rows: [row] } })
      .then((result) => rememberTraces(result, [row], useDealflow.getState().pushLangfuse))
      .catch(() => undefined);
  }

  const hold = running
    ? "running"
    : quote.stage === "rejected"
      ? "rejected"
      : quote.stage === "submitted"
        ? "desk"
        : "none";

  return (
    <div className="space-y-5">
      <button type="button" className="text-sm font-semibold text-teal lg:hidden" onClick={onBack}>
        Back to quotes
      </button>
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-widest text-teal uppercase">{quote.id}</p>
          <h2 className="font-display text-3xl text-ink">{quote.account.name}</h2>
          <p className="mt-1 text-sm text-pretty text-muted">{quote.scenario}</p>
        </div>
        <span className={cn("inline-flex h-8 items-center self-start rounded-full px-3 text-xs font-semibold", stageChip(quote.stage))}>
          {stageLabel(quote.stage)}
        </span>
      </header>

      <QuotePath stage={running ? "submitted" : quote.stage} hold={hold} />

      {script && (
        <div className="space-y-2">
          <AgentTheater key={`${quote.id}-${mode}-${script.overallDecision}-${script.overallConfidence}`} decision={script} onDone={finish} />
          <button type="button" className="text-sm font-semibold text-muted" onClick={() => setScript(null)}>
            Close agent run
          </button>
        </div>
      )}

      {!script && quote.decision && <DecisionPanel quote={quote} />}

      <section className="grid gap-3 sm:grid-cols-4">
        <Metric label="Net" value={money(totals.net)} />
        <Metric label="List" value={money(totals.list)} />
        <Metric label="Discount" value={pct(totals.discount)} />
        <Metric label="Terms" value={quote.paymentTerms} />
      </section>

      <section className="grid gap-4 rounded-lg border border-line bg-card p-4 lg:grid-cols-2">
        <Field label="Account">
          <input
            className={field}
            disabled={!editable}
            value={quote.account.name}
            onChange={(event) => updateAccount(quote.id, { name: event.target.value })}
          />
        </Field>
        <Field label="Segment">
          <select
            className={field}
            disabled={!editable}
            value={quote.account.segment}
            onChange={(event) => updateAccount(quote.id, { segment: event.target.value as Segment })}
          >
            {SEGMENTS.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </Field>
        <Field label="Region">
          <input
            className={field}
            disabled={!editable}
            value={quote.account.region}
            onChange={(event) => updateAccount(quote.id, { region: event.target.value })}
          />
        </Field>
        <Field label="Quote type">
          <select
            className={field}
            disabled={!editable}
            value={quote.type}
            onChange={(event) => updateQuote(quote.id, { type: event.target.value as QuoteType })}
          >
            {TYPES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </Field>
        <Field label="Quote date">
          <input
            className={field}
            type="date"
            disabled={!editable}
            value={quote.quoteDate}
            onChange={(event) => updateQuote(quote.id, { quoteDate: event.target.value })}
          />
        </Field>
        <Field label="Contract months">
          <input
            className={field}
            type="number"
            min={1}
            disabled={!editable}
            value={quote.contractMonths}
            onChange={(event) => updateQuote(quote.id, { contractMonths: Number(event.target.value) || 1 })}
          />
        </Field>
        <Field label="Payment terms">
          <select
            className={field}
            disabled={!editable}
            value={quote.paymentTerms}
            onChange={(event) => updateQuote(quote.id, { paymentTerms: event.target.value as PaymentTerms })}
          >
            {TERMS.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </Field>
        <Field label="Billing">
          <select
            className={field}
            disabled={!editable}
            value={quote.billingFrequency}
            onChange={(event) =>
              updateQuote(quote.id, { billingFrequency: event.target.value as BillingFrequency })
            }
          >
            {BILLING.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </Field>
        <div className="lg:col-span-2">
          <Field label="Notes">
            <textarea
              className="min-h-20 w-full rounded-md border border-line bg-card px-3 py-2 text-sm"
              disabled={!editable}
              value={quote.notes}
              onChange={(event) => updateQuote(quote.id, { notes: event.target.value })}
            />
            <span className="mt-1 block text-xs text-muted">
              People can read this. The agents cannot use it as an instruction. Text pasted here cannot approve, reject, or escalate.
            </span>
          </Field>
        </div>
        <p className="text-sm text-muted lg:col-span-2">
          Seller {quote.seller.name}. Existing ACV{" "}
          {quote.account.existingAcv == null ? "none" : money(quote.account.existingAcv)}.
          {quote.historical
            ? ` Prior discount ${quote.historical.previousDiscountPct ?? "—"}%, prior terms ${quote.historical.previousPaymentTerms ?? "—"}.`
            : " No prior contract."}
        </p>
      </section>

      <section className="overflow-x-auto rounded-lg border border-line bg-card">
        <table className="w-full min-w-max text-left text-sm">
          <thead className="border-b border-line text-xs tracking-widest text-muted uppercase">
            <tr>
              <th className="px-3 py-3 font-semibold">Product</th>
              <th className="px-3 py-3 font-semibold">Qty</th>
              <th className="px-3 py-3 font-semibold">List</th>
              <th className="px-3 py-3 font-semibold">Discount</th>
              <th className="px-3 py-3 font-semibold">Net</th>
              <th className="px-3 py-3 font-semibold">Extended</th>
              <th className="px-3 py-3 font-semibold" />
            </tr>
          </thead>
          <tbody>
            {quote.lineItems.map((item) => {
              const net = lineNet(item.listPrice, item.discountPct);
              return (
                <tr key={item.id} className="border-b border-line last:border-0">
                  <td className="px-3 py-3 font-medium">{item.product}</td>
                  <td className="px-3 py-3">
                    <input
                      className="h-11 w-20 rounded-md border border-line bg-paper px-2 tabular-nums"
                      type="number"
                      min={1}
                      disabled={!editable}
                      value={item.quantity}
                      aria-label={`Quantity for ${item.product}`}
                      onChange={(event) =>
                        updateLine(quote.id, item.id, { quantity: Math.max(1, Number(event.target.value) || 1) })
                      }
                    />
                  </td>
                  <td className="px-3 py-3 tabular-nums">{moneyExactFmt(item.listPrice)}</td>
                  <td className="px-3 py-3">
                    <input
                      className="h-11 w-20 rounded-md border border-line bg-paper px-2 tabular-nums"
                      type="number"
                      min={0}
                      max={90}
                      disabled={!editable}
                      value={item.discountPct}
                      aria-label={`Discount for ${item.product}`}
                      onChange={(event) =>
                        updateLine(quote.id, item.id, {
                          discountPct: Math.min(90, Math.max(0, Number(event.target.value) || 0)),
                        })
                      }
                    />
                  </td>
                  <td className="px-3 py-3 tabular-nums">{moneyExactFmt(net)}</td>
                  <td className="px-3 py-3 tabular-nums">{money(net * item.quantity)}</td>
                  <td className="px-3 py-3 text-right">
                    {editable && (
                      <button
                        type="button"
                        className="text-sm font-semibold text-rust"
                        onClick={() => removeLine(quote.id, item.id)}
                      >
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {editable && (
          <div className="flex flex-col gap-2 border-t border-line p-3 sm:flex-row">
            <select className={field} value={sku} onChange={(event) => setSku(event.target.value)} aria-label="Product to add">
              {CATALOG.map((item) => (
                <option key={item.sku} value={item.sku}>
                  {item.name} · {money(item.listPrice)}
                </option>
              ))}
            </select>
            <button
              type="button"
              className={cn(btn, "shrink-0 bg-paper-2 text-ink")}
              onClick={() => {
                const item = CATALOG.find((row) => row.sku === sku);
                if (!item) return;
                addLine(quote.id, {
                  id: crypto.randomUUID(),
                  product: item.name,
                  quantity: 1,
                  listPrice: item.listPrice,
                  discountPct: 0,
                });
              }}
            >
              Add product
            </button>
          </div>
        )}
      </section>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          className={cn(btn, "bg-card text-ink ring-1 ring-line")}
          aria-expanded={showReasoning}
          onClick={() => setShowReasoning((open) => !open)}
        >
          {showReasoning ? "Hide agent reasoning" : "Show agent reasoning"}
        </button>
        {editable && (
          <>
            <button type="button" className={cn(btn, "bg-card text-ink ring-1 ring-line")} onClick={() => start("preview")}>
              Preview the book
            </button>
            <button type="button" className={cn(btn, "bg-teal text-paper")} onClick={() => start("commit")} disabled={running || asking}>
              {asking ? "Agents are thinking…" : "Submit for approval"}
            </button>
          </>
        )}
        {quote.stage === "rejected" && (
          <button type="button" className={cn(btn, "bg-teal text-paper")} onClick={() => revise(quote.id)}>
            Revise quote
          </button>
        )}
        {quote.stage === "approved" && (
          <button type="button" className={cn(btn, "bg-teal text-paper")} onClick={() => advance(quote.id)}>
            Send to customer
          </button>
        )}
        {quote.stage === "sent" && (
          <button type="button" className={cn(btn, "bg-teal text-paper")} onClick={() => advance(quote.id)}>
            Mark signed by customer
          </button>
        )}
        {quote.stage === "signed" && (
          <button type="button" className={cn(btn, "bg-teal text-paper")} onClick={() => advance(quote.id)}>
            Convert to subscription
          </button>
        )}
        {quote.stage === "submitted" && (
          <Link to="/desk" className={cn(btn, "bg-brass text-paper")}>
            Open in Deal Desk
          </Link>
        )}
        {quote.stage === "converted" && (
          <p className="self-center text-sm text-ok">Subscription is live. Agents cleared this before it was sent.</p>
        )}
      </div>

      {showReasoning && <ReasoningPanel quote={quote} />}

      <details className="rounded-lg border border-line bg-card p-4 text-sm">
        <summary className="cursor-pointer font-semibold">Quote payload and stage history</summary>
        <ol className="mt-3 space-y-2">
          {quote.stageHistory.map((event, index) => (
            <li key={`${event.at}-${event.stage}-${index}`}>
              <span className="font-semibold">{stageLabel(event.stage)}</span>
              <span className="text-muted"> · {event.by} · {formatWhen(event.at)}</span>
              <p className="text-ink-soft">{event.note}</p>
            </li>
          ))}
        </ol>
        <pre className="mt-4 overflow-x-auto rounded-md bg-paper p-3 text-xs leading-relaxed text-ink-soft">
          {JSON.stringify(toPayload(quote), null, 2)}
        </pre>
      </details>
    </div>
  );
}

function ReasoningPanel({ quote }: { quote: Quote }) {
  const discountPolicy = useDealflow((state) => state.discountPolicy);
  const paymentPolicy = useDealflow((state) => state.paymentPolicy);
  const decision = previewDecision(quote);
  const file = commercialFile(quote);
  const sources = [
    `${discountPolicy.policyName} ${discountPolicy.version} (${discountPolicy.policyId}), owned by ${discountPolicy.owner}`,
    `${paymentPolicy.policyName} ${paymentPolicy.version} (${paymentPolicy.policyId}), owned by ${paymentPolicy.owner}`,
    file.years.length
      ? `Closed discount years: ${file.years.map((year) => year.year).join(", ")}`
      : "No installed discount. Peer new-logo deals are the comparison set.",
    file.credit
      ? file.credit.band === "Unscored"
        ? "Credit application. No invoices, so no dues file."
        : `Receivables file: ${file.credit.band}, overdue ${money(file.credit.overdue)}`
      : "No credit file",
    file.contracts.length ? `Contracts: ${file.contracts.map((row) => row.name).join(", ")}` : "No multi-year contract on file",
    "Quote notes are visible to people. They are not a data source for the label.",
  ];
  return (
    <section className="space-y-4">
      <div className="rounded-lg border border-line bg-card p-4">
        <h3 className="font-display text-2xl text-ink">Data sources</h3>
        <ul className="mt-3 space-y-2 text-sm text-ink-soft">
          {sources.map((source) => (
            <li key={source} className="border-l-2 border-teal pl-3">
              {source}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-ink">
          Orchestrator: {decision.rule}. {decision.overallDecision} at {decision.overallConfidence}%.
        </p>
        {decision.confidenceFormula && <p className="mt-2 text-sm text-pretty text-ink">{decision.confidenceFormula}</p>}
      </div>
      <DiscountDossier quote={quote} />
      <div className="grid gap-3 lg:grid-cols-2">
        {decision.specialists.map((agent) => (
          <AgentCard key={agent.agentName} agent={agent} open />
        ))}
      </div>
    </section>
  );
}

function DiscountDossier({ quote }: { quote: Quote }) {
  const file = commercialFile(quote);
  return (
    <section className="space-y-4 rounded-lg border border-teal bg-card p-4">
      <div>
        <p className="text-xs font-semibold tracking-widest text-teal uppercase">Discount & Pricing · looked this up</p>
        <h3 className="mt-1 font-display text-2xl text-ink">{file.posture}</h3>
        <p className="mt-2 text-sm text-pretty text-ink-soft">{file.discountLook}</p>
      </div>
      {file.years.length > 0 ? (
        <div className="overflow-x-auto">
          <p className="text-xs font-semibold tracking-widest text-muted uppercase">Historical discounts</p>
          <table className="mt-2 w-full min-w-max text-left text-sm">
            <thead className="text-xs text-muted">
              <tr>
                <th className="py-1 pr-3 font-semibold">Year</th>
                <th className="py-1 pr-3 font-semibold">Discount</th>
                <th className="py-1 pr-3 font-semibold">Terms</th>
                <th className="py-1 pr-3 font-semibold">Billing</th>
                <th className="py-1 font-semibold">ACV</th>
              </tr>
            </thead>
            <tbody>
              {file.years.map((year) => (
                <tr key={year.year} className="border-t border-line">
                  <td className="py-2 pr-3">{year.year}</td>
                  <td className="py-2 pr-3 tabular-nums">{pct(year.discountPct)}</td>
                  <td className="py-2 pr-3">{year.terms}</td>
                  <td className="py-2 pr-3">{year.billing}</td>
                  <td className="py-2 tabular-nums">{money(year.acv)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div>
          <p className="text-xs font-semibold tracking-widest text-muted uppercase">No installed discount · peer new logos</p>
          <ul className="mt-2 space-y-1 text-sm text-ink-soft">
            {file.peers.map((peer) => (
              <li key={peer.name}>
                {peer.name} · {pct(peer.discountPct)} · {peer.note}
              </li>
            ))}
          </ul>
        </div>
      )}
      {file.credit && (
        <div>
          <p className="text-xs font-semibold tracking-widest text-muted uppercase">
            {file.credit.band === "Unscored" ? "Credit · new business" : "Credit and dues"}
          </p>
          <p className="mt-1 text-sm text-ink">
            {file.credit.band}
            {file.credit.band !== "Unscored" &&
              ` · on time ${file.credit.onTimePct}% · DSO ${file.credit.dso} days · overdue ${money(file.credit.overdue)}`}
          </p>
          <p className="mt-1 text-sm text-ink-soft">{file.credit.note}</p>
        </div>
      )}
      <div>
        <p className="text-xs font-semibold tracking-widest text-muted uppercase">Multi-year contracts</p>
        {file.contracts.length === 0 ? (
          <p className="mt-1 text-sm text-ink-soft">None. This is not a multi-year relationship yet.</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm text-ink-soft">
            {file.contracts.map((contract) => (
              <li key={contract.name}>
                {contract.name} · {contract.term} · {pct(contract.discountPct)} · {contract.status}
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="border-l-2 border-teal pl-3 text-sm text-ink-soft">{file.cashLook}</p>
    </section>
  );
}

function DecisionPanel({ quote }: { quote: Quote }) {
  const decision = quote.decision;
  if (!decision) return null;
  const human = quote.humanActions.at(-1);
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="font-display text-2xl text-ink">Latest decision</h3>
        <DecisionBadge decision={decision.overallDecision} />
        <p className="text-sm text-muted tabular-nums">{decision.overallConfidence}% · {decision.engineMs} ms</p>
      </div>
      <p className="text-sm text-pretty text-ink-soft">{decision.finalComments}</p>
      <p className="text-sm text-ink">{decision.rule}</p>
      <AssignmentBanner assignment={decision.assignment} />
      {decision.noteAttack && (
        <p className="rounded-md border border-rust bg-rust-soft px-3 py-3 text-sm text-ink">
          Notes tried to steer the agents: “{decision.noteAttack}” They did not follow it. The label comes from the book and the guardrail.
        </p>
      )}
      {human && (
        <p className="rounded-md bg-paper-2 px-3 py-2 text-sm text-ink-soft">
          {human.actor} {human.action === "approve" ? "approved" : human.action === "reject" ? "rejected" : "returned"} this
          after the agents. {human.comment}
        </p>
      )}
      <div className="grid gap-3 lg:grid-cols-2">
        {decision.specialists.map((agent) => (
          <AgentCard key={agent.agentName} agent={agent} open={false} />
        ))}
      </div>
      <details className="text-sm">
        <summary className="cursor-pointer font-semibold text-teal">Audit trail</summary>
        <ul className="mt-2 space-y-1 text-ink-soft">
          {decision.audit.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        {quote.quoteDate && (
          <p className="mt-2 text-muted">Policy date on the quote: {formatDay(quote.quoteDate)}.</p>
        )}
      </details>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-card px-3 py-3">
      <p className="text-xs tracking-widest text-muted uppercase">{label}</p>
      <p className="mt-1 font-display text-2xl tabular-nums text-ink">{value}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-semibold tracking-widest text-muted uppercase">{label}</span>
      {children}
    </label>
  );
}
