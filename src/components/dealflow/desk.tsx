import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AgentCard, AssignmentBanner, DecisionBadge } from "@/components/dealflow/decision";
import { cn } from "@/lib/cn";
import { formatWhen, money, pct, quoteTotals, stageLabel } from "@/lib/dealflow/format";
import { DESK_LEAD, useDealflow } from "@/lib/dealflow/store";
import type { Quote, Stage } from "@/lib/dealflow/types";

type Tab = "desk" | "approved" | "rejected" | "later";

const TABS: { id: Tab; label: string }[] = [
  { id: "desk", label: "Needs a person" },
  { id: "approved", label: "Approved by agents" },
  { id: "rejected", label: "Rejected by agents" },
  { id: "later", label: "Sent, signed, converted" },
];

function inTab(quote: Quote, tab: Tab): boolean {
  if (tab === "desk") return quote.stage === "submitted";
  if (tab === "approved") return quote.stage === "approved";
  if (tab === "rejected") return quote.stage === "rejected";
  return quote.stage === "sent" || quote.stage === "signed" || quote.stage === "converted";
}

function companyPulse(quotes: Quote[]) {
  const reviewed = quotes.filter((quote) => quote.decision);
  const sum = reviewed.reduce((total, quote) => total + (quote.decision?.engineMs ?? 0), 0);
  return {
    reviewed: reviewed.length,
    approved: reviewed.filter((quote) => quote.decision?.overallDecision === "Approve").length,
    escalated: reviewed.filter((quote) => quote.decision?.overallDecision === "Escalate").length,
    rejected: reviewed.filter((quote) => quote.decision?.overallDecision === "Reject").length,
    human: quotes.filter((quote) => quote.humanActions.length > 0).length,
    avgMs: reviewed.length ? Math.round(sum / reviewed.length) : 0,
  };
}

const btn =
  "inline-flex h-11 items-center justify-center rounded-md px-4 text-sm font-semibold transition-transform duration-150 ease-out active:scale-[0.96] disabled:opacity-50";

export function DeskWorkspace() {
  const quotes = useDealflow((state) => state.quotes);
  const humanDecide = useDealflow((state) => state.humanDecide);
  const select = useDealflow((state) => state.select);
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("desk");
  const [activeId, setActiveId] = useState("Q-2026-1013");
  const [comment, setComment] = useState("Terms are acceptable for this account. Approving the cash exception.");

  const rows = quotes.filter((quote) => inTab(quote, tab));
  const active = rows.find((quote) => quote.id === activeId) ?? rows[0];
  const pulse = companyPulse(quotes);
  const writes = quotes
    .filter((quote) => quote.decision)
    .slice()
    .sort((a, b) => (b.submittedAt ?? "").localeCompare(a.submittedAt ?? ""));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl text-ink">Approvals</h1>
        <p className="mt-1 max-w-2xl text-sm text-pretty text-muted">
          What {DESK_LEAD} and the rest of the company see after agents write a stage. Auto-approvals never enter a human queue. Escalations do.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Pulse label="Reviewed" value={String(pulse.reviewed)} />
        <Pulse label="Agent approved" value={String(pulse.approved)} />
        <Pulse label="Held for desk" value={String(pulse.escalated)} />
        <Pulse label="Agent rejected" value={String(pulse.rejected)} />
        <Pulse label="Human actions" value={String(pulse.human)} />
        <Pulse label="Avg engine" value={`${pulse.avgMs} ms`} />
      </div>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Approval queue">
        {TABS.map((item) => {
          const count = quotes.filter((quote) => inTab(quote, item.id)).length;
          return (
            <button
              key={item.id}
              type="button"
              className={cn(btn, "touch-manipulation", tab === item.id ? "bg-teal text-paper" : "bg-card text-ink ring-1 ring-line")}
              onClick={() => setTab(item.id)}
            >
              {item.label} · {count}
            </button>
          );
        })}
      </div>
      <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <ul className="space-y-2">
          {rows.map((quote) => {
            const totals = quoteTotals(quote);
            return (
              <li key={quote.id}>
                <button
                  type="button"
                  onClick={() => setActiveId(quote.id)}
                  className={cn(
                    "w-full rounded-lg border px-3 py-3 text-left",
                    active?.id === quote.id ? "border-teal bg-teal-soft" : "border-line bg-card",
                  )}
                >
                  <p className="font-semibold">{quote.account.name}</p>
                  <p className="text-xs text-muted">
                    {quote.id} · {stageLabel(quote.stage)}
                  </p>
                  {quote.decision?.assignment && (
                    <p className="mt-1 text-xs font-semibold text-brass">
                      {quote.decision.assignment.assignee} · {quote.decision.assignment.slaHours}h
                    </p>
                  )}
                  <p className="mt-1 text-sm tabular-nums text-ink-soft">
                    {money(totals.net)} · {pct(totals.discount)}
                  </p>
                </button>
              </li>
            );
          })}
          {rows.length === 0 && <li className="text-sm text-muted">Nothing in this queue.</li>}
        </ul>
        {active?.decision ? (
          <article className="space-y-4">
            <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold tracking-widest text-teal uppercase">{active.id}</p>
                <h2 className="font-display text-3xl">{active.account.name}</h2>
                <p className="text-sm text-muted">
                  {active.type} · {active.seller.name} · {active.paymentTerms} · {active.billingFrequency}
                </p>
              </div>
              <DecisionBadge decision={active.decision.overallDecision} />
            </header>
            <p className="text-sm text-pretty text-ink-soft">{active.decision.finalComments}</p>
            <AssignmentBanner assignment={active.decision.assignment} />
            {active.decision.noteAttack && (
              <p className="rounded-md border border-rust bg-rust-soft px-3 py-3 text-sm text-ink">
                Notes tried to steer the agents: “{active.decision.noteAttack}” They did not follow it.
              </p>
            )}
            <div className="grid gap-3 lg:grid-cols-2">
              {active.decision.specialists.map((agent) => (
                <AgentCard key={agent.agentName} agent={agent} />
              ))}
            </div>
            <ul className="space-y-1 text-sm text-ink-soft">
              {active.decision.actions.map((action) => (
                <li key={action}>{action}</li>
              ))}
            </ul>
            {tab === "desk" && (
              <form
                className="space-y-3 rounded-lg border border-line bg-card p-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  humanDecide(active.id, "approve", comment);
                }}
              >
                <h3 className="font-semibold">
                  {active.decision.assignment
                    ? `Decision on the ${active.decision.assignment.assignee} queue`
                    : "Deal Desk decision"}
                </h3>
                <label className="block text-sm">
                  <span className="mb-1 block text-xs font-semibold tracking-widest text-muted uppercase">Note</span>
                  <textarea
                    className="min-h-20 w-full rounded-md border border-line bg-paper px-3 py-2"
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                  />
                </label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button type="submit" className={cn(btn, "bg-teal text-paper")}>
                    Approve override
                  </button>
                  <button
                    type="button"
                    className={cn(btn, "bg-rust text-paper")}
                    onClick={() => humanDecide(active.id, "reject", comment)}
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    className={cn(btn, "bg-card text-ink ring-1 ring-line")}
                    onClick={() => humanDecide(active.id, "return", comment)}
                  >
                    Return to seller
                  </button>
                </div>
              </form>
            )}
            {active.humanActions.length > 0 && (
              <ul className="space-y-2 text-sm">
                {active.humanActions.map((action) => (
                  <li key={action.at} className="rounded-md bg-paper-2 px-3 py-2">
                    <span className="font-semibold">{action.actor}</span> {action.action} · {formatWhen(action.at)}
                    <p>{action.comment}</p>
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              className="text-sm font-semibold text-teal"
              onClick={() => {
                select(active.id);
                void navigate({ to: "/" });
              }}
            >
              Open the quote record
            </button>
          </article>
        ) : (
          <p className="text-sm text-muted">Select a quote that agents have already reviewed.</p>
        )}
      </div>
      <section className="overflow-x-auto rounded-lg border border-line bg-card">
        <table className="w-full min-w-max text-left text-sm">
          <caption className="px-3 py-3 text-left text-xs font-semibold tracking-widest text-muted uppercase">
            Agent write-backs on the book
          </caption>
          <thead className="border-b border-line text-xs tracking-widest text-muted uppercase">
            <tr>
              <th className="px-3 py-2 font-semibold">Quote</th>
              <th className="px-3 py-2 font-semibold">Account</th>
              <th className="px-3 py-2 font-semibold">Agents</th>
              <th className="px-3 py-2 font-semibold">Stage now</th>
              <th className="px-3 py-2 font-semibold">Written by</th>
            </tr>
          </thead>
          <tbody>
            {writes.map((quote) => (
              <tr key={quote.id} className="border-b border-line last:border-0">
                <td className="px-3 py-3 font-medium">{quote.id}</td>
                <td className="px-3 py-3">{quote.account.name}</td>
                <td className="px-3 py-3">
                  {quote.decision ? <DecisionBadge decision={quote.decision.overallDecision} /> : "—"}
                </td>
                <td className="px-3 py-3">{stageLabel(quote.stage)}</td>
                <td className="px-3 py-3 text-ink-soft">DealFlow Orchestrator</td>
              </tr>
            ))}
            {writes.length === 0 && (
              <tr>
                <td className="px-3 py-3 text-muted" colSpan={5}>
                  No agent write-backs yet. Submit a draft from Quotes.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

export function stageCount(quotes: Quote[], stage: Stage): number {
  return quotes.filter((quote) => quote.stage === stage).length;
}

function Pulse({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-card px-3 py-3">
      <p className="text-xs tracking-widest text-muted uppercase">{label}</p>
      <p className="mt-1 font-display text-2xl tabular-nums text-ink">{value}</p>
    </div>
  );
}
