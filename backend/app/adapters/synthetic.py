import json
import logging
from typing import Dict, Any, List, Optional
from pathlib import Path
from app.config import settings
from app.adapters.base import ServiceNowAdapter, SplunkAdapter, KnowledgeBaseAdapter
from app.rag.vector_store import KnowledgeVectorStore

logger = logging.getLogger(__name__)

class SyntheticServiceNowAdapter(ServiceNowAdapter):
    """
    Adapter implementing ServiceNow ticket access using the synthetic dataset.
    Can be seamlessly swapped with a REST ServiceNow Table API client.
    """
    def __init__(self, data_file: Path = settings.DATA_FILE):
        self.data_file = data_file
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._load_data()

    def _load_data(self):
        if not self.data_file.exists():
            raise FileNotFoundError(f"Synthetic dataset not found at {self.data_file}")
        with open(self.data_file, "r", encoding="utf-8") as f:
            data = json.load(f)
            for inc in data.get("incidents", []):
                self._cache[inc["incident_id"]] = inc
                self._cache[inc["number"]] = inc

    def get_ticket(self, incident_id: str) -> Dict[str, Any]:
        inc = self._cache.get(incident_id)
        if not inc:
            raise ValueError(f"ServiceNow ticket '{incident_id}' not found.")
        return {
            "sys_id": inc.get("incident_id"),
            "number": inc.get("number"),
            "priority": inc.get("priority"),
            "severity": inc.get("severity"),
            "state": inc.get("state"),
            "short_description": inc.get("short_description"),
            "description": inc.get("description"),
            "distribution_center": inc.get("distribution_center"),
            "dc_code": inc.get("dc_code"),
            "process_stage": inc.get("process_stage"),
            "configuration_item": inc.get("configuration_item"),
            "assignment_group": inc.get("assignment_group"),
            "caller": inc.get("caller"),
            "sys_created_on": inc.get("sys_created_on"),
            "business_impact": inc.get("business_impact"),
            "work_notes": inc.get("ticket_notes", []),
            "correlation_id": inc.get("configuration_item", inc.get("incident_id"))
        }

    def update_ticket(self, incident_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        inc = self._cache.get(incident_id)
        if inc:
            inc.update(payload)
        return {"status": "SUCCESS", "incident_id": incident_id, "updated_fields": payload}


class SyntheticSplunkAdapter(SplunkAdapter):
    """
    Adapter implementing Splunk log telemetry access using synthetic log streams.
    Can be swapped with a live Splunk REST API / HEC client.
    """
    def __init__(self, data_file: Path = settings.DATA_FILE):
        self.data_file = data_file
        self._log_index: Dict[str, List[str]] = {}
        self._load_logs()

    def _load_logs(self):
        if not self.data_file.exists():
            return
        with open(self.data_file, "r", encoding="utf-8") as f:
            data = json.load(f)
            for inc in data.get("incidents", []):
                inc_id = inc["incident_id"]
                ci = inc.get("configuration_item", "")
                logs = inc.get("synthetic_logs", [])
                self._log_index[inc_id] = logs
                self._log_index[inc.get("number", "")] = logs
                if ci:
                    self._log_index[ci] = logs

    def query_logs(self, correlation_id: str, system: Optional[str] = None, limit: int = 50) -> List[str]:
        # Search by incident_id, CI, or partial match
        if correlation_id in self._log_index:
            return self._log_index[correlation_id][:limit]

        # Scan for matching log records containing system or correlation token
        for key, logs in self._log_index.items():
            if correlation_id.lower() in key.lower() or (system and system.lower() in key.lower()):
                return logs[:limit]

        # Return default logs from first available incident if unindexed
        first_available = next(iter(self._log_index.values()), [])
        return first_available[:limit]


class SyntheticKnowledgeBaseAdapter(KnowledgeBaseAdapter):
    """
    Adapter implementing Confluence / Vector DB retrieval using KnowledgeVectorStore.
    Can be swapped with a live ChromaDB / FAISS or Confluence Cloud Search client.
    """
    def __init__(self):
        self.store = KnowledgeVectorStore.get_instance()

    def search(self, query: str, stage: Optional[str] = None, top_k: int = 3) -> List[Dict[str, Any]]:
        if not self.store.is_indexed:
            from app.rag.ingestion import ingest_knowledge_base
            ingest_knowledge_base()

        docs = self.store.query(query_text=query, stage_filter=stage, top_k=top_k)
        formatted = []
        for d in docs:
            formatted.append({
                "id": d.get("id"),
                "type": d.get("type"),
                "title": d.get("title"),
                "category": d.get("category"),
                "tags": d.get("tags", []),
                "applicable_stages": d.get("applicable_stages", []),
                "content": d.get("content"),
                "score": d.get("score")
            })
        return formatted
