from __future__ import annotations

import hashlib
import math
import re
from typing import Iterable, List

TOKEN_RE = re.compile(r"[A-Za-z0-9]+")


def tokenize(text: str) -> List[str]:
    return TOKEN_RE.findall(text.lower())


class HashingEmbedder:
    def __init__(self, dim: int = 384) -> None:
        self.dim = dim

    def embed_text(self, text: str) -> List[float]:
        vector = [0.0] * self.dim
        for token in tokenize(text):
            digest = hashlib.blake2b(token.encode("utf-8"), digest_size=8).digest()
            bucket = int.from_bytes(digest[:4], "little") % self.dim
            sign = 1.0 if digest[4] % 2 == 0 else -1.0
            vector[bucket] += sign
        return normalize(vector)

    def embed_batch(self, texts: Iterable[str]) -> List[List[float]]:
        return [self.embed_text(text) for text in texts]


def normalize(vector: List[float]) -> List[float]:
    norm = math.sqrt(sum(value * value for value in vector))
    if norm == 0.0:
        return vector
    return [value / norm for value in vector]


def dot(left: List[float], right: List[float]) -> float:
    return sum(a * b for a, b in zip(left, right))
