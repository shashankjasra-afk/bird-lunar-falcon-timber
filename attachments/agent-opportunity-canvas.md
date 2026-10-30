# Agent Opportunity Canvas
**Agent-driven Automation in Products · IPL · Cohort ICAIPM2026F**

*A one-page brief for deciding whether an agent is worth building, and what it must do to be trusted. Fill it before anyone writes a prompt. A blank box means a decision hasn't been made yet.*

**See a worked example:** `templates/agent-opportunity-canvas-wren-sample.md` (the Wren CX support agent).

---

## The canvas at a glance

| A · WHY: the opportunity | B · WHAT: the agent | C · HOW SAFE: trust | D · HOW WE KNOW: proof and cost |
|---|---|---|---|
| 1. Agent name, owner, posture | 7. Triggers and channels | 12. Human-in-the-loop design | 14. Evaluation and quality bar |
| 2. Users and context | 8. Inputs, knowledge and data | 13. Risks, failure modes and guardrails | 15. Cost and feasibility |
| 3. The problem, reframed | 9. Tools and actions (allowed / forbidden) | | 16. Rollout, kill criteria, open questions |
| 4. Job to be done | 10. Decision loop and architecture | | |
| 5. Outcomes, value and non-goals | 11. Outputs and the I/O contract | | |
| 6. Why agentic? (and why not) | | | |

**How to fill it:** work left to right. Bands A and B are the opportunity and the design; C and D are what make it shippable. Write numbers, not adjectives. Keep each box to a few lines; if it needs a page, the idea isn't clear yet.

---

## A · WHY: the opportunity

### 1. Agent name, owner and posture
| | |
|---|---|
| **Agent name** | |
| **Business owner** (accountable for outcomes) | |
| **Product owner** (owns the spec and the quality bar) | |
| **Posture, in one line** *(e.g. "a triage agent, not a resolution agent"; "a guide, not a salesperson")* | |

### 2. Users and context
| | |
|---|---|
| **Primary user** (who the agent serves) | |
| **Secondary users** (who works alongside it, receives handoffs, or is affected) | |
| **Context signals** (what's true about their situation when the agent shows up) | |
| **Key reality** (the one fact about these users that the design must respect) | |

### 3. The problem, reframed
| | |
|---|---|
| **Surface framing** (how people describe it today, often wrong) | |
| **Actual problem** (the precise problem the agent solves) | |
| **Today's process** (who does it, how, how often, how long) | |
| **What breaks today** (cost, delay, errors, at what volume) | |

### 4. Job to be done
**As a** __________ **I need to** __________ **so that** __________.

**The agent's job, in one sentence:** *"Given ______, the agent ______, without ______."*

### 5. Outcomes, value and non-goals
| Metric | Baseline today | Target | Measured how |
|---|---|---|---|
| **Primary metric** | | | |
| Secondary metric | | | |
| Secondary metric | | | |

**Value type** (tick all that apply): ☐ time saved ☐ quality improved ☐ risk reduced ☐ new capability ☐ cost reduced

**Explicit non-goals** (what the agent will *not* do or optimise for):
-
-

### 6. Why agentic? (and why not)
Tick what this use case genuinely needs. If you can't tick at least three, it's probably a workflow, a rules engine or a single LLM call.

| Needs | ☐ / ✗ | Evidence |
|---|---|---|
| Multi-step reasoning: the path depends on what it finds | | |
| Tool use: it must read or change real systems | | |
| Persistent context: memory across steps, sessions or days | | |
| Variable inputs: unstructured, messy, multilingual | | |
| Volume: enough repetitions to justify the build | | |
| Bounded autonomy: it can act alone within a playbook | | |

**Why not a simpler solution?**

**Where autonomy must stop** (decisions that stay human, always):

---

## B · WHAT: the agent

### 7. Triggers and channels
| | |
|---|---|
| **Triggers** (event, schedule, or user action that starts the agent) | |
| **Channels** (where it meets users: chat, email, WhatsApp, in-app, internal tool) | |
| **Channel constraints** (turn-taking, latency, languages, formats) | |

### 8. Inputs, knowledge and data
| Source | What the agent uses it for | Owner | Freshness | Sensitivity (PII / regulated?) |
|---|---|---|---|---|
| | | | | |
| | | | | |
| | | | | |

**Consent and minimisation:** what consent covers this processing, and what data must *not* reach the model?

**Partial observability:** what will the agent often *not* know, and what does it do then?

### 9. Tools and actions
| Tool / action | Read or write | Via (MCP / API / UI) | Who approves access | Fallback if it fails |
|---|---|---|---|---|
| | | | | |
| | | | | |
| | | | | |

**Allowed to do on its own:**
-

**Explicitly forbidden** (non-negotiable):
-

### 10. Decision loop and architecture
**Perceive → Decide → Act → Learn**, in this agent:
- **Perceive:**
- **Decide:**
- **Act:**
- **Learn:**

**Patterns used** (tick): ☐ pipeline ☐ routing ☐ parallelisation ☐ reflection ☐ tool use ☐ MCP ☐ planning ☐ multi-agent

**Single or multi-agent?** ________ **Why:** ________
*(For each extra agent: what does it know that no other agent can, what breaks if it fails, and why isn't it a tool call?)*

**Loop limits:** max steps ____ · max tool calls per run ____ · done when ____

**Architecture sketch** (Mermaid code or a link to a diagram):

### 11. Outputs and the I/O contract
```
Input:  { ... }
Output: { ... }
```
Which output fields are governance requirements (audit, reasoning, flags), not engineering preferences?

---

## C · HOW SAFE: trust

### 12. Human-in-the-loop design
| | |
|---|---|
| **Pattern** (review before output / review after / review on exception) | |
| **Triggers that bring in a human** | |
| **What the human sees** (the handoff package) | |
| **Human SLA, and what happens if it's missed** | |
| **How human decisions feed back** into the agent | |

### 13. Risks, failure modes and guardrails
| Risk or failure mode | Likelihood (H/M/L) | Impact (H/M/L) | Guardrail or fallback |
|---|---|---|---|
| | | | |
| | | | |
| | | | |

**Input guardrail(s):**

**Output guardrail(s):**

**Regulation and policy** (DPDP, Consumer Protection, RBI, sector rules) **and what each requires of the product:**

**Accountability:** who is on the hook when the agent is wrong?

---

## D · HOW WE KNOW: proof and cost

### 14. Evaluation and quality bar
| Quality criterion | Threshold | Why this number (cost of a false positive vs. false negative) |
|---|---|---|
| | | |
| | | |
| | | |

| | |
|---|---|
| **Golden dataset** (size, source, who labels it, edge cases included) | |
| **LLM-as-judge criteria** | |
| **Eval cadence** (build time, before each release, in production) | |
| **Production monitoring and alerts** | |

### 15. Cost and feasibility
| | |
|---|---|
| **Volume** (runs per day at steady state) | |
| **Tokens per run** (system + input + context + output) | |
| **Model per step** (and why) | |
| **Monthly cost** (with ×3 overhead for retries, reflection, guardrails) | |
| **Cost today without the agent** | |
| **Feasibility:** data ready? tools exist? biggest technical risk? | |

### 16. Rollout, kill criteria and open questions
| | |
|---|---|
| **Pilot scope** (who, what, how long) | |
| **Scale-up criteria** (what must be true to expand) | |
| **Kill / rollback criteria** (what makes us stop) | |
| **Biggest assumption to test first** | |
| **Open questions** | |

---

*This canvas draws on the Agentic Automation Canvas (Lobentanzer, 2026), Microsoft's agent design framework (Copilot Studio guidance), Abundly's Agent Design Canvas and the AI-native PRD taught in this course.*
