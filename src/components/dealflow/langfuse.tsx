import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { reviewQuote } from "@/lib/dealflow/engine";
import { getLangfuseStatus, recordTraces } from "@/lib/dealflow/langfuse-run";
import { useDealflow } from "@/lib/dealflow/store";
import { rememberTraces, traceFromDecision } from "@/lib/dealflow/trace-row";

const btn =
  "inline-flex h-11 items-center justify-center rounded-md px-4 text-sm font-semibold transition-transform duration-150 ease-out active:scale-[0.96] disabled:opacity-50";

export function LangfusePanel() {
  const quotes = useDealflow((state) => state.quotes);
  const discount = useDealflow((state) => state.discountPolicy);
  const payment = useDealflow((state) => state.paymentPolicy);
  const settings = useDealflow((state) => state.settings);
  const log = useDealflow((state) => state.langfuseLog ?? []);
  const [status, setStatus] = useState<{ configured: boolean; host: string; publicKeyHint: string } | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const localReplay = useMemo(() => {
    return quotes
      .filter((quote) => quote.goldenExpected)
      .map((quote) => {
        const decision = reviewQuote(quote, discount, payment, settings);
        return {
          id: `local-${quote.id}`,
          quoteId: quote.id,
          account: quote.account.name,
          decision: decision.overallDecision,
          confidence: decision.overallConfidence,
          match: decision.overallDecision === quote.goldenExpected,
        };
      });
  }, [quotes, discount, payment, settings]);

  useEffect(() => {
    void getLangfuseStatus()
      .then(setStatus)
      .catch(() => setStatus({ configured: false, host: "https://cloud.langfuse.com", publicKeyHint: "" }));
  }, []);

  async function sendLabeled() {
    setSending(true);
    setNote(null);
    try {
      const labeled = quotes.filter((quote) => quote.goldenExpected);
      const rows = labeled.map((quote) => traceFromDecision(quote, reviewQuote(quote, discount, payment, settings)));
      const result = await recordTraces({ data: { rows } });
      rememberTraces(result, rows, useDealflow.getState().pushLangfuse);
      setNote(result.note);
    } catch {
      setNote("The trace call did not leave the browser.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-line bg-card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-display text-2xl text-ink">Langfuse</h2>
            <p className="mt-2 max-w-2xl text-sm text-pretty text-ink-soft">
              Each submit is an agent trace: a plan, two specialist thoughts, the orchestrator, and the guardrail. The model call is a generation. Scores on the trace are label match and whether a note was ignored.
            </p>
          </div>
          <button type="button" className={cn(btn, "bg-teal text-paper")} disabled={sending} onClick={() => void sendLabeled()}>
            {sending ? "Sending…" : "Trace the labeled set"}
          </button>
        </div>
        <p className="mt-4 text-sm text-ink">
          {status == null
            ? "Checking the Langfuse connection."
            : status.configured
              ? `Connected. Host ${status.host}. Key ${status.publicKeyHint}.`
              : "Not connected. Set LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY, and optionally LANGFUSE_BASE_URL. Traces still show here, marked not delivered."}
        </p>
        {status && (
          <p className="mt-1 text-sm text-muted">
            Project home: {status.host}
          </p>
        )}
        {note && <p className="mt-2 text-sm text-ink">{note}</p>}
      </section>

      <section className="grid gap-3 lg:grid-cols-3">
        <article className="rounded-lg border border-line bg-card p-4">
          <h3 className="font-semibold">discount-pricing</h3>
          <p className="mt-2 text-sm text-ink-soft">Agent. Reads the discount book and returns one label, a confidence, and the rule it cited. No model.</p>
        </article>
        <article className="rounded-lg border border-line bg-card p-4">
          <h3 className="font-semibold">payment-terms</h3>
          <p className="mt-2 text-sm text-ink-soft">Agent. Reads the cash book the same way. The orchestrator only combines the two labels.</p>
        </article>
        <article className="rounded-lg border border-line bg-card p-4">
          <h3 className="font-semibold">llm-judge / policy-extract</h3>
          <p className="mt-2 text-sm text-ink-soft">Generations. These are the only model calls. Each one records the model name and the token usage Langfuse uses for cost.</p>
        </article>
      </section>

      <section className="overflow-hidden rounded-lg border border-line bg-card">
        <h2 className="border-b border-line px-3 py-3 font-semibold">Traces from this browser</h2>
        {log.length === 0 ? (
          <div>
            <p className="px-3 py-3 text-sm text-ink-soft">
              {status?.configured
                ? "These nine rows are the live engine, scored in this browser. They are not in Langfuse until you trace the labeled set."
                : "Cloud delivery needs server keys. Until then this replay is local. It is the same nine golden hops the engine just scored. None of these rows were sent to Langfuse cloud."}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-max text-left text-sm">
                <thead className="border-b border-line text-xs tracking-widest text-muted uppercase">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Quote</th>
                    <th className="px-3 py-2 font-semibold">Account</th>
                    <th className="px-3 py-2 font-semibold">Label</th>
                    <th className="px-3 py-2 font-semibold">Confidence</th>
                    <th className="px-3 py-2 font-semibold">label_match</th>
                    <th className="px-3 py-2 font-semibold">Delivery</th>
                  </tr>
                </thead>
                <tbody>
                  {localReplay.map((row) => (
                    <tr key={row.id} className="border-b border-line last:border-0">
                      <td className="px-3 py-3 font-medium">{row.quoteId}</td>
                      <td className="px-3 py-3">{row.account}</td>
                      <td className="px-3 py-3">{row.decision}</td>
                      <td className="px-3 py-3 tabular-nums">{row.confidence}%</td>
                      <td className={cn("px-3 py-3 font-semibold", row.match ? "text-ok" : "text-rust")}>{row.match ? "1" : "0"}</td>
                      <td className="px-3 py-3 text-brass">Local replay</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-max text-left text-sm">
              <thead className="border-b border-line text-xs tracking-widest text-muted uppercase">
                <tr>
                  <th className="px-3 py-2 font-semibold">When</th>
                  <th className="px-3 py-2 font-semibold">Quote</th>
                  <th className="px-3 py-2 font-semibold">Kind</th>
                  <th className="px-3 py-2 font-semibold">Label</th>
                  <th className="px-3 py-2 font-semibold">Delivery</th>
                  <th className="px-3 py-2 font-semibold">Trace</th>
                </tr>
              </thead>
              <tbody>
                {log.map((event) => (
                  <tr key={event.id} className="border-b border-line last:border-0">
                    <td className="px-3 py-3 text-muted">{event.at.slice(11, 19)}</td>
                    <td className="px-3 py-3 font-medium">{event.quoteId}</td>
                    <td className="px-3 py-3">{event.kind}</td>
                    <td className="px-3 py-3">{event.decision}</td>
                    <td className={cn("px-3 py-3 font-semibold", event.delivered ? "text-ok" : "text-brass")}>
                      {event.delivered ? "Delivered" : "Local only"}
                    </td>
                    <td className="px-3 py-3 font-mono text-xs">{event.traceId || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
