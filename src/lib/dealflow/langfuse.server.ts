import { readFileSync } from "node:fs";
import { join } from "node:path";
import { trace } from "@opentelemetry/api";
import { LangfuseClient } from "@langfuse/client";
import { LangfuseSpanProcessor } from "@langfuse/otel";
import { propagateAttributes, startActiveObservation } from "@langfuse/tracing";
import { BasicTracerProvider } from "@opentelemetry/sdk-trace-base";
import type { LangfuseTraceInput } from "@/lib/dealflow/types";

let processor: LangfuseSpanProcessor | null = null;
let client: LangfuseClient | null = null;
let registered = false;

function applyFileEnv() {
  if (process.env.LANGFUSE_BASE_URL && !process.env.LANGFUSE_HOST) {
    process.env.LANGFUSE_HOST = process.env.LANGFUSE_BASE_URL;
  }
  if (process.env.LANGFUSE_PUBLIC_KEY && process.env.LANGFUSE_SECRET_KEY) return;
  try {
    const text = readFileSync(join(process.cwd(), ".env.langfuse"), "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // No local key file. Process env is the only source.
  }
  if (process.env.LANGFUSE_BASE_URL && !process.env.LANGFUSE_HOST) {
    process.env.LANGFUSE_HOST = process.env.LANGFUSE_BASE_URL;
  }
}

function credentials() {
  applyFileEnv();
  return {
    publicKey: process.env.LANGFUSE_PUBLIC_KEY ?? "",
    secretKey: process.env.LANGFUSE_SECRET_KEY ?? "",
    baseUrl: (process.env.LANGFUSE_BASE_URL || "https://cloud.langfuse.com").replace(/\/$/, ""),
  };
}

export function langfuseStatus() {
  const creds = credentials();
  const hint = creds.publicKey.length > 12 ? `${creds.publicKey.slice(0, 8)}…${creds.publicKey.slice(-4)}` : "";
  return {
    configured: Boolean(creds.publicKey && creds.secretKey),
    host: creds.baseUrl,
    publicKeyHint: hint,
  };
}

function boot(): LangfuseSpanProcessor | null {
  if (processor && client) return processor;
  const creds = credentials();
  if (!creds.publicKey || !creds.secretKey) return null;
  try {
    processor = new LangfuseSpanProcessor({
      exportMode: "immediate",
      publicKey: creds.publicKey,
      secretKey: creds.secretKey,
      baseUrl: creds.baseUrl,
      environment: "development",
    });
    if (!registered) {
      const provider = new BasicTracerProvider({ spanProcessors: [processor] });
      trace.setGlobalTracerProvider(provider);
      registered = true;
    }
    client = new LangfuseClient({
      publicKey: creds.publicKey,
      secretKey: creds.secretKey,
      baseUrl: creds.baseUrl,
    });
    return processor;
  } catch {
    processor = null;
    client = null;
    return null;
  }
}

export async function emitDealflowTraces(rows: LangfuseTraceInput[]): Promise<{
  delivered: boolean;
  host: string;
  note: string;
  traces: { quoteId: string; traceId: string }[];
}> {
  const status = langfuseStatus();
  if (!status.configured) {
    return {
      delivered: false,
      host: status.host,
      note: "Langfuse keys are not set. The trace was recorded here only. Add LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY to deliver it.",
      traces: rows.map((row) => ({ quoteId: row.quoteId, traceId: "" })),
    };
  }
  const active = boot();
  if (!active || !client) {
    return {
      delivered: false,
      host: status.host,
      note: "Langfuse is configured, but the tracer did not start. The trace stayed on this page.",
      traces: rows.map((row) => ({ quoteId: row.quoteId, traceId: "" })),
    };
  }

  const traces: { quoteId: string; traceId: string }[] = [];
  try {
    for (const row of rows) {
      const traceId = await startActiveObservation("dealflow.approval", async (span) => {
        span.otelSpan.setAttribute("user.id", (row.sellerId || row.account).slice(0, 200));
        span.otelSpan.setAttribute("session.id", row.quoteId.slice(0, 200));
        return propagateAttributes(
          {
            userId: (row.sellerId || row.account).slice(0, 200),
            sessionId: row.quoteId.slice(0, 200),
            traceName: "dealflow.approval",
            tags: ["dealflow", "approval", (row.segment || "unknown").toLowerCase()],
            environment: "development",
            metadata: { feature: "approval-hop" },
          },
          async () => {
            span.update({
              input: {
                quoteId: row.quoteId,
                account: row.account,
                segment: row.segment,
                expected: row.expected,
              },
              output: {
                decision: row.decision,
                confidence: row.confidence,
                rule: row.rule,
                assignee: row.assignee,
                slaHours: row.slaHours,
              },
            });
            const books = row.specialists.length
              ? row.specialists
              : [
                  { name: "discount-pricing" as const, decision: row.decision, confidence: row.confidence, cited: row.cited.slice(0, 2) },
                  { name: "payment-terms" as const, decision: row.decision, confidence: row.confidence, cited: row.cited.slice(0, 2) },
                ];
            for (const book of books) {
              const agent = span.startObservation(
                book.name,
                {
                  input: { quoteId: row.quoteId, segment: row.segment },
                  output: { decision: book.decision, confidence: book.confidence, cited: book.cited },
                },
                { asType: "agent" },
              );
              agent.end();
            }
            const orchestrator = span.startObservation(
              "approval-orchestrator",
              {
                input: { books: books.map((book) => book.decision) },
                output: { decision: row.decision, rule: row.rule, engineMs: row.engineMs },
              },
              { asType: "agent" },
            );
            orchestrator.end();
            const guard = span.startObservation(
              "output-guardrail",
              {
                input: { noteTriedToSteer: Boolean(row.noteAttack) },
                output: { decision: row.decision, blockedApprove: Boolean(row.noteAttack) && row.decision !== "Approve" },
              },
              { asType: "guardrail" },
            );
            guard.end();
            return span.traceId;
          },
        );
      });
      const labelMatch = row.expected == null ? 1 : row.expected === row.decision ? 1 : 0;
      client.score.create({
        traceId,
        name: "label_match",
        value: labelMatch,
        dataType: "BOOLEAN",
        comment: row.expected ? `Expected ${row.expected}, engine said ${row.decision}.` : "No golden label.",
      });
      client.score.create({
        traceId,
        name: "note_ignored",
        value: !row.noteAttack || row.decision !== "Approve" ? 1 : 0,
        dataType: "BOOLEAN",
        comment: row.noteAttack ? "Notes tried to steer the hop." : "No instruction in the notes.",
      });
      traces.push({ quoteId: row.quoteId, traceId });
    }
    await client.flush();
    await active.forceFlush();
    return {
      delivered: true,
      host: status.host,
      note: `Delivered ${traces.length} trace${traces.length === 1 ? "" : "s"} to Langfuse.`,
      traces,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Langfuse rejected the batch.";
    return {
      delivered: false,
      host: status.host,
      note: message.slice(0, 180),
      traces: rows.map((row) => ({ quoteId: row.quoteId, traceId: "" })),
    };
  }
}

export async function runTracedModel<T>(args: {
  name: "policy-extract" | "llm-judge" | "approval-agents";
  userId: string;
  sessionId: string;
  segment: string;
  model: string;
  messages: { role: "system" | "user" | "assistant"; content: string }[];
  run: () => Promise<{ output: string; inputTokens: number; outputTokens: number; value: T }>;
}): Promise<{ value: T; traceId: string | null }> {
  const active = boot();
  if (!active) {
    const ran = await args.run();
    return { value: ran.value, traceId: null };
  }
  const userId = args.userId.slice(0, 200);
  const sessionId = args.sessionId.slice(0, 200);
  const traced = await propagateAttributes(
    {
      userId,
      sessionId,
      traceName: args.name,
      tags: ["dealflow", args.name, (args.segment || "unknown").toLowerCase()],
      environment: "development",
    },
    () =>
      startActiveObservation(
        args.name,
        async (generation) => {
          generation.otelSpan.setAttribute("user.id", userId);
          generation.otelSpan.setAttribute("session.id", sessionId);
          generation.update({
            model: args.model,
            input: args.messages.map((message) => ({ role: message.role, content: message.content.slice(0, 6000) })),
          });
          const ran = await args.run();
          generation.update({
            output: { role: "assistant", content: ran.output.slice(0, 4000) },
            usageDetails: { input: ran.inputTokens, output: ran.outputTokens },
          });
          return { value: ran.value, traceId: generation.traceId };
        },
        { asType: "generation" },
      ),
  );
  await active.forceFlush();
  return traced;
}
