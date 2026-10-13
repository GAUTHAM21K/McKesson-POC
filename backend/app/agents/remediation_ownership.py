import logging
from datetime import datetime
from typing import Dict, Any, List

from langchain_core.messages import SystemMessage, HumanMessage
from app.agents.state import DynamicRCAState
from app.agents.llm import get_chat_model
from app.schemas.rca import RemediationStructuredOutput

logger = logging.getLogger(__name__)


def remediation_ownership_node(state: DynamicRCAState) -> Dict[str, Any]:
    """
    Node 4: Remediation & Ownership Agent
    Evaluates root cause and matched SOPs to construct action plan,
    determines ServiceNow assignment group, and calculates SLA breach risk.
    Uses .with_structured_output(RemediationStructuredOutput).
    """
    stage = state.get("process_stage", "Acumax")
    incident_id = state.get("incident_id") or state.get("ticket_data", {}).get("sys_id", "")
    root_cause = state.get("root_cause_summary", "")
    tech_cause = state.get("technical_root_cause", "")
    retrieved_kbs = state.get("retrieved_kbs", [])
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    agent_logs = list(state.get("agent_logs", []))

    logger.info(f"[RemediationOwnershipAgent] Formulating remediation plan for {incident_id}")

    structured_result: RemediationStructuredOutput = None
    model = get_chat_model()

    if model:
        try:
            structured_llm = model.with_structured_output(RemediationStructuredOutput)
            prompt = (
                f"You are the Remediation & Ownership Agent for McKesson Distribution Operations.\n"
                f"Incident ID: {incident_id}\n"
                f"Process Stage: {stage}\n"
                f"Root Cause: {root_cause}\n"
                f"Technical Root Cause: {tech_cause}\n"
                f"Retrieved KBs: {[k.get('title') for k in retrieved_kbs]}\n\n"
                f"Construct a step-by-step remediation plan, identify the governing SOP reference, "
                f"determine the responsible ServiceNow assignment group, routing confidence (0-100), "
                f"and SLA breach risk level."
            )
            structured_result = structured_llm.invoke([
                SystemMessage(content="You are an enterprise warehouse operations escalation engineer."),
                HumanMessage(content=prompt)
            ])
        except Exception as e:
            logger.warning(f"[RemediationOwnershipAgent] LLM call failed: {e}. Using deterministic remediation plan.")

    if not structured_result:
        if "0892110" in incident_id or stage == "Acumax":
            sop_ref = "SOP-WMS-418 (KB0041829)"
            predicted_group = "Acumax Support"
            group_confidence = 96
            sla_risk = "CRITICAL (35 mins to outbound dispatch breach)"
            remediation_steps = [
                {
                    "step_number": 1,
                    "action": "Terminate blocking background Oracle replenishment session (Session ID 1422) holding WAVE_HDR_DTL locks.",
                    "command_or_tool": "ALTER SYSTEM KILL SESSION '1422,55102' IMMEDIATE;",
                    "target_system": "Acumax Oracle DB Cluster"
                },
                {
                    "step_number": 2,
                    "action": "Execute DBA stored procedure to reset Wave #88201 status from 'ALLOCATING' back to 'PENDING_RELEASE'.",
                    "command_or_tool": "EXEC sp_acumax_wave_reset(wave_id => 88201);",
                    "target_system": "Acumax Database"
                },
                {
                    "step_number": 3,
                    "action": "Partition wave allocation into staggered slices of maximum 5,000 order lines with 90-second spacing.",
                    "command_or_tool": "acumax_cli wave partition --wave 88201 --slice-size 5000",
                    "target_system": "Acumax Wave Dispatcher"
                },
                {
                    "step_number": 4,
                    "action": "Verify RF picking terminals in Zones A-D transition to active picking status.",
                    "command_or_tool": "acumax_cli terminal status --zone A,B,C,D",
                    "target_system": "Warehouse RF Gateway"
                }
            ]
        elif "0892445" in incident_id or stage == "EAI":
            sop_ref = "SOP-EAI-389 (KB0038912)"
            predicted_group = "EAI Support"
            group_confidence = 98
            sla_risk = "HIGH (18,240 deliveries queued, cutoff at 11:00 AM)"
            remediation_steps = [
                {
                    "step_number": 1,
                    "action": "Pause inbound broker ingestion on queue 'Q_SAP_TO_ACUMAX_DELVRY' to stop head-of-line cascading.",
                    "command_or_tool": "eai_queue_mgr pause --queue Q_SAP_TO_ACUMAX_DELVRY",
                    "target_system": "EAI Message Broker"
                },
                {
                    "step_number": 2,
                    "action": "Execute EAI Quarantine Tool to extract out-of-order IDoc 99281003 into exception quarantine buffer.",
                    "command_or_tool": "eai_quarantine extract --msg-id 99281003 --reason SEQ_MISMATCH",
                    "target_system": "EAI Quarantine Manager"
                },
                {
                    "step_number": 3,
                    "action": "Run sequence re-synchronization script to advance expected sequence counter to 44012.",
                    "command_or_tool": "python /opt/eai/bin/resync_idoc_sequence.py --dc DC-12 --expected 44012",
                    "target_system": "EAI Middleware Engine"
                },
                {
                    "step_number": 4,
                    "action": "Resume broker ingestion and monitor drain rate (target > 450 msgs/sec). Re-inject quarantined IDoc.",
                    "command_or_tool": "eai_queue_mgr resume --queue Q_SAP_TO_ACUMAX_DELVRY",
                    "target_system": "EAI Message Broker"
                }
            ]
        elif "0892780" in incident_id or stage == "Ship":
            sop_ref = "SOP-AUTO-294 (KB0029410)"
            predicted_group = "Conveyor & WCS Automation Ops"
            group_confidence = 94
            sla_risk = "MODERATE (Recirculation buffer at 78% capacity)"
            remediation_steps = [
                {
                    "step_number": 1,
                    "action": "Deploy floor crew to jackpot spur to manually scan and stage accumulated cartons, preventing physical line jam.",
                    "command_or_tool": "Dispatch Floor Alert to Shift Supervisor (Radio Ch 3)",
                    "target_system": "Physical Warehouse Floor"
                },
                {
                    "step_number": 2,
                    "action": "Clean overhead Cognex optical line-scan lenses on Lane 7 using isopropyl lens wipes to eliminate corrugate dust barrier.",
                    "command_or_tool": "Maintenance Work Order MWO-7712",
                    "target_system": "Sortation Optical Scanner PE-701"
                },
                {
                    "step_number": 3,
                    "action": "Temporarily increase WCS barcode decode timeout window from 250ms to 380ms.",
                    "command_or_tool": "wcs_admin set-param --lane 7 --timeout-ms 380",
                    "target_system": "Warehouse Control System (WCS)"
                },
                {
                    "step_number": 4,
                    "action": "Verify 10 test cartons divert accurately to shipping lanes 21-26; confirm divert error rate drops below 2.0%.",
                    "command_or_tool": "wcs_admin verify-divert --lane 7 --sample 10",
                    "target_system": "WCS Controller"
                }
            ]
        elif "0893012" in incident_id or stage == "Truck Close":
            sop_ref = "SOP-SHP-521 (KB0052104)"
            predicted_group = "Acumax Support"
            group_confidence = 95
            sla_risk = "HIGH (Carrier detention charges beginning in 18 mins)"
            remediation_steps = [
                {
                    "step_number": 1,
                    "action": "Open Acumax Shipping Console -> Navigate to 'Trailer Close Reconciliation' -> Enter Trailer ID TRK-8821.",
                    "command_or_tool": "Acumax GUI Navigation / Shipping Module",
                    "target_system": "Acumax WMS Shipping Module"
                },
                {
                    "step_number": 2,
                    "action": "Locate unconfirmed split line for Order #771920 Line 40 and execute 'Void Canceled Split Portion'.",
                    "command_or_tool": "acumax_sql UPDATE WAVE_PICK_DTL SET STATUS='VOID' WHERE ORDER_ID=771920 AND LINE=40;",
                    "target_system": "Acumax Staging Database"
                },
                {
                    "step_number": 3,
                    "action": "Force EDI 856 ASN regeneration from Acumax Outbound EDI Manager.",
                    "command_or_tool": "acumax_edi trigger-asn --trailer TRK-8821 --force-rebuild",
                    "target_system": "Acumax EDI Outbound Bridge"
                },
                {
                    "step_number": 4,
                    "action": "Verify receipt of EDI 997 Functional Acknowledgment and trigger Bill of Lading (BOL) print at Bay 14.",
                    "command_or_tool": "dock_printer print-bol --bay 14 --trailer TRK-8821",
                    "target_system": "Dock Shipping Office Printer"
                }
            ]
        else:
            sop_ref = "Standard Escalation SOP"
            predicted_group = "Distribution Ops Incident Management"
            group_confidence = 88
            sla_risk = "MODERATE"
            remediation_steps = [
                {
                    "step_number": 1,
                    "action": f"Review stage {stage} logs and telemetry with local DC engineering lead.",
                    "command_or_tool": "Consult On-Call Lead",
                    "target_system": "Local DC Operations"
                },
                {
                    "step_number": 2,
                    "action": "Engage designated domain support group for targeted component restart or queue purge.",
                    "command_or_tool": "Escalate Ticket",
                    "target_system": "ServiceNow Incident Workflow"
                }
            ]

        structured_result = RemediationStructuredOutput(
            remediation_plan=remediation_steps,
            sop_reference=sop_ref,
            predicted_assignment_group=predicted_group,
            assignment_group_confidence=group_confidence,
            sla_risk_level=sla_risk
        )

    agent_step = {
        "agent_name": "Remediation & Ownership Agent",
        "timestamp": now_str,
        "status": "COMPLETED",
        "summary": f"Formulated {len(structured_result.remediation_plan)}-step plan under {structured_result.sop_reference}. Assigned to '{structured_result.predicted_assignment_group}'.",
        "details": {
            "sop_reference": structured_result.sop_reference,
            "predicted_group": structured_result.predicted_assignment_group,
            "confidence": structured_result.assignment_group_confidence,
            "sla_risk": structured_result.sla_risk_level
        }
    }
    agent_logs.append(agent_step)

    return {
        "remediation_plan": structured_result.remediation_plan,
        "sop_reference": structured_result.sop_reference,
        "predicted_assignment_group": structured_result.predicted_assignment_group,
        "assignment_group_confidence": structured_result.assignment_group_confidence,
        "sla_risk_level": structured_result.sla_risk_level,
        "agent_logs": agent_logs
    }
