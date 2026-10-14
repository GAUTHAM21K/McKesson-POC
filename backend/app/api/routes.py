import json
from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from typing import List, Optional, Dict, Any
from datetime import datetime

from app.schemas.rca import (
    IncidentSummary,
    IncidentDetail,
    KBArticle,
    RCAGenerationRequest,
    FinalRCAResult,
    RCADecisionRequest,
    RCADecisionResponse,
    RCAExecutionRequest,
    RCAExecutionResponse
)
from app.rag.ingestion import (
    get_all_incidents,
    get_incident_by_id,
    ingest_knowledge_base,
    load_raw_dataset
)
from app.rag.vector_store import KnowledgeVectorStore
from app.agents.graph import run_rca_workflow, stream_rca_workflow
from app.tools.data_adapters import update_servicenow_ticket

router = APIRouter()

# In-memory store for recorded decisions and ticket state updates during the session
_DECISION_HISTORY: List[Dict[str, Any]] = []
_INCIDENT_UPDATES: Dict[str, Dict[str, Any]] = {}

@router.get("/health", tags=["System"])
def health_check():
    store = KnowledgeVectorStore.get_instance()
    return {
        "status": "healthy",
        "service": "Distribution Operations AI RCA Platform",
        "vector_store_indexed": store.is_indexed,
        "indexed_documents": len(store.documents)
    }

@router.post("/ingest", tags=["RAG"])
def trigger_ingestion():
    try:
        result = ingest_knowledge_base()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/incidents", response_model=List[IncidentSummary], tags=["Incidents"])
def list_incidents(
    priority: Optional[str] = Query(None, description="Filter by priority, e.g. 'P1 - Critical'"),
    stage: Optional[str] = Query(None, description="Filter by process stage, e.g. 'Acumax'")
):
    try:
        incidents = get_all_incidents()
        
        # Merge any runtime status updates (e.g. after approval/rejection)
        merged = []
        for inc in incidents:
            inc_id = inc.get("incident_id")
            item = dict(inc)
            if inc_id in _INCIDENT_UPDATES:
                item.update(_INCIDENT_UPDATES[inc_id])
            merged.append(item)
            
        if priority:
            merged = [i for i in merged if priority.lower() in i.get("priority", "").lower()]
        if stage:
            merged = [i for i in merged if stage.lower() == i.get("process_stage", "").lower()]
            
        return merged
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch incidents: {str(e)}")

@router.get("/incidents/{incident_id}", response_model=IncidentDetail, tags=["Incidents"])
def get_incident(incident_id: str):
    try:
        inc = get_incident_by_id(incident_id)
        res = dict(inc)
        if incident_id in _INCIDENT_UPDATES:
            res.update(_INCIDENT_UPDATES[incident_id])
        return res
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/logs/search", tags=["Telemetry Log Lake"])
def search_log_lake(
    query: Optional[str] = Query(None, description="Free text or error token search, e.g. 'ORA-00054' or 'Deadlock'"),
    ci: Optional[str] = Query(None, description="Configuration Item, e.g. 'ACUMAX-WMS-PROD-CLUSTER-04'"),
    dc_code: Optional[str] = Query(None, description="DC facility code, e.g. 'DC-04'"),
    level: Optional[str] = Query(None, description="Log level filter: 'ERROR', 'WARN', 'CRIT', 'FATAL', 'INFO'"),
    start_time: Optional[str] = Query(None, description="Earliest timestamp ISO string"),
    end_time: Optional[str] = Query(None, description="Latest timestamp ISO string"),
    limit: int = Query(50, ge=1, le=200, description="Max lines to return")
):
    """
    Direct search across the simulated enterprise Log Lake (Splunk / OpenSearch).
    Enables dynamic, decoupled telemetry search with time-window and CI pruning.
    """
    try:
        from app.adapters.log_lake import LogLakeEngine
        lake = LogLakeEngine.get_instance()
        results = lake.search(
            query=query,
            ci=ci,
            dc_code=dc_code,
            level=level,
            start_time=start_time,
            end_time=end_time,
            limit=limit
        )
        return {
            "status": "success",
            "cluster": "McKesson-DistOps-SIEM-LogLake-01",
            "total_matches": len(results),
            "events": results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Log Lake search failed: {str(e)}")


@router.post("/rca/generate", tags=["AI Agents"])
async def generate_rca(req: RCAGenerationRequest):
    """
    Executes the LangGraph Multi-Agent RCA Orchestration:
    1. Incident Understanding Agent (Tool calling: ServiceNow, Splunk)
    2. Context Retrieval Agent (Tool calling: Knowledge Base / ChromaDB)
    3. RCA Reasoning Agent (Structured reasoning)
    4. Remediation & Ownership Agent (Action plan & routing)
    5. Supervisor Node (Quality gates & certification)

    Streams real-time agent execution trace, thoughts, and final RCA payload
    via Server-Sent Events (SSE).
    """
    if req.stream is False:
        try:
            incident = get_incident_by_id(req.incident_id)
            final_rca = run_rca_workflow(incident)
            if not final_rca:
                raise HTTPException(status_code=500, detail="RCA workflow failed to generate results.")
            return final_rca
        except ValueError as e:
            raise HTTPException(status_code=404, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"RCA generation error: {str(e)}")

    async def sse_event_stream():
        try:
            async for event in stream_rca_workflow(req.incident_id):
                yield f"data: {json.dumps(event)}\n\n"
        except Exception as e:
            err = {"type": "error", "message": f"Execution failed: {str(e)}"}
            yield f"data: {json.dumps(err)}\n\n"

    return StreamingResponse(
        sse_event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@router.post("/rca/decision", response_model=RCADecisionResponse, tags=["Human-in-the-Loop"])
def record_decision(req: RCADecisionRequest):
    """
    Records Human-in-the-Loop approval, edit, or rejection.
    Updates the ServiceNow incident ticket payload and records an immutable audit log.
    """
    try:
        incident = get_incident_by_id(req.incident_id)
    except ValueError:
        raise HTTPException(status_code=404, detail=f"Incident {req.incident_id} not found.")

    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    # Build ticket update payload
    ticket_payload = {
        "sys_id": req.incident_id,
        "u_rca_status": req.action,
        "u_rca_decided_by": req.operator_name,
        "u_rca_decided_at": timestamp,
        "work_notes": f"[HITL RCA Action: {req.action}] Operator '{req.operator_name}' recorded decision. Operator Notes: {req.notes or 'None provided.'}"
    }

    if req.action == "APPROVE":
        new_state = "Resolved (Pending Validation)"
        ticket_payload["state"] = new_state
        msg = f"RCA proposal APPROVED by {req.operator_name}. Incident routing and remediation workflow initiated."
        _INCIDENT_UPDATES[req.incident_id] = {
            "state": new_state,
            "assignment_group": req.edited_assignment_group or "Acumax Support"
        }

    elif req.action == "EDIT":
        new_state = "In Progress (Operator Modified RCA)"
        ticket_payload["state"] = new_state
        ticket_payload["u_root_cause_override"] = req.edited_root_cause
        ticket_payload["assignment_group"] = req.edited_assignment_group
        msg = f"RCA proposal MODIFIED and confirmed by {req.operator_name}. Custom root cause and routing applied."
        update_dict = {"state": new_state}
        if req.edited_assignment_group:
            update_dict["assignment_group"] = req.edited_assignment_group
        _INCIDENT_UPDATES[req.incident_id] = update_dict

    elif req.action == "REJECT":
        new_state = "Escalated to Engineering"
        ticket_payload["state"] = new_state
        msg = f"RCA proposal REJECTED by {req.operator_name}. Escalating for senior manual investigation. Reason: {req.notes}"
        _INCIDENT_UPDATES[req.incident_id] = {
            "state": new_state
        }
    else:
        raise HTTPException(status_code=400, detail=f"Invalid action '{req.action}'. Expected APPROVE, EDIT, or REJECT.")

    # Record Audit Entry
    decision_record = {
        "incident_id": req.incident_id,
        "action": req.action,
        "operator_name": req.operator_name,
        "notes": req.notes,
        "timestamp": timestamp,
        "ticket_payload": ticket_payload
    }
    _DECISION_HISTORY.append(decision_record)

    return RCADecisionResponse(
        status="SUCCESS",
        incident_id=req.incident_id,
        action_recorded=req.action,
        operator_name=req.operator_name,
        timestamp=timestamp,
        ticket_payload=ticket_payload,
        message=msg
    )

@router.post("/rca/execute", response_model=RCAExecutionResponse, tags=["Closed-Loop Execution"])
def execute_rca(req: RCAExecutionRequest):
    """
    Closed-Loop HITL Execution Endpoint:
    Receives human-verified RCA findings and remediation plan.
    Triggers update_servicenow_ticket tool to push updates to ServiceNow
    (live REST API or hybrid adapter fallback) and updates ticket audit records.
    """
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Format structured work notes for ServiceNow
    plan_lines = []
    if req.remediation_plan:
        for idx, step in enumerate(req.remediation_plan):
            if isinstance(step, dict):
                num = step.get("step_number", idx + 1)
                action = step.get("action", "")
                cmd = step.get("command_or_tool", "")
                target = step.get("target_system", "")
                line = f"Step {num}: {action}"
                if target:
                    line += f" [Target: {target}]"
                if cmd:
                    line += f" -> Command: {cmd}"
                plan_lines.append(line)
            elif isinstance(step, str):
                plan_lines.append(f"Step {idx + 1}: {step}")
    elif req.action_plan_text:
        plan_lines.append(req.action_plan_text)
    else:
        plan_lines.append("Execute designated standard operating procedure remediation.")

    work_notes = (
        f"=== [CLOSED-LOOP AI RCA AUTO-UPDATE] ===\n"
        f"DECIDED BY: {req.operator_name} at {timestamp}\n"
        f"ROOT CAUSE: {req.root_cause_summary}\n\n"
        f"APPROVED ACTION PLAN:\n" + "\n".join(plan_lines) + "\n\n"
        f"TARGET ASSIGNMENT GROUP: {req.assignment_group}\n"
        f"OPERATOR NOTES: {req.notes or 'RCA verified and authorized for production execution.'}"
    )

    # Invoke update_servicenow_ticket tool
    tool_result = update_servicenow_ticket.invoke({
        "incident_id": req.incident_id,
        "work_notes": work_notes,
        "state": req.state,
        "assigned_group": req.assignment_group
    })

    mode = tool_result.get("mode", "HYBRID_MOCK")

    # Update in-memory cache for UI consistency
    _INCIDENT_UPDATES[req.incident_id] = {
        "state": req.state,
        "assignment_group": req.assignment_group,
        "u_rca_closed_loop": True
    }

    audit_entry = {
        "incident_id": req.incident_id,
        "action": "EXECUTE_CLOSED_LOOP",
        "operator_name": req.operator_name,
        "timestamp": timestamp,
        "ticket_payload": tool_result
    }
    _DECISION_HISTORY.append(audit_entry)

    msg = f"ServiceNow Ticket {req.incident_id} Updated Successfully ({mode}). Routing confirmed to '{req.assignment_group}'."

    return RCAExecutionResponse(
        status="SUCCESS",
        incident_id=req.incident_id,
        mode=mode,
        timestamp=timestamp,
        message=msg,
        ticket_payload=tool_result
    )

@router.get("/kb", response_model=List[KBArticle], tags=["RAG"])
def search_knowledge_base(q: Optional[str] = Query(None, description="Search query")):
    store = KnowledgeVectorStore.get_instance()
    if not store.is_indexed:
        ingest_knowledge_base()
        
    if q:
        docs = store.query(query_text=q, top_k=6)
        results = []
        for d in docs:
            if d.get("type") == "KB_ARTICLE":
                meta = d.get("metadata", {})
                results.append(KBArticle(**meta, score=d.get("score")))
        return results
    else:
        raw = load_raw_dataset()
        return [KBArticle(**k) for k in raw.get("knowledge_base", [])]
