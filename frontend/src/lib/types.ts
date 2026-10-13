export interface IncidentSummary {
  incident_id: string;
  number: string;
  priority: string;
  severity: string;
  state: string;
  short_description: string;
  distribution_center: string;
  dc_code: string;
  process_stage: string;
  configuration_item: string;
  assignment_group: string;
  caller: string;
  sys_created_on: string;
  business_impact: string;
}

export interface IncidentDetail extends IncidentSummary {
  description: string;
  pipeline_sequence: string[];
  ticket_notes: string[];
  synthetic_logs: string[];
}

export interface KBArticle {
  kb_id: string;
  title: string;
  category: string;
  tags: string[];
  applicable_stages: string[];
  content: string;
  score?: number;
}

export interface ProblemRecord {
  problem_id: string;
  title: string;
  root_cause_summary: string;
  permanent_fix: string;
  related_kbs: string[];
  score?: number;
}

export interface EvidenceItem {
  source_type: "LOG" | "TICKET_NOTE" | "KB_ARTICLE" | "PRB_RECORD" | string;
  citation: string;
  detail: string;
}

export interface ContradictionItem {
  hypothesis_ruled_out: string;
  counter_evidence: string;
}

export interface RemediationStep {
  step_number: number;
  action: string;
  command_or_tool?: string;
  target_system: string;
}

export interface AgentStepLog {
  agent_name: string;
  timestamp: string;
  status: string;
  summary: string;
  details: Record<string, any>;
}

export interface FinalRCAResult {
  incident_id: string;
  incident_number: string;
  distribution_center: string;
  process_stage: string;
  root_cause_summary: string;
  technical_root_cause: string;
  confidence_score: number;
  confidence_rationale: string;
  pipeline_stage_analysis: Record<string, "COMPLETED_HEALTHY" | "BLOCKED_FAILURE_POINT" | "STARVED_PENDING_UPSTREAM" | string>;
  evidence_used: EvidenceItem[];
  contradictions: ContradictionItem[];
  remediation_plan: RemediationStep[];
  sop_reference?: string;
  predicted_assignment_group: string;
  assignment_group_confidence: number;
  sla_risk_level: string;
  agent_reasoning_trail: AgentStepLog[];
  generated_at: string;
}

export interface RCADecisionRequest {
  incident_id: string;
  action: "APPROVE" | "EDIT" | "REJECT";
  operator_name: string;
  notes?: string;
  edited_root_cause?: string;
  edited_assignment_group?: string;
  edited_remediation?: string[];
}

export interface RCADecisionResponse {
  status: string;
  incident_id: string;
  action_recorded: string;
  operator_name: string;
  timestamp: string;
  ticket_payload: Record<string, any>;
  message: string;
}

export interface RCAExecutionRequest {
  incident_id: string;
  root_cause_summary: string;
  remediation_plan?: RemediationStep[];
  action_plan_text?: string;
  assignment_group: string;
  operator_name: string;
  state?: string;
  notes?: string;
}

export interface RCAExecutionResponse {
  status: string;
  incident_id: string;
  mode: string;
  timestamp: string;
  message: string;
  ticket_payload: Record<string, any>;
}

