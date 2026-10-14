import json
import logging
from pathlib import Path
from typing import Dict, Any, List
from app.config import settings
from app.rag.vector_store import KnowledgeVectorStore

logger = logging.getLogger(__name__)

def load_raw_dataset(file_path: Path = settings.DATA_FILE) -> Dict[str, Any]:
    if not file_path.exists():
        raise FileNotFoundError(f"Synthetic dataset not found at {file_path}")
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)

def ingest_knowledge_base():
    """
    Ingest knowledge articles and problem records into the local vector store.
    """
    data = load_raw_dataset()
    kbs = data.get("knowledge_base", [])
    prbs = data.get("problem_records", [])
    
    store = KnowledgeVectorStore.get_instance()
    store.index_data(kbs, prbs)
    logger.info(f"Successfully ingested {len(kbs)} KBs and {len(prbs)} PRBs into Vector Store.")
    return {
        "status": "success",
        "kbs_indexed": len(kbs),
        "prbs_indexed": len(prbs),
        "total_documents": len(store.documents)
    }

def get_all_incidents() -> List[Dict[str, Any]]:
    data = load_raw_dataset()
    return data.get("incidents", [])

def get_incident_by_id(incident_id: str) -> Dict[str, Any]:
    incidents = get_all_incidents()
    for inc in incidents:
        if inc.get("incident_id") == incident_id or inc.get("number") == incident_id:
            res = dict(inc)
            # Dynamically query Log Lake for this incident's time-window and CI telemetry
            try:
                from app.adapters.log_lake import LogLakeEngine
                lake = LogLakeEngine.get_instance()
                lake_logs = lake.get_logs_for_incident(res)
                if lake_logs:
                    res["synthetic_logs"] = lake_logs
            except Exception as e:
                logger.warning(f"Log lake dynamic search fallback: {e}")
            return res
    raise ValueError(f"Incident with ID '{incident_id}' not found.")

