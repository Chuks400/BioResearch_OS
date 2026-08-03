from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any, Dict, List

from evaluation.evaluate import load_examples
from evaluation.metrics import accuracy, exact_match, token_f1
from model.inference import SelfRAGPipeline
from retrieval.embed import tokenize
from retrieval.retriever import HybridRetriever, Passage


class NaiveRAGPipeline:
    def __init__(self, retriever: HybridRetriever) -> None:
        self.retriever = retriever

    def answer(self, query: str, top_k: int = 5) -> str:
        passages = self.retriever.retrieve(query, top_k=top_k)
        if not passages:
            return ""
        return self._extract_answer(query, passages[0])

    def _extract_answer(self, query: str, passage: Passage) -> str:
        sentences = [segment.strip() for segment in passage.text.replace("\n", " ").split(".") if segment.strip()]
        if not sentences:
            return passage.text
        query_tokens = set(tokenize(query))
        best_sentence = max(sentences, key=lambda sentence: len(query_tokens & set(tokenize(sentence))))
        return f"{best_sentence}."


def compare_systems(
    index_path: str,
    dataset: str = "samples",
    limit: int | None = None,
    top_k: int = 5,
    backend: str = "heuristic",
    model_name: str = "selfrag/selfrag_llama2_7b",
    max_new_tokens: int = 256,
    device_map: str = "auto",
    use_4bit: bool = True,
    answer_mode: str = "freeform",
) -> Dict[str, Any]:
    examples = load_examples(dataset, limit=limit)
    retriever = HybridRetriever.from_index(index_path)
    naive = NaiveRAGPipeline(retriever)
    selfrag = SelfRAGPipeline(
        retriever=retriever,
        backend=backend,
        model_name=model_name,
        max_new_tokens=max_new_tokens,
        device_map=device_map,
        use_4bit=use_4bit,
    )
    naive_rows = _score_pipeline(examples, lambda question: naive.answer(question, top_k=top_k), answer_mode=answer_mode)
    selfrag_rows = _score_pipeline(
        examples,
        lambda question: selfrag.answer(question, top_k=top_k, answer_mode=answer_mode)["answer"],
        answer_mode=answer_mode,
    )
    return {
        "dataset": dataset,
        "count": len(examples),
        "top_k": top_k,
        "systems": [
            _summarize("naive_rag", "retrieval_only", naive_rows),
            _summarize("self_rag", backend, selfrag_rows),
        ],
    }


def _score_pipeline(examples: List[Dict[str, Any]], predict, answer_mode: str = "freeform") -> List[Dict[str, Any]]:
    rows = []
    for example in examples:
        prediction = predict(example["question"])
        answers = example["answers"]
        row = {
            "question": example["question"],
            "prediction": prediction,
            "answers": answers,
            "em": exact_match(prediction, answers),
            "f1": token_f1(prediction, answers),
        }
        if answer_mode == "pubmedqa_label":
            prediction_label = extract_pubmedqa_label(prediction)
            gold_label = extract_pubmedqa_label(answers[0]) if answers else None
            row["prediction_label"] = prediction_label
            row["gold_label"] = gold_label
            row["label_em"] = float(prediction_label is not None and prediction_label == gold_label)
        rows.append(row)
    return rows


def _summarize(name: str, backend: str, rows: List[Dict[str, Any]]) -> Dict[str, Any]:
    summary = {
        "name": name,
        "backend": backend,
        "exact_match": accuracy([row["em"] for row in rows]),
        "f1": accuracy([row["f1"] for row in rows]),
        "predictions": rows,
    }
    if rows and "label_em" in rows[0]:
        summary["label_accuracy"] = accuracy([row["label_em"] for row in rows])
    return summary


def extract_pubmedqa_label(text: str) -> str | None:
    cleaned = text.lower()
    cleaned = re.sub(r"\[[^\]]+\]", " ", cleaned)
    cleaned = cleaned.replace("</s>", " ")
    cleaned = cleaned.replace("no retrieval", " ")
    cleaned = cleaned.replace("no retrieve", " ")
    cleaned = cleaned.replace("no support", " ")
    for pattern in [
        r"\bfinal answer\s*:\s*(yes|no|maybe)\b",
        r"\banswer\s*:\s*(yes|no|maybe)\b",
        r"^\s*(yes|no|maybe)\b",
        r"\b(yes|no|maybe)\b",
    ]:
        match = re.search(pattern, cleaned)
        if match:
            return match.group(1)
    return None


def main() -> None:
    parser = argparse.ArgumentParser(description="Compare Naive RAG against Self-RAG for report tables.")
    parser.add_argument("--index", required=True)
    parser.add_argument("--dataset", default="samples")
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--top-k", type=int, default=5)
    parser.add_argument("--backend", choices=["heuristic", "hf"], default="heuristic")
    parser.add_argument("--model-name", default="selfrag/selfrag_llama2_7b")
    parser.add_argument("--max-new-tokens", type=int, default=256)
    parser.add_argument("--device-map", default="auto")
    parser.add_argument("--no-4bit", action="store_true")
    parser.add_argument("--answer-mode", choices=["freeform", "pubmedqa_label"], default="freeform")
    parser.add_argument("--output", default=None)
    args = parser.parse_args()
    result = compare_systems(
        index_path=args.index,
        dataset=args.dataset,
        limit=args.limit,
        top_k=args.top_k,
        backend=args.backend,
        model_name=args.model_name,
        max_new_tokens=args.max_new_tokens,
        device_map=args.device_map,
        use_4bit=not args.no_4bit,
        answer_mode=args.answer_mode,
    )
    output = json.dumps(result, indent=2, ensure_ascii=False)
    if args.output:
        path = Path(args.output)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(output, encoding="utf-8")
    print(output)


if __name__ == "__main__":
    main()
