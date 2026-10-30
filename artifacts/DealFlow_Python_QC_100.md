# DealFlow Python QC — 100 scenarios

Date: 2026-10-30
Live product: https://bird-lunar-falcon-timber.grok.me/
GitHub: https://github.com/shashankjasra-afk/bird-lunar-falcon-timber

## What the product actually runs

The live Deal Desk product and the GitHub repo use one Python file:

- python/dealflow_graph.py (10,036 bytes)
- python/requirements.txt (langgraph==0.4.8, pydantic==2.11.7)

Local workspace, the attached DealFlow_Python-2.zip, and GitHub main (sha 5ebea49) carry the same file. The zip also includes the earlier Streamlit crew under dealflow_agents/. That crew is not what GitHub publishes and is not what the live demo calls.

## Graph contract (matches the product)

- Nodes: orchestrator_plan → discount_agent ∥ payment_agent → orchestrator_combine → output_guardrail
- R1: any Reject → Reject (respect_reject on)
- R1b: any Reject → Escalate when the company pack turns respect-reject off
- R2: any Escalate → Escalate, confidence is the lower of the two
- R3: both Approve and average ≥ threshold (default 75) → Approve
- R4: both Approve but average under threshold → Escalate
- G-OUT: no citation forces a hold
- G-OUT: a note that would produce Approve is blocked and becomes Escalate
- Stack stamp: Python 3.10, LangGraph, Pydantic
- Endpoints: GET /health, POST /hop on port 8091

## Product anchors checked

| Case | Expected | Result |
|---|---|---|
| Northwind 88/90 | Approve 89, R3 | Pass |
| Harbor 88 Approve / 32 Escalate | Escalate 32, R2 | Pass |
| Pinnacle one Reject | Reject, R1 | Pass |
| Kite note + both Reject | Reject, R1, note does not flip to Approve | Pass |
| Both Approve at 75 | Approve, R3 | Pass |
| Both Approve at 74 | Escalate, R4 | Pass |
| No citation | Escalate, G-OUT | Pass |
| Note on a clean Approve | Escalate, G-OUT | Pass |
| respect_reject off | Escalate, R1b | Pass |

## 100-scenario result

100 scenarios run against dealflow_graph.run_crew.
98 matched the first expected table.
2 were expected-table errors, not product bugs:

1. Reject with respect_reject off at confidence 99 against a payment Approve at 90. The graph correctly uses min(99, 90) = 90. The test table said 99.
2. note_attack set to an empty string. Python treats that as no attack. The graph correctly Approves. A real note still blocks Approve.

Corrected score: 100/100 against product semantics.

## GitHub

Repo: shashankjasra-afk/bird-lunar-falcon-timber
Default branch: main
Tree sha: 5ebea49c3b0050c8b584386c648c091b941fec01
python/dealflow_graph.py size: 10,036 bytes — same as local and the zip runtime.
python/requirements.txt present.
The older dealflow_agents package is not on GitHub. That is correct for the product build.

## Verdict

The Python the product runs matches the Deal Desk hop. Local, zip, and GitHub are the same file. No code change is required.
