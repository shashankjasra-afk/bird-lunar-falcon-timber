# DealFlow Architecture Slides — QC

Reconstructed from python/dealflow_graph.py, the TypeScript hop, and GitHub main (sha 5ebea49).

## What changed from the attached deck

| Claim in the attached slides | Source check | Action |
|---|---|---|
| max steps 3, max tool calls 4 | Not in the graph | Removed. The hop is one pass, no retry loop. |
| CrewAI was the other option | Design note, not in code | Kept as the reason LangGraph was chosen. |
| Harbor assigned Finance, 24h | Matches assignment.ts and the live Flow tab | Kept. |
| Kite Reject 16, VP Sales + VP Finance | Matches the golden set | Kept. |
| Northwind Approve 89 | Matches R3 on 88/90 | Kept. |
| Langfuse approval-agents / dealflow.approval | Matches agent-run.ts and langfuse.server.ts | Kept. |
| POST /hop on 8091 | Matches graph-run.ts and dealflow_graph.py | Kept. |
| Helio and Northstar packs | Matches policies.ts and admin.tsx | Kept. |

## Layout QC

- Slide size 13.33 x 7.50.
- No text boxes off the slide.
- Title and tag overlap on slide 1 found and fixed. Second pass: 0 overlaps.
- Footer sits at 7.22. Content ends at or before 7.04 on every slide.
- Margins are at least 0.28 inches.

## Content QC against the product

1. Node names match the graph: orchestrator_plan, discount_agent, payment_agent, orchestrator_combine, output_guardrail.
2. Rules match the graph: R1, R1b, R2, R3, R4, G-OUT.
3. Stack stamp matches the runtime: Python 3.10, LangGraph, Pydantic. Pins match requirements.txt.
4. Product anchors match the 100-scenario run: Northwind 89 R3, Harbor 32 R2, Pinnacle 13 R1, note-on-Approve becomes Escalate 74 G-OUT.
5. Assignment matrix matches assignment.ts: mild 24h, material cash to Finance, severe to VP Sales + Finance, gaming 12h.
6. Boundary is correct: agents do not write Sent, Signed, or Converted. GitHub publishes only python/dealflow_graph.py and requirements.txt.

## Verdict

Four slides. Content matches the code and the GitHub repo. Layout clean after the title-tag fix.
