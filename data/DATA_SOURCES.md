# Dataset Sources and Attribution

## Primary Dataset: PubMedQA

**Name:** PubMedQA: A Dataset for Biomedical Research Question Answering
**Version:** Labelled split (PQA-L), 1,000 expert-annotated examples used
**Source URL:** https://pubmedqa.github.io/
**GitHub:** https://github.com/pubmedqa/pubmedqa
**Hugging Face:** https://huggingface.co/datasets/pubmed_qa

### Citation

```
@inproceedings{jin2019pubmedqa,
  title     = {PubMedQA: A Dataset for Biomedical Research Question Answering},
  author    = {Jin, Qiao and Dhingra, Bhuwan and Liu, Zhengping and Cohen, William W. and Lu, Xinghua},
  booktitle = {Proceedings of the 2019 Conference on Empirical Methods in Natural Language Processing
               and the 9th International Joint Conference on Natural Language Processing (EMNLP-IJCNLP)},
  pages     = {2567--2577},
  year      = {2019},
  publisher = {Association for Computational Linguistics},
  url       = {https://aclanthology.org/D19-1259}
}
```

### Description

PubMedQA is a closed-domain biomedical question answering dataset constructed from PubMed abstracts.
Each example consists of:
- A research question (derived from the title of a PubMed article)
- A context passage (the abstract body of that article)
- A gold label: **yes**, **no**, or **maybe**
- A long-form reasoning answer (the conclusion section)

The 1,000 labelled examples (PQA-L) used in this project were annotated by domain experts (medical researchers) and represent questions with definitive yes/no/maybe answers grounded in the abstract text.

### Files in this project derived from PubMedQA

| File | Description |
|------|-------------|
| `data/pubmedqa_corpus.jsonl` | 1,000 PubMedQA labelled passages, one JSON object per line |
| `data/pubmedqa_index.json` | Pre-built hybrid retrieval index (BM25 + Blake2b) over the corpus above |
| `self_rag_results/data/pubmedqa_corpus.jsonl` | Duplicate copy used during GPU evaluation run |
| `self_rag_results/data/pubmedqa_index.json` | Duplicate index copy used during GPU evaluation run |

### Schema of pubmedqa_corpus.jsonl

Each line is a JSON object with the following fields:

```json
{
  "id":     "<PubMed article PMID>",
  "title":  "<Article title, also used as the research question>",
  "text":   "<Abstract body text used as the retrieval passage>",
  "answer": "<Gold label: yes | no | maybe>"
}
```

The `id` field corresponds directly to the PubMed article PMID, allowing full traceability
back to the original source article at https://pubmed.ncbi.nlm.nih.gov/<id>/

### Licence

PubMedQA is released by the original authors for research use.
See the dataset repository for the full licence: https://github.com/pubmedqa/pubmedqa/blob/master/LICENSE

---

## Self-RAG Model Checkpoint

**Name:** selfrag/selfrag_llama2_7b
**Source:** HuggingFace Hub -- https://huggingface.co/selfrag/selfrag_llama2_7b
**Base model:** Meta LLaMA-2-7B
**Paper:** Asai et al., "Self-RAG: Learning to Retrieve, Generate, and Critique through Self-Reflection", ICLR 2024

```
@inproceedings{asai2024selfrag,
  title     = {Self-{RAG}: Learning to Retrieve, Generate, and Critique through Self-Reflection},
  author    = {Asai, Akari and Wu, Zeqiu and Wang, Yizhong and Sil, Avirup and Hajishirzi, Hannaneh},
  booktitle = {The Twelfth International Conference on Learning Representations},
  year      = {2024},
  url       = {https://openreview.net/forum?id=hSyW5go0v8}
}
```

---

## Underlying Data Source: PubMed

The abstracts in PubMedQA originate from PubMed, operated by the
National Center for Biotechnology Information (NCBI), U.S. National Library of Medicine.

**URL:** https://pubmed.ncbi.nlm.nih.gov/
**Operator:** NCBI / U.S. National Library of Medicine

PubMed abstracts are in the public domain under the NLM copyright policy.
See: https://www.ncbi.nlm.nih.gov/home/about/policies/
