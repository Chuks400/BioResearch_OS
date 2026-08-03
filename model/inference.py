from __future__ import annotations

import argparse
from dataclasses import dataclass
from typing import Any, Dict, Optional

from model.backends import create_backend
from model.critique import NO_RETRIEVE, RETRIEVE, Critique
from model.prompts import format_prompt, format_with_passage
from retrieval.retriever import HybridRetriever, Passage


@dataclass
class Candidate:
    answer: str
    passage: Optional[Passage]
    critique: Critique
    score: float
    raw_output: str = ""


class SelfRAGPipeline:
    def __init__(
        self,
        retriever: Optional[HybridRetriever] = None,
        backend: str = "heuristic",
        model_name: str = "selfrag/selfrag_llama2_7b",
        max_new_tokens: int = 256,
        device_map: str = "auto",
        use_4bit: bool = True,
    ) -> None:
        self.retriever = retriever
        self.backend_name = backend
        self.model_name = model_name
        self.backend = create_backend(
            backend=backend,
            model_name=model_name,
            max_new_tokens=max_new_tokens,
            device_map=device_map,
            use_4bit=use_4bit,
        )

    @classmethod
    def from_index(
        cls,
        index_path: str,
        backend: str = "heuristic",
        model_name: str = "selfrag/selfrag_llama2_7b",
        max_new_tokens: int = 256,
        device_map: str = "auto",
        use_4bit: bool = True,
    ) -> "SelfRAGPipeline":
        return cls(
            retriever=HybridRetriever.from_index(index_path),
            backend=backend,
            model_name=model_name,
            max_new_tokens=max_new_tokens,
            device_map=device_map,
            use_4bit=use_4bit,
        )

    def answer(self, query: str, top_k: int = 5, answer_mode: str = "freeform") -> Dict[str, Any]:
        generation_query = self._format_generation_query(query, answer_mode)
        retrieve_decision = self.backend.decide_retrieve(query, self.retriever is not None)
        passages = self.retriever.retrieve(query, top_k=top_k) if retrieve_decision == RETRIEVE and self.retriever else []
        if not passages:
            generated = self.backend.generate(generation_query, None)
            generated.critique.retrieve = NO_RETRIEVE
            candidate = Candidate(
                answer=generated.answer,
                passage=None,
                critique=generated.critique,
                score=generated.critique.score(),
                raw_output=generated.raw_output,
            )
            return {
                "query": query,
                "answer": candidate.answer,
                "retrieve_decision": NO_RETRIEVE,
                "backend": self.backend_name,
                "model_name": self.model_name,
                "candidates": [self._candidate_to_dict(candidate)],
                "prompt": format_prompt(generation_query),
            }
        candidates = [self._generate_with_passage(generation_query, passage) for passage in passages]
        best = max(candidates, key=lambda item: item.score)
        return {
            "query": query,
            "answer": best.answer,
            "retrieve_decision": RETRIEVE,
            "backend": self.backend_name,
            "model_name": self.model_name,
            "candidates": [self._candidate_to_dict(candidate) for candidate in candidates],
            "prompt": format_with_passage(generation_query, best.passage.text if best.passage else None),
        }

    def _generate_with_passage(self, query: str, passage: Passage) -> Candidate:
        generated = self.backend.generate(query, passage)
        return Candidate(
            answer=generated.answer,
            passage=passage,
            critique=generated.critique,
            score=generated.critique.score(),
            raw_output=generated.raw_output,
        )

    def _candidate_to_dict(self, candidate: Candidate) -> Dict[str, Any]:
        passage = None
        if candidate.passage:
            passage = {
                "id": candidate.passage.id,
                "title": candidate.passage.title,
                "text": candidate.passage.text,
                "score": candidate.passage.score,
                "metadata": candidate.passage.metadata,
            }
        return {
            "answer": candidate.answer,
            "passage": passage,
            "critique": candidate.critique.as_dict(),
            "score": candidate.score,
            "raw_output": candidate.raw_output,
        }

    def _format_generation_query(self, query: str, answer_mode: str) -> str:
        if answer_mode == "pubmedqa_label":
            return (
                "For this PubMedQA biomedical question, answer with exactly one label first: "
                "yes, no, or maybe. Then provide one short evidence sentence.\n"
                f"Question: {query}"
            )
        return query


def main() -> None:
    parser = argparse.ArgumentParser(description="Run Self-RAG inference.")
    parser.add_argument("--index", required=True, help="Path to index JSON built by retrieval.indexer.")
    parser.add_argument("--query", required=True)
    parser.add_argument("--top-k", type=int, default=5)
    parser.add_argument("--backend", choices=["heuristic", "hf"], default="heuristic")
    parser.add_argument("--model-name", default="selfrag/selfrag_llama2_7b")
    parser.add_argument("--max-new-tokens", type=int, default=256)
    parser.add_argument("--device-map", default="auto")
    parser.add_argument("--no-4bit", action="store_true")
    parser.add_argument("--answer-mode", choices=["freeform", "pubmedqa_label"], default="freeform")
    args = parser.parse_args()
    pipeline = SelfRAGPipeline.from_index(
        args.index,
        backend=args.backend,
        model_name=args.model_name,
        max_new_tokens=args.max_new_tokens,
        device_map=args.device_map,
        use_4bit=not args.no_4bit,
    )
    result = pipeline.answer(args.query, top_k=args.top_k, answer_mode=args.answer_mode)
    print(result["answer"])
    print(result["candidates"][0]["critique"])


if __name__ == "__main__":
    main()
