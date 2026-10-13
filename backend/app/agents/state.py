from typing import TypedDict, List, Dict, Any, Optional, Annotated
import operator
from langchain_core.messages import BaseMessage


class DynamicRCAState(TypedDict):
    """
    Dynamic Multi-Agent State schema for LangGraph.
    Supports tool calling message sequences, dynamic telemetry buffers,
    and structured Pydantic deduction outputs.
    """
    # Incident identifier & payload
    incident_id: str
    incident_data: Optional[Dict[str, Any]]

    # LangChain / LangGraph ReAct message trajectory
    messages: Annotated[List[BaseMessage], operator.add]

    # Dynamically fetched context via @tool adapters
    ticket_data: Dict[str, Any]
    extracted_logs: List[str]
    retrieved_kbs: List[Dict[str, Any]]
    retrieved_context: List[Dict[str, Any]]

    # Agent 1 (Incident Understanding) extractions
    affected_dc: str
    dc_code: str
    process_stage: str
    extracted_symptoms: List[str]
    error_signatures: List[str]
    pipeline_analysis: Dict[str, str]
    business_impact: str
    business_impact_level: str

    # Agent 2 (Context Retrieval) query & results
    search_query_used: str

    # Agent 3 (RCA Reasoning) structured deductions
    hypotheses: List[Dict[str, Any]]
    root_cause_summary: str
    technical_root_cause: str
    confidence_score: int
    confidence_rationale: str
    evidence_citations: List[Dict[str, Any]]
    evidence_used: List[Dict[str, Any]]
    contradictions: List[Dict[str, Any]]

    # Agent 4 (Remediation & Ownership) outputs
    remediation_plan: List[Dict[str, Any]]
    sop_reference: Optional[str]
    predicted_assignment_group: str
    assignment_group_confidence: int
    sla_risk_level: str

    # Supervisor & Streaming audit trail
    agent_logs: List[Dict[str, Any]]
    streaming_events: List[Dict[str, Any]]
    final_rca: Optional[Dict[str, Any]]
    errors: List[str]
    next_node: Optional[str]


# Backward compatibility alias
RCAState = DynamicRCAState
