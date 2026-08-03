from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Dict, List


def _build_training_example(item: Dict[str, Any]) -> str:
    """Convert a QA+passage record to Self-RAG reflection-token format."""
    question = item.get("question", "")
    passage = item.get("context", item.get("passage", ""))
    label = str(item.get("label", item.get("answer", ""))).strip()

    if passage:
        overlap = len(set(question.lower().split()) & set(passage.lower().split()))
        relevance = "[Relevant]" if overlap > 0 else "[Irrelevant]"
        support = "[Fully supported]" if overlap >= 3 else "[Partially supported]"
        utility = min(5, max(2, 2 + overlap))
        return (
            f"Question: {question}\n"
            f"Passage: {passage}\n"
            f"{relevance}{support}Answer: {label}. [Utility:{utility}]"
        )
    return f"Question: {question}\n[No Retrieve]Answer: {label}. [Utility:3]"


def main() -> None:
    parser = argparse.ArgumentParser(
        description="LoRA fine-tuning of the Self-RAG critic on domain QA pairs."
    )
    parser.add_argument("--train-file", required=True, help="JSONL file with question/context/label records.")
    parser.add_argument("--base-model", default="selfrag/selfrag_llama2_7b")
    parser.add_argument("--output-dir", default="models/selfrag-domain-critic-lora")
    parser.add_argument("--lora-r", type=int, default=8)
    parser.add_argument("--lora-alpha", type=int, default=16)
    parser.add_argument("--lora-dropout", type=float, default=0.05)
    parser.add_argument("--epochs", type=int, default=3)
    parser.add_argument("--batch-size", type=int, default=4)
    parser.add_argument("--grad-accum", type=int, default=4)
    parser.add_argument("--lr", type=float, default=2e-4)
    parser.add_argument("--max-length", type=int, default=512)
    parser.add_argument("--no-4bit", action="store_true", help="Disable 4-bit quantization (requires more VRAM).")
    args = parser.parse_args()

    train_file = Path(args.train_file)
    if not train_file.exists():
        raise FileNotFoundError(f"Training file does not exist: {train_file}")

    try:
        import torch
        from datasets import Dataset
        from peft import LoraConfig, TaskType, get_peft_model
        from transformers import (
            AutoModelForCausalLM,
            AutoTokenizer,
            BitsAndBytesConfig,
            DataCollatorForLanguageModeling,
            Trainer,
            TrainingArguments,
        )
    except ImportError as exc:
        raise RuntimeError(
            "GPU dependencies required. Install via: pip install torch transformers accelerate peft bitsandbytes datasets"
        ) from exc

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    # Load training data
    items: List[Dict[str, Any]] = []
    with open(train_file, encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if line:
                items.append(json.loads(line))
    if not items:
        raise ValueError(f"No training examples found in {train_file}")
    print(f"Loaded {len(items)} training examples.")

    texts = [_build_training_example(item) for item in items]

    # Tokenizer
    tokenizer = AutoTokenizer.from_pretrained(args.base_model, use_fast=False)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    # Base model (optional 4-bit)
    quant_config = None
    if not args.no_4bit:
        quant_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_compute_dtype=torch.float16,
            bnb_4bit_use_double_quant=True,
        )
    model = AutoModelForCausalLM.from_pretrained(
        args.base_model,
        device_map="auto",
        torch_dtype=torch.float16,
        quantization_config=quant_config,
    )
    model.config.use_cache = False

    # LoRA adapter
    lora_config = LoraConfig(
        task_type=TaskType.CAUSAL_LM,
        r=args.lora_r,
        lora_alpha=args.lora_alpha,
        lora_dropout=args.lora_dropout,
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],
        bias="none",
    )
    model = get_peft_model(model, lora_config)
    model.print_trainable_parameters()

    # Tokenize
    def tokenize_fn(batch):
        encoded = tokenizer(
            batch["text"],
            truncation=True,
            max_length=args.max_length,
            padding="max_length",
        )
        encoded["labels"] = [ids[:] for ids in encoded["input_ids"]]
        return encoded

    dataset = Dataset.from_dict({"text": texts})
    tokenized = dataset.map(tokenize_fn, batched=True, remove_columns=["text"])

    training_args = TrainingArguments(
        output_dir=str(output_dir),
        num_train_epochs=args.epochs,
        per_device_train_batch_size=args.batch_size,
        gradient_accumulation_steps=args.grad_accum,
        learning_rate=args.lr,
        fp16=True,
        logging_steps=10,
        save_steps=100,
        save_total_limit=2,
        report_to="none",
        remove_unused_columns=False,
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=tokenized,
        data_collator=DataCollatorForLanguageModeling(tokenizer=tokenizer, mlm=False),
    )

    print(f"Starting LoRA fine-tuning: {len(tokenized)} examples, {args.epochs} epoch(s)...")
    trainer.train()

    model.save_pretrained(str(output_dir))
    tokenizer.save_pretrained(str(output_dir))
    print(f"LoRA adapter saved to {output_dir}")
    print("To load: PeftModel.from_pretrained(base_model, output_dir)")


if __name__ == "__main__":
    main()
