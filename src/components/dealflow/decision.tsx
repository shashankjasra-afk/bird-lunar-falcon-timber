import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import type { AgentDecision, Assignment, Decision, FinalDecision } from "@/lib/dealflow/types";

const TONE: Record<Decision, string> = {
  Approve: "bg-ok-soft text-ok",
  Escalate: "bg-brass-soft text-brass",
  Reject: "bg-rust-soft text-rust",
};

const BORDER: Record<Decision, string> = {
  Approve: "border-ok",
  Escalate: "border-brass",
  Reject: "border-rust",
};

export function DecisionBadge({ decision }: { decision: Decision }) {
  return (
    <span className={cn("inline-flex h-7 items-center rounded-full px-3 text-xs font-semibold", TONE[decision])}>
      {decision}
    </span>
  );
}

export function AssignmentBanner({ assignment }: { assignment: Assignment | null | undefined }) {
  if (!assignment) return null;
  return (
    <div className="rounded-md border border-brass bg-brass-soft px-3 py-3 text-sm text-ink">
      <p>
        Assigned to: <span className="font-semibold">{assignment.assignee}</span>
        {" | "}SLA: {assignment.slaHours}h | Reason: {assignment.reason}
      </p>
      <p className="mt-1 text-ink-soft">
        Resolves to {assignment.externalId}. Queue {assignment.queue}. {assignment.integration} DealFlow writes this decision back. It does not replace the CPQ.
      </p>
    </div>
  );
}

export function AgentCard({ agent, open = true }: { agent: AgentDecision; open?: boolean }) {
  return (
    <article className={cn("rounded-lg border bg-card p-4", BORDER[agent.decision])}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold text-ink">{agent.agentName}</h3>
        <DecisionBadge decision={agent.decision} />
      </div>
      <p className="mt-3 text-sm text-muted">
        Confidence <span className="font-semibold text-ink tabular-nums">{agent.confidence}%</span>
      </p>
      {agent.formula && <p className="mt-2 text-sm text-pretty text-ink">{agent.formula}</p>}
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-paper-2">
        <div className="h-full rounded-full bg-teal" style={{ width: `${agent.confidence}%` }} />
      </div>
      <p className="mt-3 text-sm text-pretty text-ink-soft">{agent.comments}</p>
      {open && (
        <ul className="mt-3 space-y-2 text-sm text-ink-soft">
          {agent.reasoning.map((line) => (
            <li key={line} className="border-l-2 border-line pl-3">
              {line}
            </li>
          ))}
        </ul>
      )}
      {agent.cited.length > 0 && (
        <p className="mt-3 text-xs text-teal-deep">Cited: {agent.cited.join(" · ")}</p>
      )}
      {agent.flags.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {agent.flags.map((flag) => (
            <li key={flag} className="rounded-full bg-brass-soft px-2 py-1 text-xs font-medium text-brass">
              {flag}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

export function AgentTheater({
  decision,
  onDone,
}: {
  decision: FinalDecision;
  onDone: () => void;
}) {
  const [shown, setShown] = useState(1);
  const done = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    done.current = false;
    setShown(1);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setShown(decision.beats.length);
      return;
    }
    const timer = window.setInterval(() => {
      setShown((current) => Math.min(decision.beats.length, current + 1));
    }, 850);
    return () => window.clearInterval(timer);
  }, [decision]);

  useEffect(() => {
    if (shown < decision.beats.length || done.current) return;
    done.current = true;
    onDoneRef.current();
  }, [shown, decision.beats.length]);

  const discount = decision.specialists[0];
  const payment = decision.specialists[1];
  if (!discount || !payment) return null;

  return (
    <section className="rounded-lg border border-line bg-card p-4" aria-live="polite">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-xl text-ink">Agent loop</h3>
        <button
          type="button"
          className="h-11 rounded-md px-3 text-sm font-semibold text-teal"
          onClick={() => setShown(decision.beats.length)}
        >
          Skip to decision
        </button>
      </div>
      <ol className="mt-4 space-y-3">
        {decision.beats.slice(0, shown).map((beat, index) => (
          <li key={beat.id} className="text-sm">
            <p className="font-semibold text-ink">
              <span className="mr-2 text-muted tabular-nums">0{index + 1}</span>
              {beat.title}
            </p>
            <p className="mt-1 text-pretty text-ink-soft">{beat.body}</p>
          </li>
        ))}
      </ol>
      {shown >= 2 && (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <AgentCard agent={discount} />
          <AgentCard agent={payment} />
        </div>
      )}
      {shown >= 4 && (
        <p className={cn("mt-4 rounded-md px-3 py-3 text-sm font-semibold", TONE[decision.overallDecision])}>
          {decision.writeback}{" "}
          {decision.hop === "agents"
            ? `${decision.model ?? "The model"} used ${(decision.inputTokens ?? 0).toLocaleString("en-US")} input tokens and ${(decision.outputTokens ?? 0).toLocaleString("en-US")} output tokens.`
            : "The model did not answer, so the specialists closed the loop from the policy tools."}
        </p>
      )}
    </section>
  );
}
