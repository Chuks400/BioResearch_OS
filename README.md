# BioResearch OS

**Self-Reflective Retrieval-Augmented Generation for Biomedical Research**

Final Year Software Engineering Project | 2025-2026
Bala Muhammad Abubakar (312023705021) | Chukwu John Okike (312023704038)
Supervisor: Yuchen Zhang

---

## Overview

BioResearch OS implements the Self-RAG framework (Asai et al., ICLR 2024) over a
PubMedQA domain corpus, combined with a hybrid BM25 + dense retrieval engine and a
full-stack Next.js 15 enterprise research platform.

The system enables adaptive, transparent biomedical question answering:
- Retrieves evidence only when needed ([Retrieve]/[No Retrieve] reflection tokens)
- Critiques every retrieved passage for relevance, factual support, and quality
- Selects the best-supported answer using a weighted critique score
- Exposes every reasoning step in the user interface

---

## Dataset

**PubMedQA** -- Jin et al., EMNLP 2019
- 1,000 expert-labelled biomedical QA examples (PQA-L split)
- Each example: PubMed article title (question) + abstract (context) + yes/no/maybe label
- Source: https://pubmedqa.github.io/
- Full citation and licence: see `data/DATA_SOURCES.md`

The corpus files are included in this submission under `data/`:

| File | Contents |
|------|----------|
| `data/pubmedqa_corpus.jsonl` | 1,000 PubMedQA passages (one JSON per line) |
| `data/pubmedqa_index.json` | Pre-built hybrid retrieval index (BM25 + Blake2b) |
| `data/sample_corpus.jsonl` | Small 5-passage sample for quick local testing |
| `data/sample_index.json` | Pre-built index over the sample corpus |

**Self-RAG Model Checkpoint**
- HuggingFace: `selfrag/selfrag_llama2_7b` (Meta LLaMA-2-7B fine-tuned with Self-RAG)
- Paper: Asai et al., ICLR 2024 -- https://openreview.net/forum?id=hSyW5go0v8
- Not included in submission (7B parameters); downloaded at runtime by the HF backend

---

## Project Structure

```
BioResearch_OS/
|-- README.md                        This file
|-- requirements.txt                 Python dependencies (CPU)
|-- gpu-deps.txt                     Additional deps for HuggingFace GPU backend
|-- configs/
|   +-- config.yaml                  Project configuration
|-- data/
|   |-- DATA_SOURCES.md              Dataset attribution and citations  <-- READ THIS
|   |-- pubmedqa_corpus.jsonl        PubMedQA 1,000-passage corpus
|   |-- pubmedqa_index.json          Pre-built retrieval index
|   |-- sample_corpus.jsonl          5-passage sample corpus
|   +-- sample_index.json            Pre-built sample index
|-- retrieval/
|   |-- indexer.py                   Corpus tokenisation, BM25 stats, Blake2b embedding
|   |-- retriever.py                 Hybrid BM25 + dense retrieval (alpha=0.35, beta=0.65)
|   +-- embed.py                     Blake2b hash projection (128-dim, CPU-only)
|-- model/
|   |-- backends.py                  HeuristicBackend + HuggingFaceBackend (swappable)
|   |-- inference.py                 SelfRAGPipeline: retrieve -> critique -> select
|   |-- critique.py                  Reflection token parsing and critique scoring
|   +-- prompts.py                   Prompt templates for Self-RAG inference
|-- evaluation/
|   |-- evaluate.py                  Label-mode and token F1 evaluation CLI
|   |-- compare.py                   Side-by-side heuristic vs Self-RAG comparison
|   +-- metrics.py                   Exact match, F1, label accuracy implementations
|-- demo/
|   |-- app.py                       Gradio web demo (port 7861)
|   +-- server.py                    REST bridge (port 7862) for Next.js integration
|-- domain_adaptation/
|   |-- build_domain_index.py        PubMedQA corpus download + index build
|   +-- finetune_critic.py           LoRA domain critic fine-tuning (optional, GPU)
|-- scripts/
|   +-- check_environment.py         Environment verification (CUDA, packages, index)
|-- results/
|   |-- pubmedqa_heuristic_label_10.json    Heuristic label-mode results (10 examples)
|   |-- pubmedqa_heuristic_compare_10.json  Heuristic comparison results
|   |-- pubmedqa_hf_label_10.json           Self-RAG 7B label-mode results (10 examples)
|   |-- pubmedqa_hf_compare_10.json         Self-RAG 7B comparison results
|   +-- sample_hf_compare.json              HF backend sample run results
|-- platform/                        Next.js 15 frontend (BioResearch OS UI)
|   |-- app/                         Next.js App Router pages
|   |-- components/                  React components (layout, workspace, shared)
|   |-- store/                       Zustand state (workspace + UI)
|   |-- lib/                         API client, types, utilities
|   +-- package.json                 Node.js dependencies
|-- report_assets/                   Screenshots and diagrams used in the report
|-- results_summary.py               Script to print evaluation summary
|-- deliverables/
|   |-- Self_RAG_Report_v2.pdf       Final project report
|   |-- Self_RAG_Presentation_Final.pptx   Defense presentation (16 slides)
|   +-- Defense_Script_v2.docx       Two-person viva defense script
```

---

## Quick Start (CPU -- no GPU required)

```powershell
# 1. Install Python dependencies
pip install -r requirements.txt

# 2. Verify environment
python scripts/check_environment.py

# 3. Run a query (heuristic backend, CPU)
python -m model.inference --backend heuristic --index data/pubmedqa_index.json `
  --query "Do mitochondria play a role in programmed cell death?"

# 4. Run evaluation (10 examples, label-mode)
python -m evaluation.evaluate --backend heuristic --index data/pubmedqa_index.json `
  --dataset pubmedqa --limit 10 --label-mode --output results/my_heuristic_run.json

# 5. Launch Gradio demo
python -m demo.app
# Open http://localhost:7861
```

---

## GPU Reproduction (Self-RAG 7B)

Requires NVIDIA GPU with >= 16GB VRAM (tested on NVIDIA A40 24GB via RunPod).

```bash
pip install -r requirements.txt
pip install -r gpu-deps.txt

# Run inference
python -m model.inference --backend hf --index data/pubmedqa_index.json \
  --query "Do mitochondria play a role in programmed cell death?"

# Run evaluation
python -m evaluation.evaluate --backend hf --index data/pubmedqa_index.json \
  --dataset pubmedqa --limit 10 --label-mode --output results/hf_label_10.json
```

The HuggingFace backend automatically downloads `selfrag/selfrag_llama2_7b` (~14GB)
and applies 4-bit NF4 quantisation by default to reduce VRAM usage.

---

## Next.js Platform (BioResearch OS UI)

```powershell
cd platform
npm install
npm run dev
# Open http://localhost:3000

# In a separate terminal -- start the REST bridge
python demo/server.py
# REST bridge runs on http://127.0.0.1:7862
```

The Next.js frontend communicates with the Python backend via the REST bridge on port 7862.
Gradio demo (app.py) can run simultaneously on port 7861.

---

## Evaluation Results (Reproduced)

| Backend | Metric | Score | Dataset | Hardware |
|---------|--------|-------|---------|----------|
| Heuristic (CPU) | Label accuracy | 0% | PubMedQA, 10 examples | Laptop CPU |
| Self-RAG 7B (HF) | Label accuracy | 20% | PubMedQA, 10 examples | NVIDIA A40 (RunPod) |
| Heuristic (CPU) | Full pipeline latency | < 1s | -- | Laptop CPU |
| Self-RAG 7B (HF) | Per-query latency | ~53s | -- | NVIDIA A40 |

Note: Token F1 is not reported as the primary metric. PubMedQA gold answers are long
biomedical rationales while Self-RAG produces concise reflection-prefixed responses --
token F1 penalises brevity and produces misleading results on this dataset.
Label-mode accuracy (extracting yes/no/maybe) is the metric specified by the dataset authors.

---

## Key Design Decisions

**1. REST bridge (not Gradio queue API)**
Gradio 6's SSE queue returns `gr.update()` objects that are not JSON-serialisable.
`demo/server.py` is a stdlib HTTP server (~80 lines) that calls the pipeline directly,
returning clean JSON to Next.js.

**2. Blake2b hash projection**
Dense semantic embeddings without a trained encoder or GPU. `hashlib.blake2b(token).digest()`
produces a 128-dimensional float vector, mean-pooled across tokens. Zero training, zero FAISS,
runs in < 1ms on any laptop.

**3. Hybrid retrieval weights (alpha=0.35, beta=0.65)**
BM25 contributes 35% (exact lexical match) and Blake2b cosine similarity contributes 65%
(semantic match). This weighting favours semantic coverage for biomedical queries where
exact term overlap is insufficient.

---

## Citations

**Self-RAG (core method):**
```
@inproceedings{asai2024selfrag,
  title   = {Self-{RAG}: Learning to Retrieve, Generate, and Critique through Self-Reflection},
  author  = {Asai, Akari and Wu, Zeqiu and Wang, Yizhong and Sil, Avirup and Hajishirzi, Hannaneh},
  booktitle = {The Twelfth International Conference on Learning Representations},
  year    = {2024},
  url     = {https://openreview.net/forum?id=hSyW5go0v8}
}
```

**PubMedQA (dataset):**
```
@inproceedings{jin2019pubmedqa,
  title   = {PubMedQA: A Dataset for Biomedical Research Question Answering},
  author  = {Jin, Qiao and Dhingra, Bhuwan and Liu, Zhengping and Cohen, William W. and Lu, Xinghua},
  booktitle = {Proceedings of EMNLP-IJCNLP 2019},
  pages   = {2567--2577},
  year    = {2019},
  url     = {https://aclanthology.org/D19-1259}
}
```
