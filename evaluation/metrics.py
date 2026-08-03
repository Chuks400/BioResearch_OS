from __future__ import annotations

import re
import string
from collections import Counter
from typing import Iterable, List


def normalize_answer(text: str) -> str:
    text = text.lower()
    text = "".join(ch for ch in text if ch not in string.punctuation)
    text = re.sub(r"\b(a|an|the)\b", " ", text)
    return " ".join(text.split())


def exact_match(prediction: str, answers: Iterable[str]) -> float:
    normalized_prediction = normalize_answer(prediction)
    return float(any(normalized_prediction == normalize_answer(answer) for answer in answers))


def token_f1(prediction: str, answers: Iterable[str]) -> float:
    prediction_tokens = normalize_answer(prediction).split()
    best = 0.0
    for answer in answers:
        answer_tokens = normalize_answer(answer).split()
        common = Counter(prediction_tokens) & Counter(answer_tokens)
        overlap = sum(common.values())
        if overlap == 0:
            continue
        precision = overlap / max(len(prediction_tokens), 1)
        recall = overlap / max(len(answer_tokens), 1)
        best = max(best, 2 * precision * recall / (precision + recall))
    return best


def accuracy(scores: List[float]) -> float:
    if not scores:
        return 0.0
    return sum(scores) / len(scores)
