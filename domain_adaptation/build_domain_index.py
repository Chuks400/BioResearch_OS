from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Dict, Iterable, List

from retrieval.indexer import build_index


def load_pubmedqa_dataset() -> Any:
    try:
        from datasets import load_dataset
    except ImportError as exc:
        raise RuntimeError("Install datasets to export PubMedQA.") from exc
    try:
        return load_dataset("qiaojin/PubMedQA", "pqa_labeled")
    except Exception:
        return load_dataset("pubmed_qa", "pqa_labeled", trust_remote_code=True)


def export_pubmedqa_corpus(output_corpus: str | Path, split: str = "train", max_examples: int = 1000) -> Path:
    dataset = load_pubmedqa_dataset()
    records = dataset[split] if split in dataset else dataset[list(dataset.keys())[0]]
    path = Path(output_corpus)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        for idx, record in enumerate(records):
            if idx >= max_examples:
                break
            context = record.get("context", {})
            contexts = context.get("contexts", []) if isinstance(context, dict) else []
            text = " ".join(str(item) for item in contexts) or str(record.get("long_answer", ""))
            payload = {
                "id": str(record.get("pubid") or idx),
                "title": str(record.get("question", "PubMedQA")),
                "text": text,
                "answer": str(record.get("final_decision", "")),
            }
            handle.write(json.dumps(payload, ensure_ascii=False) + "\n")
    return path


def build_domain_index(
    output_corpus: str | Path,
    output_index: str | Path,
    split: str = "train",
    max_examples: int = 1000,
    embedding_dim: int = 384,
) -> None:
    corpus_path = export_pubmedqa_corpus(output_corpus, split=split, max_examples=max_examples)
    build_index(corpus_path, output_index, embedding_dim=embedding_dim)


def main() -> None:
    parser = argparse.ArgumentParser(description="Export PubMedQA as JSONL and build a domain retrieval index.")
    parser.add_argument("--output-corpus", default="data/pubmedqa_corpus.jsonl")
    parser.add_argument("--output-index", default="data/pubmedqa_index.json")
    parser.add_argument("--split", default="train")
    parser.add_argument("--max-examples", type=int, default=1000)
    parser.add_argument("--embedding-dim", type=int, default=384)
    args = parser.parse_args()
    build_domain_index(
        output_corpus=args.output_corpus,
        output_index=args.output_index,
        split=args.split,
        max_examples=args.max_examples,
        embedding_dim=args.embedding_dim,
    )
    print(f"Wrote PubMedQA corpus to {args.output_corpus}")
    print(f"Wrote PubMedQA index to {args.output_index}")


if __name__ == "__main__":
    main()
