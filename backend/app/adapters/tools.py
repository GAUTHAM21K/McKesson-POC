import json
from typing import Optional, Dict, Any, List
from langchain_core.tools import tool

from app.adapters.synthetic import (
    SyntheticServiceNowAdapter,
    SyntheticSplunkAdapter,
    SyntheticKnowledgeBaseAdapter
)

# Singleton instances of data adapters (swap to live APIs via config)
_sn_adapter = SyntheticServiceNowAdapter()
_splunk_adapter = SyntheticSplunkAdapter()
_kb_adapter = SyntheticKnowledgeBaseAdapter()


@tool
def get_servicenow_ticket(incident_id: str) -> str:
    """
    Fetches ServiceNow incident metadata, affected configuration item (CI),
    distribution center (DC), priority, and human work notes.
    Args:
        incident_id: The ServiceNow incident number (e.g. 'INC0892110')
    Returns:
        JSON string containing ticket details and notes timeline.
    """
    try:
        ticket = _sn_adapter.get_ticket(incident_id)
        return json.dumps(ticket, indent=2)
    except Exception as e:
        return json.dumps({"error": f"Failed to fetch ticket {incident_id}: {str(e)}"})


@tool
def query_splunk_logs(correlation_id: str, system: Optional[str] = None) -> str:
    """
    Queries Splunk telemetry and system logs for a specific incident or CI component.
    Args:
        correlation_id: Incident number or CI name (e.g., 'INC0892110', 'ACUMAX-WMS-PROD-CLUSTER-04')
        system: Optional subsystem filter (e.g., 'SAP', 'EAI', 'Acumax', 'Cognex')
    Returns:
        JSON string array of matching log lines with timestamps and log levels.
    """
    try:
        logs = _splunk_adapter.query_logs(correlation_id=correlation_id, system=system)
        return json.dumps({"correlation_id": correlation_id, "log_count": len(logs), "logs": logs}, indent=2)
    except Exception as e:
        return json.dumps({"error": f"Splunk query failed: {str(e)}"})


@tool
def search_knowledge_base(query: str, stage: Optional[str] = None) -> str:
    """
    Performs semantic vector search across Standard Operating Procedures (SOPs),
    Knowledge Base (KB) articles, and historical Problem Records (PRBs).
    Args:
        query: Diagnostic symptoms, error codes (e.g. 'ORA-00054 deadlock WAVE_HDR_DTL'), or component failure description.
        stage: Optional warehouse stage filter (e.g. 'Acumax', 'EAI', 'Ship', 'Truck Close')
    Returns:
        JSON string array containing top 3 matching SOPs, diagnostic criteria, and permanent fixes.
    """
    try:
        results = _kb_adapter.search(query=query, stage=stage, top_k=3)
        return json.dumps({"query": query, "stage_filter": stage, "results_count": len(results), "kbs": results}, indent=2)
    except Exception as e:
        return json.dumps({"error": f"Knowledge search failed: {str(e)}"})


# Expose tool collections for agent binding
INCIDENT_UNDERSTANDING_TOOLS = [get_servicenow_ticket, query_splunk_logs]
CONTEXT_RETRIEVAL_TOOLS = [search_knowledge_base]
ALL_RCA_TOOLS = [get_servicenow_ticket, query_splunk_logs, search_knowledge_base]
