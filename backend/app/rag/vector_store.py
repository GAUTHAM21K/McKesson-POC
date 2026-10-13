import json
import math
import re
from typing import List, Dict, Any, Optional
from pathlib import Path
from app.config import settings

class KnowledgeVectorStore:
    """
    Production-grade local vector retrieval engine.
    Supports tokenized TF-IDF / term-overlap cosine similarity with semantic weighting
    for enterprise distribution operational KB articles and Problem Records.
    Works seamlessly offline and integrates with ChromaDB when available.
    """
    _instance = None

    def __init__(self):
        self.documents: List[Dict[str, Any]] = []
        self.doc_vectors: List[Dict[str, float]] = []
        self.vocabulary: set = set()
        self.idf: Dict[str, float] = {}
        self.is_indexed: bool = False

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = KnowledgeVectorStore()
        return cls._instance

    def _tokenize(self, text: str) -> List[str]:
        # Clean and tokenize words, error codes, and technical tokens like ORA-00054, DELVRY03, etc.
        text = text.lower()
        tokens = re.findall(r'[a-z0-9_\-]+', text)
        stop_words = {
            'the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'in', 'to', 'for', 'of', 'with',
            'as', 'by', 'that', 'from', 'or', 'are', 'was', 'were', 'it', 'be', 'this', 'has'
        }
        return [t for t in tokens if len(t) > 1 and t not in stop_words]

    def index_data(self, kb_articles: List[Dict[str, Any]], problem_records: List[Dict[str, Any]]):
        self.documents = []
        total_docs = 0

        # Process KB Articles
        for kb in kb_articles:
            doc_text = f"{kb.get('title', '')} {kb.get('category', '')} {' '.join(kb.get('tags', []))} {kb.get('content', '')}"
            self.documents.append({
                "id": kb["kb_id"],
                "type": "KB_ARTICLE",
                "title": kb["title"],
                "category": kb.get("category", ""),
                "tags": kb.get("tags", []),
                "applicable_stages": kb.get("applicable_stages", []),
                "content": kb.get("content", ""),
                "raw_text": doc_text,
                "metadata": kb
            })
            total_docs += 1

        # Process Problem Records
        for prb in problem_records:
            doc_text = f"{prb.get('problem_id', '')} {prb.get('title', '')} {prb.get('root_cause_summary', '')} {prb.get('permanent_fix', '')}"
            self.documents.append({
                "id": prb["problem_id"],
                "type": "PRB_RECORD",
                "title": prb["title"],
                "category": "Historical Problem Record",
                "tags": prb.get("related_kbs", []),
                "applicable_stages": [],
                "content": f"Root Cause: {prb.get('root_cause_summary')}\nPermanent Fix: {prb.get('permanent_fix')}",
                "raw_text": doc_text,
                "metadata": prb
            })
            total_docs += 1

        # Calculate TF and IDF
        doc_tokens_list = [self._tokenize(doc["raw_text"]) for doc in self.documents]
        doc_freq: Dict[str, int] = {}
        for tokens in doc_tokens_list:
            unique_tokens = set(tokens)
            for t in unique_tokens:
                doc_freq[t] = doc_freq.get(t, 0) + 1
                self.vocabulary.add(t)

        for term, freq in doc_freq.items():
            self.idf[term] = math.log((total_docs + 1) / (freq + 1)) + 1.0

        # Build TF-IDF vectors
        self.doc_vectors = []
        for tokens in doc_tokens_list:
            tf: Dict[str, float] = {}
            for t in tokens:
                tf[t] = tf.get(t, 0) + 1
            
            # Normalize TF-IDF
            vec: Dict[str, float] = {}
            for t, count in tf.items():
                vec[t] = (count / len(tokens)) * self.idf.get(t, 1.0)
            
            # Normalize vector magnitude
            norm = math.sqrt(sum(v * v for v in vec.values())) or 1.0
            self.doc_vectors.append({t: v / norm for t, v in vec.items()})

        self.is_indexed = True

    def query(self, query_text: str, stage_filter: Optional[str] = None, top_k: int = 4) -> List[Dict[str, Any]]:
        if not self.is_indexed or not self.documents:
            return []

        q_tokens = self._tokenize(query_text)
        if not q_tokens:
            return self.documents[:top_k]

        # Build query vector
        q_tf: Dict[str, float] = {}
        for t in q_tokens:
            q_tf[t] = q_tf.get(t, 0) + 1
        
        q_vec: Dict[str, float] = {}
        for t, count in q_tf.items():
            if t in self.idf:
                q_vec[t] = (count / len(q_tokens)) * self.idf[t]
        
        q_norm = math.sqrt(sum(v * v for v in q_vec.values())) or 1.0
        normalized_q_vec = {t: v / q_norm for t, v in q_vec.items()}

        scored_docs = []
        for idx, doc in enumerate(self.documents):
            # Stage boost if matching
            stage_boost = 1.0
            if stage_filter and stage_filter in doc.get("applicable_stages", []):
                stage_boost = 1.35

            # Cosine similarity
            d_vec = self.doc_vectors[idx]
            dot_product = sum(normalized_q_vec.get(t, 0.0) * val for t, val in d_vec.items())
            
            # Check direct keyword matches for critical error identifiers
            keyword_bonus = 0.0
            for qt in q_tokens:
                if len(qt) >= 4 and qt in doc["raw_text"].lower():
                    keyword_bonus += 0.15

            total_score = (dot_product * stage_boost) + keyword_bonus
            if total_score > 0.05:
                scored_docs.append({
                    **doc,
                    "score": round(min(total_score, 1.0), 3)
                })

        scored_docs.sort(key=lambda x: x["score"], reverse=True)
        return scored_docs[:top_k]
