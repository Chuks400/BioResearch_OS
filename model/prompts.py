from __future__ import annotations

from typing import Optional


def format_prompt(query: str) -> str:
    return (
        "Instruction: Answer the question. Decide whether retrieval is needed, "
        "then use reflection tokens to assess grounding.\n"
        f"Question: {query.strip()}\n"
        "Answer:"
    )


def format_with_passage(query: str, passage: Optional[str]) -> str:
    base = format_prompt(query)
    if not passage:
        return base
    return f"{base}\nRetrieved passage:\n{passage.strip()}\nGrounded answer:"
