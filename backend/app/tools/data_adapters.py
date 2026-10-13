import os
import logging
from typing import Dict, Any, List, Optional
import httpx
from langchain_core.tools import tool

from app.config import settings
from app.adapters.synthetic import (
    SyntheticServiceNowAdapter,
    SyntheticSplunkAdapter,
    SyntheticKnowledgeBaseAdapter
)

logger = logging.getLogger(__name__)

# Singletons for fallback synthetic adapters
_snow_adapter = SyntheticServiceNowAdapter()
_splunk_adapter = SyntheticSplunkAdapter()
_kb_adapter = SyntheticKnowledgeBaseAdapter()


def _get_servicenow_config():
    url = os.getenv("SERVICENOW_API_URL") or settings.SERVICENOW_API_URL
    key = os.getenv("SERVICENOW_API_KEY") or settings.SERVICENOW_API_KEY
    return url.strip() if url else "", key.strip() if key else ""


def _get_splunk_config():
    url = os.getenv("SPLUNK_API_URL") or settings.SPLUNK_API_URL
    key = os.getenv("SPLUNK_API_KEY") or settings.SPLUNK_API_KEY
    return url.strip() if url else "", key.strip() if key else ""


@tool
def get_servicenow_ticket(incident_id: str) -> Dict[str, Any]:
    """
    Fetches ServiceNow incident ticket details, work notes, priority, CI, and correlation ID.
    Hybrid implementation: Calls live ServiceNow REST Table API if SERVICENOW_API_KEY is present,
    otherwise falls back to synthetic dataset.
    """
    logger.info(f"[Tool: get_servicenow_ticket] Invoked for incident: {incident_id}")
    api_url, api_key = _get_servicenow_config()

    if api_url and api_key:
        try:
            logger.info(f"[Tool: get_servicenow_ticket] Attempting live HTTP call to {api_url}...")
            with httpx.Client(timeout=4.0) as client:
                res = client.get(
                    f"{api_url.rstrip('/')}/api/now/table/incident/{incident_id}",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Accept": "application/json"
                    }
                )
                if res.status_code == 200:
                    data = res.json().get("result", res.json())
                    logger.info("[Tool: get_servicenow_ticket] Successfully retrieved live ServiceNow ticket.")
                    return data
                logger.warning(f"[Tool: get_servicenow_ticket] Live API returned HTTP {res.status_code}. Falling back to synthetic.")
        except Exception as e:
            logger.warning(f"[Tool: get_servicenow_ticket] Live API connection error: {e}. Falling back to synthetic.")

    # Fallback to local synthetic data adapter
    try:
        ticket = _snow_adapter.get_ticket(incident_id)
        return ticket
    except Exception as e:
        logger.error(f"[Tool: get_servicenow_ticket] Synthetic fallback failed: {e}")
        return {"error": f"Failed to retrieve ticket {incident_id}: {str(e)}"}


@tool
def query_splunk_logs(correlation_id: str, system: Optional[str] = None) -> List[str]:
    """
    Queries Splunk telemetry and system log streams for a specific correlation ID or system.
    Hybrid implementation: Queries live Splunk REST API if SPLUNK_API_KEY is set,
    otherwise falls back to synthetic dataset.
    """
    logger.info(f"[Tool: query_splunk_logs] Invoked for correlation_id={correlation_id}, system={system}")
    api_url, api_key = _get_splunk_config()

    if api_url and api_key:
        try:
            logger.info(f"[Tool: query_splunk_logs] Attempting live HTTP call to Splunk {api_url}...")
            with httpx.Client(timeout=4.0) as client:
                res = client.get(
                    f"{api_url.rstrip('/')}/services/search/jobs/export",
                    headers={"Authorization": f"Splunk {api_key}"},
                    params={"search": f"search correlation_id={correlation_id}", "output_mode": "json"}
                )
                if res.status_code == 200:
                    raw_lines = [line for line in res.text.splitlines() if line.strip()]
                    if raw_lines:
                        logger.info(f"[Tool: query_splunk_logs] Retrieved {len(raw_lines)} live Splunk records.")
                        return raw_lines
                logger.warning(f"[Tool: query_splunk_logs] Live Splunk API returned HTTP {res.status_code}. Falling back to synthetic.")
        except Exception as e:
            logger.warning(f"[Tool: query_splunk_logs] Live Splunk query failed: {e}. Falling back to synthetic.")

    # Fallback to local synthetic log adapter
    try:
        logs = _splunk_adapter.query_logs(correlation_id=correlation_id, system=system, limit=40)
        return logs
    except Exception as e:
        logger.error(f"[Tool: query_splunk_logs] Synthetic query failed: {e}")
        return [f"ERROR: Failed to query Splunk logs: {str(e)}"]


@tool
def search_knowledge_base(query: str) -> List[Dict[str, Any]]:
    """
    Embeds the query and searches the Vector Knowledge Base (ChromaDB / FAISS)
    for matching Standard Operating Procedures (SOPs) and historical problem records.
    """
    logger.info(f"[Tool: search_knowledge_base] Invoked with query: '{query}'")
    try:
        articles = _kb_adapter.search(query=query, top_k=3)
        return articles
    except Exception as e:
        logger.error(f"[Tool: search_knowledge_base] Vector search failed: {e}")
        return [{"error": f"Failed to query knowledge base: {str(e)}"}]


@tool
def update_servicenow_ticket(
    incident_id: str,
    work_notes: str,
    state: str = "Resolved (Pending Validation)",
    assigned_group: str = "Acumax Support"
) -> Dict[str, Any]:
    """
    Closed-Loop Execution tool: Updates ServiceNow ticket with approved RCA findings,
    remediation notes, target assignment group, and incident state.
    Hybrid implementation: Makes a live PATCH request if SERVICENOW_API_KEY is configured,
    or updates the in-memory ticket record.
    """
    logger.info(f"[Tool: update_servicenow_ticket] Updating incident {incident_id} to state '{state}'")
    api_url, api_key = _get_servicenow_config()

    payload = {
        "work_notes": work_notes,
        "state": state,
        "assignment_group": assigned_group,
        "u_rca_closed_loop": True
    }

    if api_url and api_key:
        try:
            logger.info(f"[Tool: update_servicenow_ticket] Sending live PATCH to {api_url}...")
            with httpx.Client(timeout=4.0) as client:
                res = client.patch(
                    f"{api_url.rstrip('/')}/api/now/table/incident/{incident_id}",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json"
                    },
                    json=payload
                )
                if res.status_code in [200, 204]:
                    return {
                        "status": "SUCCESS",
                        "mode": "LIVE_SERVICENOW_REST",
                        "incident_id": incident_id,
                        "updated_fields": payload
                    }
                logger.warning(f"[Tool: update_servicenow_ticket] Live API returned {res.status_code}. Falling back.")
        except Exception as e:
            logger.warning(f"[Tool: update_servicenow_ticket] Live API call failed: {e}. Falling back.")

    # Local synthetic adapter execution
    res = _snow_adapter.update_ticket(incident_id, payload)
    return {
        "status": "SUCCESS",
        "mode": "HYBRID_MOCK",
        "incident_id": incident_id,
        "updated_fields": payload
    }


@tool
def submit_final_rca(
    root_cause: str,
    evidence: List[str],
    action_plan: List[str],
    owner: str,
    confidence: int = 94
) -> Dict[str, Any]:
    """
    Cyclic LangGraph Exit Tool:
    Called by the Investigator Agent when it has gathered sufficient corroborating evidence
    and resolved any telemetry contradictions. Submits the final certified RCA proposal.
    """
    logger.info(f"[Tool: submit_final_rca] Submitting final RCA with confidence {confidence}%")
    return {
        "status": "RCA_SUBMITTED",
        "root_cause_summary": root_cause,
        "evidence_citations": evidence,
        "action_plan": action_plan,
        "owner": owner,
        "confidence_score": confidence
    }
