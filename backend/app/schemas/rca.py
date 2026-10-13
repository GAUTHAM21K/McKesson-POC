from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class IncidentSummary(BaseModel):
    incident_id: str
    number: str
    priority: str
    severity: str
    state: str
    short_description: str
    distribution_center: str
    dc_code: str
    process_stage: str
    configuration_item: str
    assignment_group: str
    caller: str
    sys_created_on: str
    business_impact: str

class IncidentDetail(IncidentSummary):
    description: str
    pipeline_sequence: List[str]
    ticket_notes: List[str]
    synthetic_logs: List[str]

class KBArticle(BaseModel):
    kb_id: str
    title: str
    category: str
    tags: List[str]
    applicable_stages: List[str]
    content: str
    score: Optional[float] = None

class ProblemRecord(BaseModel):
    problem_id: str
    title: str
    root_cause_summary: str
    permanent_fix: str
    related_kbs: List[str]
    score: Optional[float] = None

class EvidenceItem(BaseModel):
    source_type: str = Field(description="LOG, TICKET_NOTE, KB_ARTICLE, or PRB_RECORD")
    citation: str = Field(description="Exact reference identifier or timestamp")
    detail: str = Field(description="Supporting observation or log snippet")

class ContradictionItem(BaseModel):
    hypothesis_ruled_out: str = Field(description="Potential cause evaluated and discarded")
    counter_evidence: str = Field(description="Evidence refuting this hypothesis")

class RemediationStep(BaseModel):
    step_number: int
    action: str
    command_or_tool: Optional[str] = None
    target_system: str

class AgentStepLog(BaseModel):
    agent_name: str
    timestamp: str
    status: str
    summary: str
    details: Dict[str, Any] = {}

class RCAGenerationRequest(BaseModel):
    incident_id: str
    stream: Optional[bool] = True
    model_override: Optional[str] = None
    temperature: Optional[float] = 0.1

class FinalRCAResult(BaseModel):
    incident_id: str
    incident_number: str
    distribution_center: str
    process_stage: str
    root_cause_summary: str
    technical_root_cause: str
    confidence_score: int = Field(ge=0, le=100)
    confidence_rationale: str
    pipeline_stage_analysis: Dict[str, str] = Field(description="Stage-by-stage status across SAP -> EAI -> Acumax -> Pick -> Pack -> Ship -> Truck Close")
    evidence_used: List[EvidenceItem]
    contradictions: List[ContradictionItem]
    remediation_plan: List[RemediationStep]
    sop_reference: Optional[str] = None
    predicted_assignment_group: str
    assignment_group_confidence: int
    sla_risk_level: str
    agent_reasoning_trail: List[AgentStepLog]
    generated_at: str

class RCADecisionRequest(BaseModel):
    incident_id: str
    action: str = Field(description="APPROVE, EDIT, or REJECT")
    operator_name: str = "Enterprise Ops Commander"
    notes: Optional[str] = None
    edited_root_cause: Optional[str] = None
    edited_assignment_group: Optional[str] = None
    edited_remediation: Optional[List[str]] = None

class RCADecisionResponse(BaseModel):
    status: str
    incident_id: str
    action_recorded: str
    operator_name: str
    timestamp: str
    ticket_payload: Dict[str, Any]
    message: str


class RCAReasoningStructuredOutput(BaseModel):
    hypotheses: List[Dict[str, Any]] = Field(description="Evaluated hypotheses with status, e.g. DISPROVED or CONFIRMED_ROOT_CAUSE")
    root_cause_summary: str = Field(description="Executive summary of the root cause")
    technical_root_cause: str = Field(description="In-depth technical root cause detailing errors, database locks, or component faults")
    confidence_score: int = Field(ge=0, le=100, description="Deduction confidence percentage (0-100)")
    confidence_rationale: str = Field(description="Technical justification for the confidence rating")
    evidence_citations: List[Dict[str, Any]] = Field(description="List of cited log lines, work notes, and KB articles")
    contradictions: List[Dict[str, Any]] = Field(description="Ruled out hypotheses and counter-evidence proving why")


class RemediationStructuredOutput(BaseModel):
    remediation_plan: List[Dict[str, Any]] = Field(description="Numbered sequential corrective remediation steps")
    sop_reference: Optional[str] = Field(None, description="Standard Operating Procedure code (e.g. SOP-WMS-418)")
    predicted_assignment_group: str = Field(description="Target ServiceNow assignment group (e.g. Acumax Support)")
    assignment_group_confidence: int = Field(ge=0, le=100, description="Confidence in assignment group routing")
    sla_risk_level: str = Field(description="Calculated SLA breach risk level")


class RCAExecutionRequest(BaseModel):
    incident_id: str
    root_cause_summary: str
    remediation_plan: Optional[List[Dict[str, Any]]] = None
    action_plan_text: Optional[str] = None
    assignment_group: str = "Acumax Support"
    operator_name: str = "Operations Commander"
    state: str = "Resolved (Pending Validation)"
    notes: Optional[str] = None


class RCAExecutionResponse(BaseModel):
    status: str
    incident_id: str
    mode: str
    timestamp: str
    message: str
    ticket_payload: Dict[str, Any]


