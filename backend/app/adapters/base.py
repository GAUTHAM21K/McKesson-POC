from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional

class ServiceNowAdapter(ABC):
    """Abstract interface for ServiceNow incident data access."""

    @abstractmethod
    def get_ticket(self, incident_id: str) -> Dict[str, Any]:
        """Fetch ticket metadata and work notes."""
        pass

    @abstractmethod
    def update_ticket(self, incident_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Update ticket state, assignment group, or work notes."""
        pass


class SplunkAdapter(ABC):
    """Abstract interface for Splunk log telemetry access."""

    @abstractmethod
    def query_logs(self, correlation_id: str, system: Optional[str] = None, limit: int = 50) -> List[str]:
        """Query diagnostic system logs for a correlation ID or system component."""
        pass


class KnowledgeBaseAdapter(ABC):
    """Abstract interface for Confluence / Vector DB Knowledge Base access."""

    @abstractmethod
    def search(self, query: str, stage: Optional[str] = None, top_k: int = 3) -> List[Dict[str, Any]]:
        """Perform semantic search against indexed SOPs and Problem Records."""
        pass
