"""DealFlow approval crew.

Python is the agent runtime. LangGraph is the orchestration. Pydantic is the
contract for every node. The CPQ stays the system of record.
"""

from __future__ import annotations

import json
import operator
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Annotated, Literal

from langgraph.graph import END, START, StateGraph
from pydantic import BaseModel, Field
from typing_extensions import TypedDict

Decision = Literal["Approve", "Escalate", "Reject"]


class Evidence(BaseModel):
    quote_id: str
    account: str
    segment: str
    quote_type: str
    threshold: int = 75
    respect_reject: bool = True
    note_attack: str | None = None
    discount_decision: Decision
    discount_confidence: int = Field(ge=0, le=100)
    discount_thought: str
    discount_cited: list[str] = []
    payment_decision: Decision
    payment_confidence: int = Field(ge=0, le=100)
    payment_thought: str
    payment_cited: list[str] = []


class AgentOut(BaseModel):
    agent: Literal["discount_agent", "payment_agent", "orchestrator"]
    decision: Decision
    confidence: int = Field(ge=0, le=100)
    thought: str
    cited: list[str] = []


class NodeTrace(BaseModel):
    node: str
    summary: str


class CrewDecision(BaseModel):
    stack: list[str]
    quote_id: str
    overall: Decision
    confidence: int
    rule: str
    guardrail: str
    plan: str
    discount: AgentOut
    payment: AgentOut
    orchestrator: AgentOut
    nodes: list[NodeTrace]


class GraphState(TypedDict):
    evidence: dict
    plan: str
    discount: dict
    payment: dict
    overall: str
    confidence: int
    rule: str
    guardrail: str
    trace: Annotated[list, operator.add]


def _rank(decision: str) -> int:
    return {"Approve": 0, "Escalate": 1, "Reject": 2}[decision]


def orchestrator_plan(state: GraphState) -> dict:
    evidence = Evidence.model_validate(state["evidence"])
    plan = (
        f"Orchestrator opened {evidence.quote_id} for {evidence.account}. "
        "Discount agent and payment agent read their books in parallel. "
        "One label is written after both return."
    )
    return {
        "plan": plan,
        "trace": [NodeTrace(node="orchestrator_plan", summary=plan).model_dump()],
    }


def discount_agent(state: GraphState) -> dict:
    evidence = Evidence.model_validate(state["evidence"])
    out = AgentOut(
        agent="discount_agent",
        decision=evidence.discount_decision,
        confidence=evidence.discount_confidence,
        thought=evidence.discount_thought,
        cited=evidence.discount_cited[:6],
    )
    return {
        "discount": out.model_dump(),
        "trace": [
            NodeTrace(
                node="discount_agent",
                summary=f"{out.decision} at {out.confidence}%. {out.thought}",
            ).model_dump()
        ],
    }


def payment_agent(state: GraphState) -> dict:
    evidence = Evidence.model_validate(state["evidence"])
    out = AgentOut(
        agent="payment_agent",
        decision=evidence.payment_decision,
        confidence=evidence.payment_confidence,
        thought=evidence.payment_thought,
        cited=evidence.payment_cited[:6],
    )
    return {
        "payment": out.model_dump(),
        "trace": [
            NodeTrace(
                node="payment_agent",
                summary=f"{out.decision} at {out.confidence}%. {out.thought}",
            ).model_dump()
        ],
    }


def orchestrator_combine(state: GraphState) -> dict:
    evidence = Evidence.model_validate(state["evidence"])
    discount = AgentOut.model_validate(state["discount"])
    payment = AgentOut.model_validate(state["payment"])
    decisions = [discount.decision, payment.decision]
    confidences = [discount.confidence, payment.confidence]
    if "Reject" in decisions:
        if evidence.respect_reject:
            overall: Decision = "Reject"
            rule = "R1 · any Reject → Reject"
            reason = "A specialist rejected. The orchestrator respects Reject."
        else:
            overall = "Escalate"
            rule = "R1b · Reject downgraded to Escalate"
            reason = "A specialist rejected. This company escalates instead of hard-reject."
        confidence = min(confidences)
    elif "Escalate" in decisions:
        overall = "Escalate"
        confidence = min(confidences)
        rule = "R2 · any Escalate → Escalate"
        reason = "A specialist escalated. The stricter label wins."
    else:
        confidence = sum(confidences) // 2
        if confidence >= evidence.threshold:
            overall = "Approve"
            rule = f"R3 · all Approve and confidence ≥ {evidence.threshold}"
            reason = "Both agents approved and the average clears the threshold."
        else:
            overall = "Escalate"
            rule = f"R4 · all Approve but confidence < {evidence.threshold}"
            reason = f"Both approved, but {confidence}% is under the {evidence.threshold}% line."
    thought = f"{rule}. {reason} Discount said {discount.decision}. Payment said {payment.decision}."
    return {
        "overall": overall,
        "confidence": confidence,
        "rule": rule,
        "guardrail": "",
        "trace": [NodeTrace(node="orchestrator_combine", summary=thought).model_dump()],
    }


def guardrail(state: GraphState) -> dict:
    evidence = Evidence.model_validate(state["evidence"])
    overall: Decision = state["overall"]  # type: ignore[assignment]
    confidence = int(state["confidence"])
    rule = state["rule"]
    cited = len(evidence.discount_cited) + len(evidence.payment_cited)
    note = "The label is no looser than the two books, and a note did not produce Approve."
    if cited == 0:
        overall = "Escalate"
        rule = "G-OUT · no citation, hold"
        note = "Neither agent cited a policy rule, so a person writes the stage."
    elif evidence.note_attack and overall == "Approve":
        overall = "Escalate"
        confidence = min(confidence, evidence.threshold - 1)
        rule = "G-OUT · a note cannot produce Approve"
        note = f"The notes tried to force Approve (“{evidence.note_attack}”). The guardrail blocked it."
    orch = AgentOut(
        agent="orchestrator",
        decision=overall,
        confidence=max(0, min(100, confidence)),
        thought=f"{rule}. {note}",
        cited=(evidence.discount_cited[:2] + evidence.payment_cited[:2]),
    )
    return {
        "overall": overall,
        "confidence": orch.confidence,
        "rule": rule,
        "guardrail": note,
        "trace": [NodeTrace(node="guardrail", summary=note).model_dump()],
    }


def build_graph():
    graph = StateGraph(GraphState)
    graph.add_node("orchestrator_plan", orchestrator_plan)
    graph.add_node("discount_agent", discount_agent)
    graph.add_node("payment_agent", payment_agent)
    graph.add_node("orchestrator_combine", orchestrator_combine)
    graph.add_node("output_guardrail", guardrail)
    graph.add_edge(START, "orchestrator_plan")
    graph.add_edge("orchestrator_plan", "discount_agent")
    graph.add_edge("orchestrator_plan", "payment_agent")
    graph.add_edge("discount_agent", "orchestrator_combine")
    graph.add_edge("payment_agent", "orchestrator_combine")
    graph.add_edge("orchestrator_combine", "output_guardrail")
    graph.add_edge("output_guardrail", END)
    return graph.compile()


APP = build_graph()


def run_crew(payload: dict) -> dict:
    evidence = Evidence.model_validate(payload)
    result = APP.invoke(
        {
            "evidence": evidence.model_dump(),
            "plan": "",
            "discount": {},
            "payment": {},
            "overall": "Escalate",
            "confidence": 0,
            "rule": "",
            "guardrail": "",
            "trace": [],
        }
    )
    discount = AgentOut.model_validate(result["discount"])
    payment = AgentOut.model_validate(result["payment"])
    overall: Decision = result["overall"]
    crew = CrewDecision(
        stack=["Python 3.10", "LangGraph", "Pydantic"],
        quote_id=evidence.quote_id,
        overall=overall,
        confidence=int(result["confidence"]),
        rule=result["rule"],
        guardrail=result["guardrail"],
        plan=result["plan"],
        discount=discount,
        payment=payment,
        orchestrator=AgentOut(
            agent="orchestrator",
            decision=overall,
            confidence=int(result["confidence"]),
            thought=f"{result['rule']}. {result['guardrail']}",
            cited=discount.cited[:2] + payment.cited[:2],
        ),
        nodes=[NodeTrace.model_validate(row) for row in result["trace"]],
    )
    return crew.model_dump()


class Handler(BaseHTTPRequestHandler):
    def _send(self, code: int, body: dict) -> None:
        raw = json.dumps(body).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_GET(self) -> None:  # noqa: N802
        if self.path.startswith("/health"):
            self._send(200, {"ok": True, "stack": ["Python 3.10", "LangGraph", "Pydantic"]})
            return
        self._send(404, {"error": "not found"})

    def do_POST(self) -> None:  # noqa: N802
        if self.path.split("?", 1)[0] != "/hop":
            self._send(404, {"error": "not found"})
            return
        length = int(self.headers.get("Content-Length", "0") or 0)
        raw = self.rfile.read(length) if length else b"{}"
        try:
            payload = json.loads(raw.decode() or "{}")
            self._send(200, run_crew(payload))
        except Exception as exc:  # noqa: BLE001
            self._send(400, {"error": str(exc)[:300]})

    def log_message(self, fmt: str, *args) -> None:
        return


if __name__ == "__main__":
    server = ThreadingHTTPServer(("127.0.0.1", 8091), Handler)
    server.serve_forever()
