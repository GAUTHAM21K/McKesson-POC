import json
import logging
import re
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Any, List, Optional
from app.config import settings

logger = logging.getLogger(__name__)

class LogLakeEngine:
    """
    Simulated Enterprise Log Lake / SIEM (Splunk / OpenSearch / Elasticsearch).
    Provides indexed time-window search, CI/host filtering, error level filtering,
    and keyword token search with sub-millisecond query performance.
    """
    _instance = None

    def __init__(self, log_file: Optional[Path] = None):
        self.log_file = log_file or (settings.DATA_FILE.parent / "log_lake.json")
        self.events: List[Dict[str, Any]] = []
        self._ci_index: Dict[str, List[Dict[str, Any]]] = {}
        self._dc_index: Dict[str, List[Dict[str, Any]]] = {}
        self._level_index: Dict[str, List[Dict[str, Any]]] = {}
        self.is_loaded: bool = False
        self._load_and_index()

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = LogLakeEngine()
        return cls._instance

    def _load_and_index(self):
        # 1. Attempt loading from log_lake.json
        if self.log_file.exists():
            try:
                with open(self.log_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.events = data.get("events", [])
            except Exception as e:
                logger.error(f"[LogLakeEngine] Failed to load log_lake.json: {e}")

        # 2. Fallback to extracting synthetic_logs from synthetic_poc_data.json if empty
        if not self.events and settings.DATA_FILE.exists():
            try:
                with open(settings.DATA_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    for inc in data.get("incidents", []):
                        ci = inc.get("configuration_item", "UNKNOWN-CI")
                        dc = inc.get("dc_code", "DC-01")
                        stage = inc.get("process_stage", "General")
                        for idx, log_str in enumerate(inc.get("synthetic_logs", [])):
                            self.events.append({
                                "id": f"FALLBACK-{inc.get('incident_id')}-{idx}",
                                "timestamp": self._extract_timestamp(log_str),
                                "configuration_item": ci,
                                "host": f"{dc.lower()}-cluster",
                                "dc_code": dc,
                                "stage": stage,
                                "level": self._extract_level(log_str),
                                "raw": log_str
                            })
            except Exception as e:
                logger.error(f"[LogLakeEngine] Fallback ingestion failed: {e}")

        # 3. Build fast inverted memory indices
        self._ci_index.clear()
        self._dc_index.clear()
        self._level_index.clear()

        for ev in self.events:
            ci = (ev.get("configuration_item") or "").upper()
            dc = (ev.get("dc_code") or "").upper()
            level = (ev.get("level") or "").upper()

            self._ci_index.setdefault(ci, []).append(ev)
            self._dc_index.setdefault(dc, []).append(ev)
            self._level_index.setdefault(level, []).append(ev)

        self.is_loaded = True
        logger.info(f"[LogLakeEngine] Successfully loaded and indexed {len(self.events)} log events across {len(self._ci_index)} CIs.")

    def _extract_timestamp(self, text: str) -> str:
        match = re.search(r'\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}(?:\.\d{3})?', text)
        return match.group(0) if match else "2026-10-10 07:00:00.000"

    def _extract_level(self, text: str) -> str:
        for lvl in ["FATAL", "CRIT", "ERROR", "WARN", "ALERT", "INFO", "DEBUG"]:
            if f" {lvl} " in text or f"[{lvl}]" in text:
                return lvl
        return "INFO"

    def _parse_datetime(self, dt_str: str) -> Optional[datetime]:
        clean = dt_str.strip()
        for fmt in ("%Y-%m-%d %H:%M:%S.%f", "%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S"):
            try:
                return datetime.strptime(clean, fmt)
            except ValueError:
                continue
        return None

    def search(
        self,
        query: Optional[str] = None,
        ci: Optional[str] = None,
        dc_code: Optional[str] = None,
        host: Optional[str] = None,
        level: Optional[str] = None,
        start_time: Optional[str] = None,
        end_time: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Dynamic search across the simulated Log Lake.
        Supports filtering by CI, DC, Host, Severity Level, Time Window, and Token Matching.
        """
        candidates = self.events

        # 1. Prune by Configuration Item (CI)
        if ci:
            ci_upper = ci.strip().upper()
            if ci_upper in self._ci_index:
                candidates = self._ci_index[ci_upper]
            else:
                # Substring/partial match
                candidates = [e for e in candidates if ci_upper in (e.get("configuration_item") or "").upper()]

        # 2. Prune by Distribution Center (DC)
        if dc_code:
            dc_upper = dc_code.strip().upper()
            candidates = [e for e in candidates if dc_upper == (e.get("dc_code") or "").upper()]

        # 3. Prune by Host
        if host:
            h_lower = host.strip().lower()
            candidates = [e for e in candidates if h_lower in (e.get("host") or "").lower()]

        # 4. Filter by Log Severity Level
        if level:
            lvl_upper = level.strip().upper()
            candidates = [e for e in candidates if lvl_upper in (e.get("level") or "").upper()]

        # 5. Temporal Anchor: Time window bounding [start_time, end_time]
        dt_start = self._parse_datetime(start_time) if start_time else None
        dt_end = self._parse_datetime(end_time) if end_time else None

        if dt_start or dt_end:
            time_filtered = []
            for ev in candidates:
                ev_dt = self._parse_datetime(ev.get("timestamp", ""))
                if not ev_dt:
                    time_filtered.append(ev)
                    continue
                if dt_start and ev_dt < dt_start:
                    continue
                if dt_end and ev_dt > dt_end:
                    continue
                time_filtered.append(ev)
            candidates = time_filtered

        # 6. Entity & Keyword Token Scoring
        if query:
            tokens = [t.lower() for t in re.findall(r'[A-Za-z0-9_\-]+', query) if len(t) > 1]
            scored = []
            for ev in candidates:
                raw_text = (ev.get("raw") or ev.get("message") or "").lower()
                matches = sum(1 for t in tokens if t in raw_text)
                if matches > 0:
                    scored.append((matches, ev))
            scored.sort(key=lambda x: x[0], reverse=True)
            results = [x[1] for x in scored]
        else:
            results = candidates

        return results[:limit]

    def query_raw_lines(
        self,
        correlation_id: str,
        system: Optional[str] = None,
        query: Optional[str] = None,
        limit: int = 50
    ) -> List[str]:
        """
        Returns string lines formatted for agent ingestion and telemetry display.
        Handles correlation_id as either CI, Incident ID, or host name.
        """
        # Try finding by CI or correlation_id
        results = self.search(
            query=query,
            ci=correlation_id if "PROD" in correlation_id.upper() or "CLUSTER" in correlation_id.upper() or "GATEWAY" in correlation_id.upper() else None,
            dc_code=correlation_id if correlation_id.upper().startswith("DC-") else None,
            limit=limit
        )

        if not results and (correlation_id or system):
            # Broader keyword scan across correlation token
            results = self.search(query=f"{correlation_id} {system or ''}".strip(), limit=limit)

        if not results:
            # Fallback to returning all anomalous error logs
            results = [e for e in self.events if e.get("level") in ("ERROR", "CRIT", "FATAL")][:limit]

        return [e.get("raw", f"{e.get('timestamp')} [{e.get('host')}] {e.get('level')} {e.get('message')}") for e in results]

    def get_logs_for_incident(self, incident: Dict[str, Any], limit: int = 50) -> List[str]:
        """
        Dynamically searches the Log Lake for an incident based on its CI, DC,
        creation timestamp (+/- 25 min window), and error signatures.
        """
        ci = incident.get("configuration_item")
        dc = incident.get("dc_code")
        created_str = incident.get("sys_created_on", "")
        
        start_time = None
        end_time = None

        created_dt = self._parse_datetime(created_str)
        if created_dt:
            # Time bounding: -25 minutes to +15 minutes
            start_time = (created_dt - timedelta(minutes=25)).strftime("%Y-%m-%d %H:%M:%S")
            end_time = (created_dt + timedelta(minutes=15)).strftime("%Y-%m-%d %H:%M:%S")

        matched = self.search(
            ci=ci,
            dc_code=dc,
            start_time=start_time,
            end_time=end_time,
            limit=limit
        )

        if matched:
            return [e.get("raw") for e in matched]

        # Fallback to CI match without strict time bounding
        matched_ci = self.search(ci=ci, limit=limit)
        if matched_ci:
            return [e.get("raw") for e in matched_ci]

        # Last resort fallback if incident already had synthetic_logs in payload
        return incident.get("synthetic_logs", [])
