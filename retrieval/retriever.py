from __future__ import annotations

import json
import math
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional

from retrieval.embed import HashingEmbedder, dot, tokenize


@dataclass
class Passage:
    id: str
    text: str
    title: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)
    score: float = 0.0


class HybridRetriever:
    def __init__(
        self,
        passages: Iterable[Passage],
        vectors: Optional[List[List[float]]] = None,
        dense_weight: float = 0.35,
        bm25_weight: float = 0.65,
        embedding_dim: int = 384,
    ) -> None:
        self.passages = list(passages)
        self.embedder = HashingEmbedder(dim=embedding_dim)
        self.vectors = vectors or self.embedder.embed_batch(self._passage_text(passage) for passage in self.passages)
        self.dense_weight = dense_weight
        self.bm25_weight = bm25_weight
        self.tokenized = [tokenize(self._passage_text(passage)) for passage in self.passages]
        self.doc_freq = self._document_frequencies(self.tokenized)
        self.avg_doc_len = self._average_length(self.tokenized)

    @classmethod
    def from_index(
        cls,
        index_path: str | Path,
        dense_weight: float = 0.35,
        bm25_weight: float = 0.65,
    ) -> "HybridRetriever":
        path = Path(index_path)
        payload = json.loads(path.read_text(encoding="utf-8"))
        passages = [Passage(**item) for item in payload["passages"]]
        return cls(
            passages=passages,
            vectors=payload.get("vectors"),
            dense_weight=dense_weight,
            bm25_weight=bm25_weight,
            embedding_dim=payload.get("embedding_dim", 384),
        )

    def retrieve(self, query: str, top_k: int = 5) -> List[Passage]:
        if not self.passages:
            return []
        query_tokens = tokenize(query)
        query_vector = self.embedder.embed_text(query)
        dense_scores = [dot(query_vector, vector) for vector in self.vectors]
        sparse_scores = [self._bm25(query_tokens, doc_tokens) for doc_tokens in self.tokenized]
        dense_norm = self._minmax(dense_scores)
        sparse_norm = self._minmax(sparse_scores)
        ranked: List[Passage] = []
        for idx, passage in enumerate(self.passages):
            score = self.dense_weight * dense_norm[idx] + self.bm25_weight * sparse_norm[idx]
            ranked.append(
                Passage(
                    id=passage.id,
                    title=passage.title,
                    text=passage.text,
                    metadata=passage.metadata,
                    score=score,
                )
            )
        ranked.sort(key=lambda item: item.score, reverse=True)
        return ranked[:top_k]

    def _bm25(self, query_tokens: List[str], doc_tokens: List[str], k1: float = 1.5, b: float = 0.75) -> float:
        if not query_tokens or not doc_tokens:
            return 0.0
        counts = Counter(doc_tokens)
        score = 0.0
        doc_len = len(doc_tokens)
        total_docs = max(len(self.tokenized), 1)
        for token in query_tokens:
            freq = counts[token]
            if freq == 0:
                continue
            df = self.doc_freq.get(token, 0)
            idf = math.log(1 + (total_docs - df + 0.5) / (df + 0.5))
            denom = freq + k1 * (1 - b + b * doc_len / max(self.avg_doc_len, 1e-9))
            score += idf * (freq * (k1 + 1)) / denom
        return score

    def _passage_text(self, passage: Passage) -> str:
        if passage.title:
            return f"{passage.title}\n{passage.text}"
        return passage.text

    def _document_frequencies(self, docs: List[List[str]]) -> Dict[str, int]:
        freqs: Dict[str, int] = {}
        for doc in docs:
            for token in set(doc):
                freqs[token] = freqs.get(token, 0) + 1
        return freqs

    def _average_length(self, docs: List[List[str]]) -> float:
        if not docs:
            return 0.0
        return sum(len(doc) for doc in docs) / len(docs)

    def _minmax(self, values: List[float]) -> List[float]:
        low = min(values)
        high = max(values)
        if high == low:
            return [0.0 for _ in values]
        return [(value - low) / (high - low) for value in values]
