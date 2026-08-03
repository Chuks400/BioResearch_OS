from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Dict, Iterable, List

from retrieval.embed import HashingEmbedder
from retrieval.retriever import Passage


def load_jsonl(path: str | Path) -> List[Passage]:
    passages: List[Passage] = []
    with Path(path).open("r", encoding="utf-8") as handle:
        for line_number, line in enumerate(handle, start=1):
            line = line.strip()
            if not line:
                continue
            record = json.loads(line)
            text = record.get("text") or record.get("contents") or record.get("context")
            if not text:
                raise ValueError(f"Missing text field at {path}:{line_number}")
            passage_id = str(record.get("id") or f"passage-{line_number}")
            title = str(record.get("title") or "")
            metadata: Dict[str, Any] = {key: value for key, value in record.items() if key not in {"id", "text", "contents", "context", "title"}}
            passages.append(Passage(id=passage_id, title=title, text=text, metadata=metadata))
    return passages


def build_index(corpus_path: str | Path, output_path: str | Path, embedding_dim: int = 384) -> None:
    passages = load_jsonl(corpus_path)
    embedder = HashingEmbedder(dim=embedding_dim)
    vectors = embedder.embed_batch(_passage_text(passage) for passage in passages)
    payload = {
        "embedding_dim": embedding_dim,
        "passages": [
            {
                "id": passage.id,
                "title": passage.title,
                "text": passage.text,
                "metadata": passage.metadata,
                "score": 0.0,
            }
            for passage in passages
        ],
        "vectors": vectors,
    }
    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")


def _passage_text(passage: Passage) -> str:
    if passage.title:
        return f"{passage.title}\n{passage.text}"
    return passage.text


def main() -> None:
    parser = argparse.ArgumentParser(description="Build a local hybrid retrieval index from JSONL passages.")
    parser.add_argument("--corpus", required=True, help="Path to JSONL with id/title/text fields.")
    parser.add_argument("--output", required=True, help="Destination index JSON path.")
    parser.add_argument("--embedding-dim", type=int, default=384)
    args = parser.parse_args()
    build_index(args.corpus, args.output, embedding_dim=args.embedding_dim)
    print(f"Wrote retrieval index to {args.output}")


if __name__ == "__main__":
    main()
