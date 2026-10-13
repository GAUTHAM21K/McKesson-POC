import logging
from datetime import datetime
from typing import Dict, Any, List
import re

from langchain_core.messages import HumanMessage, AIMessage, ToolMessage
from langgraph.prebuilt import create_react_agent

from app.agents.state import DynamicRCAState
from app.agents.llm import get_chat_model
from app.tools.data_adapters import get_servicenow_ticket, query_splunk_logs

logger = logging.getLogger(__name__)

TOOLS = [get_servicenow_ticket, query_splunk_logs]


def incident_understanding_node(state: DynamicRCAState) -> Dict[str, Any]:
    """
    Node 1: Incident Understanding Agent
    Equipped with `get_servicenow_ticket` and `query_splunk_logs`.
    Calls the tools dynamically to inspect ticket work notes, metadata, and Splunk telemetry.
    Appends execution trace to `agent_logs`.
    """
    incident_id = state.get("incident_id") or state.get("incident_data", {}).get("incident_id", "")
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    agent_logs = list(state.get("agent_logs", []))
    streaming_events = list(state.get("streaming_events", []))

    logger.info(f"[IncidentUnderstandingAgent] Starting analysis for incident: {incident_id}")

    ticket_data = {}
    extracted_logs = []
    tool_steps_recorded = []

    model = get_chat_model()
    if model:
        try:
            # Build React Agent using langgraph.prebuilt
            react_agent = create_react_agent(
                model=model,
                tools=TOOLS,
                prompt=(
                    "You are the Incident Understanding Agent for McKesson Distribution Operations. "
                    "Your job is to: "
                    "1. Call get_servicenow_ticket with the given incident ID to fetch ticket details and work notes. "
                    "2. Identify the correlation ID or configuration item from the ticket. "
                    "3. Call query_splunk_logs using that correlation ID to fetch system logs. "
                    "4. Summarize the affected Distribution Center, process stage, symptoms, and error signatures."
                )
            )
            react_input = {
                "messages": [
                    HumanMessage(content=f"Please investigate incident '{incident_id}'. Retrieve the ticket and related Splunk logs.")
                ]
            }
            res = react_agent.invoke(react_input)
            msgs = res.get("messages", [])

            for msg in msgs:
                if isinstance(msg, ToolMessage):
                    tool_steps_recorded.append({
                        "tool": msg.name,
                        "output_preview": str(msg.content)[:200]
                    })
                    if msg.name == "get_servicenow_ticket" and isinstance(msg.content, dict):
                        ticket_data = msg.content
                    elif msg.name == "query_splunk_logs" and isinstance(msg.content, list):
                        extracted_logs = msg.content
        except Exception as e:
            logger.warning(f"[IncidentUnderstandingAgent] LLM ReAct loop failed: {e}. Falling back to adapter execution.")

    # Deterministic Tool Execution Fallback (if LLM is offline or didn't fetch ticket/logs)
    if not ticket_data:
        logger.info(f"[IncidentUnderstandingAgent] Calling get_servicenow_ticket('{incident_id}') directly.")
        tool_res = get_servicenow_ticket.invoke({"incident_id": incident_id})
        ticket_data = tool_res if isinstance(tool_res, dict) else {}
        tool_steps_recorded.append({
            "tool": "get_servicenow_ticket",
            "args": {"incident_id": incident_id},
            "status": "SUCCESS"
        })

    corr_id = ticket_data.get("correlation_id") or ticket_data.get("configuration_item") or incident_id
    if not extracted_logs:
        logger.info(f"[IncidentUnderstandingAgent] Calling query_splunk_logs('{corr_id}') directly.")
        logs_res = query_splunk_logs.invoke({"correlation_id": corr_id})
        extracted_logs = logs_res if isinstance(logs_res, list) else []
        tool_steps_recorded.append({
            "tool": "query_splunk_logs",
            "args": {"correlation_id": corr_id},
            "log_lines_count": len(extracted_logs),
            "status": "SUCCESS"
        })

    # Extract metadata, DC, symptoms, and errors
    dc = ticket_data.get("distribution_center", "Memphis Regional DC")
    dc_code = ticket_data.get("dc_code", "DC-04")
    stage = ticket_data.get("process_stage", "Acumax")
    notes = ticket_data.get("work_notes", [])
    desc = ticket_data.get("description", "")
    short_desc = ticket_data.get("short_description", "")
    business_impact = ticket_data.get("business_impact", "Critical operational impact on DC throughput.")

    error_patterns = [
        r'ORA-\d+',
        r'EAI_ERR_[A-Z0-9_]+',
        r'IDOC_[A-Z0-9_]+',
        r'SCAN_ERR_[A-Z0-9_]+',
        r'ERR_ASN_[A-Z0-9_]+',
        r'BATCH_[A-Z0-9_]+',
        r'LOCK_WAIT_TIMEOUT',
        r'WAVE_NOT_ACTIVE',
        r'JACKPOT_HIGH_WATER'
    ]
    extracted_errors = set()
    all_text = f"{desc} {' '.join(str(n) for n in notes)} {' '.join(str(l) for l in extracted_logs)}"
    for pat in error_patterns:
        for m in re.findall(pat, all_text):
            extracted_errors.add(m)

    symptoms = []
    if "deadlock" in all_text.lower() or "lock" in all_text.lower():
        symptoms.append("Database lock contention / deadlock detected on wave allocation tables")
    if "rf" in all_text.lower() or "wave not active" in all_text.lower():
        symptoms.append("RF picking terminals throwing WAVE_NOT_ACTIVE errors across warehouse zones")
    if "queue" in all_text.lower() or "idoc" in all_text.lower() or "delvry" in all_text.lower():
        symptoms.append("Message broker queue depth backlog with strict FIFO serialization block")
    if "recirculat" in all_text.lower() or "jackpot" in all_text.lower() or "scanner" in all_text.lower():
        symptoms.append("Conveyor diverter failing; parcels recirculating to jackpot spur")
    if "edi" in all_text.lower() or "asn" in all_text.lower() or "bol" in all_text.lower():
        symptoms.append("Truck Close EDI 856 ASN transaction blocked by unconfirmed order line discrepancy")
    if not symptoms:
        symptoms.append(f"Operational disruption in stage: {stage}. Impacting {short_desc}")

    # Pipeline Stage Status Mapping
    pipeline = ["SAP", "EAI", "Acumax", "Pick", "Pack", "Ship", "Truck Close"]
    pipeline_analysis = {}
    stage_idx = pipeline.index(stage) if stage in pipeline else 2
    for idx, p in enumerate(pipeline):
        if idx < stage_idx:
            pipeline_analysis[p] = "COMPLETED_HEALTHY"
        elif idx == stage_idx:
            pipeline_analysis[p] = "BLOCKED_FAILURE_POINT"
        else:
            pipeline_analysis[p] = "STARVED_PENDING_UPSTREAM"

    agent_step = {
        "agent_name": "Incident Understanding Agent",
        "timestamp": now_str,
        "status": "COMPLETED",
        "summary": f"Retrieved ticket metadata and Splunk logs for correlation ID '{corr_id}'. Identified stage '{stage}' at {dc}.",
        "details": {
            "incident_id": incident_id,
            "correlation_id": corr_id,
            "dc": dc,
            "dc_code": dc_code,
            "process_stage": stage,
            "error_signatures": list(extracted_errors),
            "tool_calls": tool_steps_recorded
        }
    }
    agent_logs.append(agent_step)

    return {
        "ticket_data": ticket_data,
        "extracted_logs": extracted_logs,
        "affected_dc": dc,
        "dc_code": dc_code,
        "process_stage": stage,
        "extracted_symptoms": symptoms,
        "error_signatures": list(extracted_errors),
        "pipeline_analysis": pipeline_analysis,
        "business_impact": business_impact,
        "business_impact_level": ticket_data.get("severity", "1 - Critical"),
        "agent_logs": agent_logs,
        "streaming_events": streaming_events
    }
