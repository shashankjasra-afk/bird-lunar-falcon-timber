import { useEffect, useState } from "react";
import { DecisionBadge } from "@/components/dealflow/decision";
import { Diagram } from "@/components/dealflow/flow";
import { cn } from "@/lib/cn";
import { money, pct, quoteTotals } from "@/lib/dealflow/format";
import { previewDecision, useDealflow } from "@/lib/dealflow/store";
import { runLangGraph, type GraphResult } from "@/lib/dealflow/graph-run";
import type { Decision, FinalDecision, Quote } from "@/lib/dealflow/types";

const DEMOS = ["Q-2026-1001", "Q-2026-1003", "Q-2026-1002", "Q-2026-1009"] as const;

const CREW_FLOW = `flowchart TD
  Seller["Seller hits Submit for approval"] --> Orch["Orchestrator plans the hop"]
  Orch --> Disc["Discount agent reads the discount book"]
  Orch --> Pay["Payment agent reads the cash book"]
  Disc --> Combine["Orchestrator keeps the stricter label"]
  Pay --> Combine
  Combine --> Guard{"Guardrail"}
  Guard -->|"Note tried to force Approve"| Hold["Escalate to a named person and an SLA"]
  Guard -->|"Label is sound"| Write{"One label"}
  Write -->|Approve| Done["Approved. Seller sends the quote"]
  Write -->|"Escalate or Reject"| Hold
`;

const CREW = [
  {
    id: "orch",
    name: "Orchestrator",
    job: "Starts the hop, waits for both specialists, and writes the one label that goes back to the CPQ.",
  },
  {
    id: "discount",
    name: "Discount agent",
    job: "Reads the discount book for this segment and quote type. It never sees the notes as instructions.",
  },
  {
    id: "payment",
    name: "Payment agent",
    job: "Reads the cash book: payment terms and billing frequency. A worse term than last year is a hold.",
  },
] as const;

type Who = "seller" | "orch" | "discount" | "payment" | "guard";

interface Step {
  who: Who;
  title: string;
  body: string;
  lines: string[];
  decision?: Decision;
  confidence?: number;
  cited?: string[];
}

function stepsFor(quote: Quote, decision: FinalDecision): Step[] {
  const totals = quoteTotals(quote);
  const discount = decision.specialists[0];
  const payment = decision.specialists[1];
  const end =
    decision.overallDecision === "Approve"
      ? `The orchestrator writes Approved. The seller can now send the quote. The agents are done.`
      : decision.assignment
        ? `The orchestrator does not approve. Assigned to: ${decision.assignment.assignee} | SLA: ${decision.assignment.slaHours}h | Reason: ${decision.assignment.reason}`
        : `The orchestrator writes ${decision.overallDecision} and returns the quote.`;

  return [
    {
      who: "seller",
      title: "1 · Seller, before any agent",
      body: `${quote.seller.name} still owns ${quote.id}. ${quote.account.name} is ${quote.account.segment} ${quote.type}. Net ${money(totals.net)}, discount ${pct(totals.discount)}, ${quote.paymentTerms}, ${quote.billingFrequency}. Nothing has been submitted.`,
      lines: ["This step is the CPQ. None of the three agents are in it."],
    },
    {
      who: "orch",
      title: "2 · Orchestrator opens the hop",
      body: `Submit for approval is the only moment the crew starts. The orchestrator plans two tool calls, then one label. ${decision.noteAttack ? `The notes tried to steer the crew (“${decision.noteAttack}”). That line is flagged, not followed.` : "The notes have no instruction in them."}`,
      lines: ["Discount agent and payment agent have not spoken yet.", "Sent, signed, and converted are still later, and they stay with the seller."],
    },
    {
      who: "discount",
      title: "3 · Discount agent",
      body: discount?.comments ?? "The discount agent did not return a reading.",
      lines: discount?.reasoning ?? [],
      decision: discount?.decision,
      confidence: discount?.confidence,
      cited: discount?.cited,
    },
    {
      who: "payment",
      title: "4 · Payment agent",
      body: payment?.comments ?? "The payment agent did not return a reading.",
      lines: payment?.reasoning ?? [],
      decision: payment?.decision,
      confidence: payment?.confidence,
      cited: payment?.cited,
    },
    {
      who: "orch",
      title: "5 · Orchestrator combines them",
      body: `${decision.rule}. ${decision.finalComments} Reject is stricter than Escalate. Escalate is stricter than Approve. One label only.`,
      lines: [
        `Discount agent said ${discount?.decision ?? "—"}.`,
        `Payment agent said ${payment?.decision ?? "—"}.`,
        `Orchestrator writes ${decision.overallDecision} at ${decision.overallConfidence}%.`,
      ],
      decision: decision.overallDecision,
      confidence: decision.overallConfidence,
    },
    {
      who: "guard",
      title: "6 · Guardrail, not a fourth agent",
      body: decision.noteAttack
        ? `The notes asked for an approval. The guardrail checks that the crew did not Approve. This quote is ${decision.overallDecision}, so the note did not win.`
        : "No note tried to steer this quote. The guardrail still checks that the label is no looser than the two book readings, and that a policy rule was cited.",
      lines: decision.noteAttack
        ? ["If the crew had said Approve, this step would force Escalate."]
        : ["This step does not pick a new commercial label. It only blocks an unsafe one."],
    },
    {
      who: "orch",
      title: "7 · Orchestrator writes one stage",
      body: end,
      lines: [decision.writeback],
      decision: decision.overallDecision,
    },
  ];
}

export function AgentsDemo() {
  const quotes = useDealflow((state) => state.quotes);
  const choices = DEMOS.map((id) => quotes.find((quote) => quote.id === id)).filter((quote): quote is Quote => Boolean(quote));
  const [quoteId, setQuoteId] = useState(choices[0]?.id ?? "");
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [graph, setGraph] = useState<GraphResult | null>(null);
  const [graphNote, setGraphNote] = useState("Asking the Python graph.");
  const quote = choices.find((row) => row.id === quoteId) ?? choices[0];
  const decision = quote ? previewDecision(quote) : null;
  const steps = quote && decision ? stepsFor(quote, decision) : [];
  const current = steps[step];

  useEffect(() => {
    if (!quote) return;
    let cancel = false;
    setGraphNote("Asking the Python graph.");
    const state = useDealflow.getState();
    void runLangGraph({
      data: {
        quote,
        discountPolicy: state.discountPolicy,
        paymentPolicy: state.paymentPolicy,
        settings: state.settings,
      },
    })
      .then((result) => {
        if (cancel) return;
        setGraph(result.graph);
        setGraphNote(result.note);
      })
      .catch(() => {
        if (!cancel) setGraphNote("The Python graph did not answer.");
      });
    return () => {
      cancel = true;
    };
  }, [quote]);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setStep((value) => {
        if (value >= steps.length - 1) {
          setPlaying(false);
          return value;
        }
        return value + 1;
      });
    }, 1600);
    return () => window.clearInterval(timer);
  }, [playing, steps.length]);

  if (!quote || !decision || !current) return null;

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-line bg-card p-4">
        <h1 className="font-display text-3xl text-ink">The three agents</h1>
        <p className="mt-2 max-w-3xl text-sm text-ink-soft">
          The crew runs in Python. LangGraph orders the three agents. Pydantic checks each node before the next one starts. CrewAI was the other option. This build uses LangGraph.
        </p>
        <Diagram chart={CREW_FLOW} label="Flowchart of the orchestrator, discount agent, and payment agent" />
        <div className="mt-4 rounded-lg border border-line bg-paper p-3">
          <p className="text-xs font-semibold tracking-widest text-teal uppercase">Live graph</p>
          <p className="mt-1 text-sm text-ink">{graphNote}</p>
          {graph && (
            <ol className="mt-3 space-y-2 text-sm text-ink-soft">
              {graph.nodes.map((node, index) => (
                <li key={`${node.node}-${index}`} className="border-l-2 border-teal pl-3">
                  <span className="font-semibold text-ink">{node.node}</span>
                  <span className="mt-1 block">{node.summary}</span>
                </li>
              ))}
            </ol>
          )}
          {graph && (
            <p className="mt-3 text-sm font-semibold text-ink">
              Pydantic result: {graph.overall} at {graph.confidence}%. {graph.rule}
            </p>
          )}
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {CREW.map((agent) => {
            const on = current.who === agent.id;
            return (
              <article key={agent.id} className={cn("rounded-lg border p-3", on ? "border-teal bg-teal/10" : "border-line bg-paper")}>
                <p className="text-xs font-semibold tracking-widest text-teal uppercase">{on ? "Working now" : "Waiting"}</p>
                <h2 className="mt-1 text-lg font-semibold text-ink">{agent.name}</h2>
                <p className="mt-1 text-sm text-ink-soft">{agent.job}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="rounded-lg border border-line bg-card p-4">
        <label className="block text-sm font-semibold text-ink" htmlFor="demo-quote">
          Real quote
        </label>
        <select
          id="demo-quote"
          className="mt-2 h-11 w-full rounded-md border border-line bg-paper px-3 text-sm text-ink"
          value={quote.id}
          onChange={(event) => {
            setQuoteId(event.target.value);
            setStep(0);
            setPlaying(false);
          }}
        >
          {choices.map((row) => (
            <option key={row.id} value={row.id}>
              {row.id} · {row.account.name} · {row.scenario}
            </option>
          ))}
        </select>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className="inline-flex h-11 items-center rounded-md bg-teal px-4 text-sm font-semibold text-paper"
            onClick={() => {
              if (step >= steps.length - 1) setStep(0);
              setPlaying(true);
            }}
          >
            {playing ? "Playing" : "Play the hop"}
          </button>
          <button
            type="button"
            className="inline-flex h-11 items-center rounded-md bg-paper px-4 text-sm font-semibold text-ink ring-1 ring-line"
            onClick={() => {
              setPlaying(false);
              setStep((value) => Math.max(0, value - 1));
            }}
          >
            Back
          </button>
          <button
            type="button"
            className="inline-flex h-11 items-center rounded-md bg-paper px-4 text-sm font-semibold text-ink ring-1 ring-line"
            onClick={() => {
              setPlaying(false);
              setStep((value) => Math.min(steps.length - 1, value + 1));
            }}
          >
            Next step
          </button>
        </div>
        <ol className="mt-4 grid gap-2 sm:grid-cols-2">
          {steps.map((item, index) => (
            <li key={item.title}>
              <button
                type="button"
                className={cn(
                  "w-full rounded-md px-3 py-2 text-left text-sm",
                  index === step ? "bg-teal text-paper" : "bg-paper text-ink ring-1 ring-line",
                )}
                onClick={() => {
                  setPlaying(false);
                  setStep(index);
                }}
              >
                {item.title}
              </button>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-lg border border-line bg-card p-4" aria-live="polite">
        <p className="text-xs font-semibold tracking-widest text-teal uppercase">
          {current.who === "seller"
            ? "No agent yet"
            : current.who === "guard"
              ? "After the three agents"
              : current.who === "orch"
                ? "Orchestrator"
                : current.who === "discount"
                  ? "Discount agent"
                  : "Payment agent"}
        </p>
        <h2 className="mt-1 font-display text-2xl text-ink">{current.title}</h2>
        {current.decision && (
          <p className="mt-3 flex items-center gap-2 text-sm text-ink">
            <DecisionBadge decision={current.decision} />
            {typeof current.confidence === "number" && <span>{current.confidence}% confidence</span>}
          </p>
        )}
        <p className="mt-3 text-sm text-pretty text-ink-soft">{current.body}</p>
        <ul className="mt-3 space-y-2 text-sm text-ink-soft">
          {current.lines.map((line) => (
            <li key={line} className="border-l-2 border-line pl-3">
              {line}
            </li>
          ))}
        </ul>
        {current.cited && current.cited.length > 0 && (
          <p className="mt-3 text-xs text-teal-deep">Cited: {current.cited.join(" · ")}</p>
        )}
      </section>
    </div>
  );
}
