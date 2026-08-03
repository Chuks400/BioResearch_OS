from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Dict, Iterable, List

from evaluation.metrics import accuracy, exact_match, token_f1
from model.inference import SelfRAGPipeline


SAMPLE_DATASET = [
    {
        "question": "What does Self-RAG decide before retrieval?",
        "answers": ["whether retrieval is needed", "when to retrieve passages"],
    },
    {
        "question": "What domain dataset can be used for biomedical QA?",
        "answers": ["PubMedQA"],
    },
]


def load_examples(dataset: str, limit: int | None = None) -> List[Dict[str, Any]]:
    if dataset == "samples":
        return SAMPLE_DATASET[:limit]
    if dataset in {"pubmedqa", "pubmed_qa"}:
        examples = _load_pubmedqa_examples()
        return examples[:limit] if limit else examples
    path = Path(dataset)
    if path.exists():
        examples = _load_json_or_jsonl(path)
        return examples[:limit] if limit else examples
    try:
        from datasets import load_dataset
    except ImportError as exc:
        raise RuntimeError("Install datasets or pass a local JSON/JSONL evaluation file.") from exc
    loaded = load_dataset(dataset)
    split = loaded["test"] if "test" in loaded else loaded[list(loaded.keys())[0]]
    examples = [_normalize_example(record) for record in split]
    return examples[:limit] if limit else examples


def _load_pubmedqa_examples(split: str = "test") -> List[Dict[str, Any]]:
    try:
        from datasets import load_dataset
    except ImportError as exc:
        raise RuntimeError("Install datasets to load PubMedQA.") from exc
    loaded = load_dataset("pubmed_qa", "pqa_labeled")
    selected = loaded[split] if split in loaded else loaded[list(loaded.keys())[0]]
    examples = []
    for record in selected:
        answers = []
        if record.get("final_decision"):
            answers.append(str(record["final_decision"]))
        if record.get("long_answer"):
            answers.append(str(record["long_answer"]))
        examples.append({"question": str(record["question"]), "answers": answers or [""]})
    return examples


def evaluate(
    index_path: str,
    dataset: str = "samples",
    limit: int | None = None,
    top_k: int = 5,
    backend: str = "heuristic",
    model_name: str = "selfrag/selfrag_llama2_7b",
    max_new_tokens: int = 256,
    device_map: str = "auto",
    use_4bit: bool = True,
) -> Dict[str, Any]:
    pipeline = SelfRAGPipeline.from_index(
        index_path,
        backend=backend,
        model_name=model_name,
        max_new_tokens=max_new_tokens,
        device_map=device_map,
        use_4bit=use_4bit,
    )
    examples = load_examples(dataset, limit=limit)
    em_scores: List[float] = []
    f1_scores: List[float] = []
    predictions: List[Dict[str, Any]] = []
    for example in examples:
        question = example["question"]
        answers = example["answers"]
        result = pipeline.answer(question, top_k=top_k)
        prediction = result["answer"]
        em = exact_match(prediction, answers)
        f1 = token_f1(prediction, answers)
        em_scores.append(em)
        f1_scores.append(f1)
        predictions.append({"question": question, "prediction": prediction, "answers": answers, "em": em, "f1": f1})
    return {
        "dataset": dataset,
        "backend": backend,
        "model_name": model_name,
        "count": len(examples),
        "exact_match": accuracy(em_scores),
        "f1": accuracy(f1_scores),
        "predictions": predictions,
    }


def _load_json_or_jsonl(path: Path) -> List[Dict[str, Any]]:
    text = path.read_text(encoding="utf-8").strip()
    if not text:
        return []
    if path.suffix == ".jsonl":
        return [_normalize_example(json.loads(line)) for line in text.splitlines() if line.strip()]
    payload = json.loads(text)
    records = payload if isinstance(payload, list) else payload.get("data", [])
    return [_normalize_example(record) for record in records]


def _normalize_example(record: Dict[str, Any]) -> Dict[str, Any]:
    question = record.get("question") or record.get("query") or record.get("input")
    answers = record.get("answers") or record.get("answer") or record.get("target")
    if isinstance(answers, str):
        answers = [answers]
    if not question or not answers:
        raise ValueError(f"Could not normalize evaluation record: {record}")
    return {"question": str(question), "answers": [str(answer) for answer in answers]}


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate the local Self-RAG reproduction pipeline.")
    parser.add_argument("--index", required=True)
    parser.add_argument("--dataset", default="samples", help="samples, HuggingFace dataset name, or local JSON/JSONL file.")
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--top-k", type=int, default=5)
    parser.add_argument("--backend", choices=["heuristic", "hf"], default="heuristic")
    parser.add_argument("--model-name", default="selfrag/selfrag_llama2_7b")
    parser.add_argument("--max-new-tokens", type=int, default=256)
    parser.add_argument("--device-map", default="auto")
    parser.add_argument("--no-4bit", action="store_true")
    parser.add_argument("--output", default=None)
    args = parser.parse_args()
    results = evaluate(
        args.index,
        dataset=args.dataset,
        limit=args.limit,
        top_k=args.top_k,
        backend=args.backend,
        model_name=args.model_name,
        max_new_tokens=args.max_new_tokens,
        device_map=args.device_map,
        use_4bit=not args.no_4bit,
    )
    output = json.dumps(results, indent=2, ensure_ascii=False)
    if args.output:
        path = Path(args.output)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(output, encoding="utf-8")
    print(output)


if __name__ == "__main__":
    main()
