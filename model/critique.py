from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Dict


RETRIEVE = "[Retrieve]"
NO_RETRIEVE = "[No Retrieve]"
RELEVANT = "[Relevant]"
IRRELEVANT = "[Irrelevant]"
FULLY_SUPPORTED = "[Fully supported]"
PARTIALLY_SUPPORTED = "[Partially supported]"
NO_SUPPORT = "[No support]"
UTILITY_RE = re.compile(r"\[Utility\s*:\s*([1-5])\]")


@dataclass
class Critique:
    retrieve: str = NO_RETRIEVE
    relevance: str = IRRELEVANT
    support: str = NO_SUPPORT
    utility: int = 1

    @property
    def is_rel(self) -> float:
        return 1.0 if self.relevance == RELEVANT else 0.0

    @property
    def is_sup(self) -> float:
        if self.support == FULLY_SUPPORTED:
            return 1.0
        if self.support == PARTIALLY_SUPPORTED:
            return 0.5
        return 0.0

    @property
    def is_use(self) -> float:
        return self.utility / 5.0

    def score(self, w_rel: float = 0.2, w_sup: float = 0.5, w_use: float = 0.3) -> float:
        return w_rel * self.is_rel + w_sup * self.is_sup + w_use * self.is_use

    def as_dict(self) -> Dict[str, object]:
        return {
            "retrieve": self.retrieve,
            "relevance": self.relevance,
            "support": self.support,
            "utility": self.utility,
            "score": self.score(),
        }


_NO_RETRIEVE_VARIANTS = frozenset({"[No Retrieve]", "[No Retrieval]"})


def parse_critique(text: str) -> Critique:
    # Handle both "[No Retrieve]" (canonical) and "[No Retrieval]" (actual checkpoint output)
    if any(v in text for v in _NO_RETRIEVE_VARIANTS):
        retrieve = NO_RETRIEVE
    elif RETRIEVE in text:
        retrieve = RETRIEVE
    else:
        retrieve = NO_RETRIEVE
    relevance = RELEVANT if RELEVANT in text else IRRELEVANT
    if FULLY_SUPPORTED in text:
        support = FULLY_SUPPORTED
    elif PARTIALLY_SUPPORTED in text:
        support = PARTIALLY_SUPPORTED
    else:
        support = NO_SUPPORT
    match = UTILITY_RE.search(text)
    utility = int(match.group(1)) if match else 1
    return Critique(retrieve=retrieve, relevance=relevance, support=support, utility=utility)
