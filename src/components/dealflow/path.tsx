import { cn } from "@/lib/cn";
import type { Stage } from "@/lib/dealflow/types";

const STEPS: { stage: Stage; label: string }[] = [
  { stage: "draft", label: "Draft" },
  { stage: "submitted", label: "Submit for approval" },
  { stage: "approved", label: "Approved" },
  { stage: "sent", label: "Sent to customer" },
  { stage: "signed", label: "Signed by customer" },
  { stage: "converted", label: "Converted" },
];

export function pathIndex(stage: Stage): number {
  if (stage === "rejected") return 1;
  const index = STEPS.findIndex((step) => step.stage === stage);
  return index === -1 ? 0 : index;
}

export function QuotePath({
  stage,
  hold = "none",
}: {
  stage: Stage;
  hold?: "none" | "desk" | "rejected" | "running";
}) {
  const current = pathIndex(stage);
  const caption =
    hold === "running"
      ? "Agents are writing the stage. Approve moves the quote to Approved. Escalate leaves it on Submit for approval for Deal Desk. Reject stops the path."
      : hold === "rejected"
        ? "Agents stopped this quote. It never reached Approved. The seller can revise and submit again."
        : hold === "desk"
          ? "Agents held this quote on Submit for approval. Deal Desk has to write the next stage."
          : "The seller presses Submit for approval. Agents write the next stage. Sending, signing, and converting stay with the seller.";

  return (
    <div>
      <ol className="space-y-1 sm:hidden" aria-label="Quote stage">
        {STEPS.map((step, index) => {
          const tone = toneFor(index, current, hold);
          return (
            <li key={step.stage}>
              {index === 2 && (
                <p className="my-1 rounded-md border border-teal bg-teal-soft px-3 py-2 text-xs font-semibold text-teal-deep">
                  Agents write this hop — Submit for approval to Approved
                </p>
              )}
              <div
                aria-current={index === current ? "step" : undefined}
                className={cn("flex h-11 items-center rounded-md px-3 text-sm font-semibold", tone)}
              >
                {step.label}
              </div>
            </li>
          );
        })}
      </ol>
      <div className="hidden overflow-x-auto pb-1 sm:block">
        <ol className="flex min-w-full" aria-label="Quote stage">
          {STEPS.map((step, index) => {
            const tone = toneFor(index, current, hold);
            return (
              <li
                key={step.stage}
                aria-current={index === current ? "step" : undefined}
                className={cn(
                  "flex h-16 min-w-0 flex-1 items-center justify-center px-4 text-center text-sm font-semibold leading-tight",
                  index === 0 ? "stage-chevron-first" : "stage-chevron -ml-2",
                  tone,
                )}
              >
                <span className="max-w-36">{step.label}</span>
              </li>
            );
          })}
        </ol>
      </div>
      <div className="mt-2 hidden sm:grid sm:grid-cols-6">
        <div className="col-span-2 col-start-2 rounded-md border border-teal bg-teal-soft px-2 py-2 text-center text-xs font-semibold text-teal-deep">
          Agents write this hop
        </div>
      </div>
      <p className="mt-2 text-sm text-pretty text-muted">{caption}</p>
    </div>
  );
}

function toneFor(index: number, current: number, hold: "none" | "desk" | "rejected" | "running"): string {
  if (index === current && hold === "rejected") return "bg-rust text-paper";
  if (index === current && hold === "desk") return "bg-brass text-paper";
  if (index === current && hold === "running") return "stage-running bg-teal text-paper";
  if (index === current) return "bg-teal-deep text-paper";
  if (index < current) return "bg-teal text-paper";
  return "bg-paper-2 text-muted";
}
