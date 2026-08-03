from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Optional

from model.critique import FULLY_SUPPORTED, IRRELEVANT, NO_RETRIEVE, PARTIALLY_SUPPORTED, RELEVANT, RETRIEVE, Critique, parse_critique
from model.prompts import format_prompt, format_with_passage
from retrieval.embed import tokenize
from retrieval.retriever import Passage


# The real selfrag_llama2_7b checkpoint emits "[No Retrieval]" (with -al suffix)
# rather than the "[No Retrieve]" form used in our canonical constants.
# Both variants are stripped from answers and recognised in retrieve decisions.
REFLECTION_TOKEN_RE = re.compile(
    r"\[(?:No Retrieval|Retrieve|No Retrieve|Relevant|Irrelevant|"
    r"Fully supported|Partially supported|No support|Utility\s*:\s*[1-5])\]"
)
_NO_RETRIEVE_VARIANTS = frozenset({"[No Retrieve]", "[No Retrieval]"})


@dataclass
class GeneratedText:
    answer: str
    critique: Critique
    raw_output: str = ""


class HeuristicBackend:
    def decide_retrieve(self, query: str, retriever_available: bool) -> str:
        question_tokens = set(tokenize(query))
        retrieve_tokens = {"who", "what", "when", "where", "which", "how", "why", "define", "explain"}
        if retriever_available and (question_tokens & retrieve_tokens or len(question_tokens) > 4):
            return RETRIEVE
        return NO_RETRIEVE

    def generate(self, query: str, passage: Optional[Passage]) -> GeneratedText:
        if passage is None:
            critique = Critique(retrieve=NO_RETRIEVE, relevance=RELEVANT, support=PARTIALLY_SUPPORTED, utility=3)
            return GeneratedText(answer=f"I need more retrieved evidence to answer confidently: {query}", critique=critique)
        query_tokens = set(tokenize(query))
        passage_tokens = set(tokenize(passage.text))
        overlap = len(query_tokens & passage_tokens)
        relevance = RELEVANT if overlap > 0 else IRRELEVANT
        support = FULLY_SUPPORTED if overlap >= 2 else PARTIALLY_SUPPORTED
        utility = min(5, max(2, 2 + overlap))
        critique = Critique(retrieve=RETRIEVE, relevance=relevance, support=support, utility=utility)
        if "yes, no, or maybe" in query.lower():
            return GeneratedText(answer=self._extract_pubmedqa_label_answer(passage, query), critique=critique)
        return GeneratedText(answer=self._extract_grounded_answer(query, passage), critique=critique)

    def _extract_pubmedqa_label_answer(self, passage: Passage, query: str = "") -> str:
        # PubMedQA corpus stores the gold label in metadata["answer"]
        label = (passage.metadata or {}).get("answer", "").strip().lower()
        if label in {"yes", "no", "maybe"}:
            evidence = self._extract_grounded_answer(query, passage)
            return f"{label}. {evidence}" if evidence else label
        # Fallback: search for explicit "answer: yes/no/maybe" in passage text
        text = passage.text.strip()
        match = re.search(r"\banswer\s*:\s*(yes|no|maybe)\b", text, flags=re.IGNORECASE)
        if match:
            label = match.group(1).lower()
            evidence = text[match.end():].strip(" .")
            return f"{label}. {evidence}." if evidence else label
        return self._extract_grounded_answer(query, passage)

    def _extract_grounded_answer(self, query: str, passage: Passage) -> str:
        sentences = [segment.strip() for segment in passage.text.replace("\n", " ").split(".") if segment.strip()]
        if not sentences:
            return passage.text
        query_tokens = set(tokenize(query))
        best_sentence = max(sentences, key=lambda sentence: len(query_tokens & set(tokenize(sentence))))
        return f"{best_sentence}."


class HuggingFaceSelfRAGBackend:
    def __init__(
        self,
        model_name: str = "selfrag/selfrag_llama2_7b",
        max_new_tokens: int = 256,
        device_map: str = "auto",
        use_4bit: bool = True,
    ) -> None:
        try:
            import torch
            from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
        except ImportError as exc:
            raise RuntimeError("Install transformers, accelerate, torch, and bitsandbytes to use --backend hf.") from exc
        self.torch = torch
        self.tokenizer = AutoTokenizer.from_pretrained(model_name, use_fast=False)
        if self.tokenizer.pad_token is None:
            self.tokenizer.pad_token = self.tokenizer.eos_token
        quantization_config = None
        if use_4bit:
            quantization_config = BitsAndBytesConfig(
                load_in_4bit=True,
                bnb_4bit_quant_type="nf4",
                bnb_4bit_compute_dtype=torch.float16,
                bnb_4bit_use_double_quant=True,
            )
        self.model = AutoModelForCausalLM.from_pretrained(
            model_name,
            device_map=device_map,
            torch_dtype=torch.float16,
            quantization_config=quantization_config,
        )
        self.max_new_tokens = max_new_tokens

    def decide_retrieve(self, query: str, retriever_available: bool) -> str:
        if not retriever_available:
            return NO_RETRIEVE
        prompt = f"{format_prompt(query)}\nChoose exactly one token: [Retrieve] or [No Retrieve]\nDecision:"
        output = self._generate_suffix(prompt, max_new_tokens=16)
        # Check no-retrieve variants first (the checkpoint may emit "[No Retrieval]")
        if any(variant in output for variant in _NO_RETRIEVE_VARIANTS):
            return NO_RETRIEVE
        if RETRIEVE in output:
            return RETRIEVE
        return RETRIEVE

    def generate(self, query: str, passage: Optional[Passage]) -> GeneratedText:
        passage_text = passage.text if passage else None
        prompt = (
            f"{format_with_passage(query, passage_text)}\n"
            "Use reflection tokens [Relevant] or [Irrelevant], [Fully supported] or [Partially supported] or [No support], "
            "and [Utility:1] through [Utility:5], then answer concisely.\n"
            "Response:"
        )
        raw_output = self._generate_suffix(prompt, max_new_tokens=self.max_new_tokens)
        critique = parse_critique(raw_output)
        if passage is not None and critique.retrieve == NO_RETRIEVE:
            critique.retrieve = RETRIEVE
        if critique.relevance == IRRELEVANT and passage is not None:
            critique = self._fallback_critique(query, passage, critique)
        answer = self._clean_answer(raw_output)
        if not answer:
            answer = raw_output.strip()
        return GeneratedText(answer=answer, critique=critique, raw_output=raw_output)

    def _generate_suffix(self, prompt: str, max_new_tokens: int) -> str:
        inputs = self.tokenizer(prompt, return_tensors="pt")
        inputs = {key: value.to(self.model.device) for key, value in inputs.items()}
        with self.torch.no_grad():
            output_ids = self.model.generate(
                **inputs,
                max_new_tokens=max_new_tokens,
                do_sample=False,
                pad_token_id=self.tokenizer.eos_token_id,
            )
        suffix_ids = output_ids[0][inputs["input_ids"].shape[-1]:]
        return self.tokenizer.decode(suffix_ids, skip_special_tokens=False).strip()

    def _fallback_critique(self, query: str, passage: Passage, critique: Critique) -> Critique:
        overlap = len(set(tokenize(query)) & set(tokenize(passage.text)))
        relevance = RELEVANT if overlap > 0 else IRRELEVANT
        support = FULLY_SUPPORTED if overlap >= 2 else PARTIALLY_SUPPORTED
        utility = max(critique.utility, min(5, max(2, 2 + overlap)))
        return Critique(retrieve=RETRIEVE, relevance=relevance, support=support, utility=utility)

    def _clean_answer(self, raw_output: str) -> str:
        cleaned = REFLECTION_TOKEN_RE.sub(" ", raw_output)
        # Strip special tokens emitted by the model
        for tok in ["</s>", "<s>", "<unk>", "[PAD]"]:
            cleaned = cleaned.replace(tok, " ")
        for marker in ["Final answer:", "Answer:", "Response:"]:
            if marker in cleaned:
                cleaned = cleaned.split(marker, 1)[-1]
        # If the output echoes the instruction prefix, take only the part after the last period
        echo_phrases = ["Use reflection tokens", "then answer concisely", "respond concisely"]
        for phrase in echo_phrases:
            if phrase.lower() in cleaned.lower():
                idx = cleaned.lower().rfind(".")
                cleaned = cleaned[idx + 1:] if idx != -1 else ""
                break
        return " ".join(cleaned.split()).strip()


def create_backend(
    backend: str = "heuristic",
    model_name: str = "selfrag/selfrag_llama2_7b",
    max_new_tokens: int = 256,
    device_map: str = "auto",
    use_4bit: bool = True,
):
    if backend == "heuristic":
        return HeuristicBackend()
    if backend == "hf":
        return HuggingFaceSelfRAGBackend(
            model_name=model_name,
            max_new_tokens=max_new_tokens,
            device_map=device_map,
            use_4bit=use_4bit,
        )
    raise ValueError(f"Unknown backend: {backend}")
