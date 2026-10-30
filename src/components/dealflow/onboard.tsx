import { useState } from "react";
import { cn } from "@/lib/cn";
import { extractPolicyDocument } from "@/lib/dealflow/extract-policy";
import { applyPolicyPatch } from "@/lib/dealflow/parse-policy";
import { SAMPLE_POLICY_TEXT } from "@/lib/dealflow/policies";
import { useDealflow } from "@/lib/dealflow/store";

const field =
  "w-full rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal";
const btn =
  "inline-flex h-11 items-center justify-center rounded-md px-4 text-sm font-semibold transition-transform duration-150 ease-out active:scale-[0.96] disabled:opacity-50";

export function OnboardPanel() {
  const discountPolicy = useDealflow((state) => state.discountPolicy);
  const paymentPolicy = useDealflow((state) => state.paymentPolicy);
  const pending = useDealflow((state) => state.pendingReview);
  const setPending = useDealflow((state) => state.setPending);
  const setPendingOwner = useDealflow((state) => state.setPendingOwner);
  const discardPending = useDealflow((state) => state.discardPending);
  const confirmPending = useDealflow((state) => state.confirmPending);
  const companyName = useDealflow((state) => state.settings.companyName);
  const [text, setText] = useState("");
  const [sourceName, setSourceName] = useState("Confluence export");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function extract(body: string, name: string) {
    setBusy(true);
    setError("");
    try {
      const result = await extractPolicyDocument({ data: { text: body } });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const applied = applyPolicyPatch(discountPolicy, paymentPolicy, result.patch);
      setPending({
        sourceName: name,
        extractor: result.extractor,
        note: result.note,
        owner: "Finance",
        discount: applied.discount,
        payment: applied.payment,
        suggestedThreshold: applied.suggestedThreshold,
        changes: applied.changes,
      });
      if (result.traceId) {
        useDealflow.getState().pushLangfuse({
          id: `${Date.now()}-extract`,
          at: new Date().toISOString(),
          quoteId: "policy-onboard",
          kind: "judge",
          decision: result.extractor,
          delivered: true,
          traceId: result.traceId,
          host: "https://cloud.langfuse.com",
          note: "Policy extraction delivered to Langfuse.",
        });
      }
    } catch {
      setError("Could not read that document. Paste the policy text and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-line bg-card p-4">
        <h2 className="font-display text-2xl text-ink">Onboard {companyName}'s policy</h2>
        <ol className="mt-3 space-y-1 text-sm text-ink-soft">
          <li>1. Upload the unstructured book, or paste it. PDF, Word, or Confluence text.</li>
          <li>2. The extractor turns it into discount ceilings, cash risk, and the auto-approve line.</li>
          <li>3. RevOps or Finance reviews the diff.</li>
          <li>4. Confirm. That version becomes the only book the agents read. The previous version is archived.</li>
        </ol>
        <p className="mt-3 text-sm text-muted">
          Each customer workspace has its own pack. This one is {companyName}. A second company gets its own workspace, not a shared book.
        </p>
      </section>

      <section className="space-y-3 rounded-lg border border-line bg-card p-4">
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-semibold tracking-widest text-muted uppercase">Source name</span>
          <input className={cn(field, "h-11")} value={sourceName} onChange={(event) => setSourceName(event.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-semibold tracking-widest text-muted uppercase">Policy text</span>
          <textarea
            className={cn(field, "min-h-40")}
            value={text}
            placeholder="Paste a Confluence page, a policy memo, or the text of a PDF."
            onChange={(event) => setText(event.target.value)}
          />
        </label>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <label className={cn(btn, "cursor-pointer bg-card text-ink ring-1 ring-line")}>
            Upload file
            <input
              className="sr-only"
              type="file"
              accept=".txt,.md,.pdf,.docx,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                setSourceName(file.name);
                void textFromUpload(file)
                  .then((body) => {
                    setText(body);
                    setError("");
                  })
                  .catch((reason: unknown) => {
                    setError(reason instanceof Error ? reason.message : "Could not read that file.");
                  });
              }}
            />
          </label>
          <button
            type="button"
            className={cn(btn, "bg-paper-2 text-ink")}
            onClick={() => {
              setText(SAMPLE_POLICY_TEXT);
              setSourceName("Confluence — Finance working draft");
            }}
          >
            Load sample memo
          </button>
          <button
            type="button"
            className={cn(btn, "bg-teal text-paper")}
            disabled={busy || text.trim().length < 40}
            onClick={() => void extract(text, sourceName.trim() || "Uploaded policy")}
          >
            {busy ? "Extracting…" : "Extract rules"}
          </button>
        </div>
        {error && <p className="text-sm text-rust">{error}</p>}
      </section>

      {pending && (
        <section className="space-y-3 rounded-lg border border-teal bg-card p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold tracking-widest text-teal uppercase">Ready for review</p>
              <h2 className="font-display text-2xl text-ink">{pending.sourceName}</h2>
              <p className="mt-1 text-sm text-ink-soft">{pending.note}</p>
            </div>
            <label className="block text-sm sm:w-64">
              <span className="mb-1 block text-xs font-semibold tracking-widest text-muted uppercase">Owner</span>
              <select className={cn(field, "h-11")} value={pending.owner} onChange={(event) => setPendingOwner(event.target.value)}>
                <option>Revenue Operations</option>
                <option>Finance</option>
              </select>
            </label>
          </div>
          {pending.suggestedThreshold != null && (
            <p className="text-sm text-ink">
              Document asks for auto-approve at {pending.suggestedThreshold}% confidence. Confirming updates the orchestrator line.
            </p>
          )}
          <ul className="space-y-1 text-sm text-ink-soft">
            {pending.changes.length === 0 && <li>No numeric changes against the live book.</li>}
            {pending.changes.map((change) => (
              <li key={change}>{change}</li>
            ))}
          </ul>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="button" className={cn(btn, "bg-teal text-paper")} onClick={() => confirmPending()}>
              Confirm — make this the live book
            </button>
            <button type="button" className={cn(btn, "bg-card text-ink ring-1 ring-line")} onClick={() => discardPending()}>
              Discard extract
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

async function textFromUpload(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".docx")) {
    const xml = await readZipText(await file.arrayBuffer(), "word/document.xml");
    const text = xml
      .replace(/<w:p[ >]/g, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&/g, "&")
      .replace(/</g, "<")
      .replace(/>/g, ">")
      .replace(/[ \t]+\n/g, "\n")
      .trim();
    if (text.length < 20) throw new Error("That Word file had no readable policy text.");
    return text.slice(0, 14000);
  }
  if (name.endsWith(".pdf")) {
    const raw = new TextDecoder("latin1").decode(await file.arrayBuffer());
    const bits: string[] = [];
    const re = /\((?:\\.|[^\\)]){3,}\)/g;
    let match: RegExpExecArray | null;
    while ((match = re.exec(raw))) {
      bits.push(match[0].slice(1, -1).replace(/\\n/g, "\n").replace(/\\(.)/g, "$1"));
    }
    const text = bits.join(" ").replace(/\s+/g, " ").trim();
    if (text.replace(/[^A-Za-z]/g, "").length < 60) {
      throw new Error("This PDF has no text layer. Paste the policy, or upload Word or text.");
    }
    return text.slice(0, 14000);
  }
  const text = (await file.text()).trim();
  if (text.length < 20) throw new Error("That file is empty.");
  return text.slice(0, 14000);
}

async function readZipText(buffer: ArrayBuffer, want: string): Promise<string> {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  let offset = 0;
  while (offset + 30 < bytes.length) {
    if (view.getUint32(offset, true) !== 0x04034b50) break;
    const method = view.getUint16(offset + 8, true);
    const compSize = view.getUint32(offset + 18, true);
    const nameLen = view.getUint16(offset + 26, true);
    const extraLen = view.getUint16(offset + 28, true);
    const name = new TextDecoder().decode(bytes.slice(offset + 30, offset + 30 + nameLen));
    const start = offset + 30 + nameLen + extraLen;
    if (name === want) {
      const data = bytes.slice(start, start + compSize);
      if (method === 0) return new TextDecoder().decode(data);
      if (method === 8) {
        const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
        return await new Response(stream).text();
      }
      throw new Error("That Word file uses a compression this console cannot read. Paste the text.");
    }
    offset = start + compSize;
  }
  throw new Error("Could not find the document inside that Word file.");
}
