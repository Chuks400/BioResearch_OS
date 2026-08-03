from __future__ import annotations

import argparse
import html as html_mod
import json
import os
from pathlib import Path
from typing import Any, Dict, List, Tuple

os.environ.setdefault("GRADIO_ANALYTICS_ENABLED", "False")
os.environ.setdefault("NO_PROXY", "127.0.0.1,localhost,::1")
os.environ.setdefault("no_proxy", "127.0.0.1,localhost,::1")

try:
    import gradio as gr
    from gradio import ChatMessage
except ImportError:
    gr = None
    ChatMessage = None

from model.inference import SelfRAGPipeline
from retrieval.indexer import build_index

DEFAULT_CORPUS  = Path("data/sample_corpus.jsonl")
DEFAULT_INDEX   = Path("data/sample_index.json")
DEMO_DEFAULT_INDEX = DEFAULT_INDEX
PIPELINE_CACHE: Dict[Tuple[str, str, str, bool], SelfRAGPipeline] = {}


# ── CSS ───────────────────────────────────────────────────────────────────────
APP_CSS = """
/* ── base ─────────────────────────────────────────────────────── */
*, *::before, *::after { box-sizing: border-box; margin: 0; }
body, .gradio-container { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; }
.gradio-container { max-width: 100% !important; padding: 0 !important; background: #fff !important; }
footer { display: none !important; }

/* ── layout: 2 columns, full height ──────────────────────────── */
.app-row { gap: 0 !important; flex-wrap: nowrap !important; min-height: 100vh; }
.app-row > .block { padding: 0 !important; }

/* ── sidebar ──────────────────────────────────────────────────── */
.sidebar {
    flex: 0 0 220px !important; width: 220px !important; max-width: 220px !important;
    background: #141414 !important; border-right: none !important;
    display: flex !important; flex-direction: column !important;
    min-height: 100vh; overflow: hidden; padding: 0 !important;
}
.sidebar > .wrap, .sidebar > div { background: transparent !important; padding: 0 !important; }

.sb-brand {
    padding: 20px 16px 16px;
    border-bottom: 1px solid #222;
}
.sb-name    { font-size: 14px; font-weight: 700; color: #fff; letter-spacing: -0.3px; }
.sb-tagline { font-size: 10.5px; color: #3a3a3a; margin-top: 3px; }

.sb-new button {
    width: 100% !important; margin: 10px 0 !important;
    background: transparent !important; border: 1px solid #2a2a2a !important;
    color: #888 !important; border-radius: 8px !important;
    font-size: 12.5px !important; padding: 8px 12px !important;
    transition: all 0.15s !important; cursor: pointer !important;
}
.sb-new button:hover { background: #1e1e1e !important; color: #ccc !important; border-color: #3a3a3a !important; }

.sb-new-wrap { padding: 0 10px; }

.sb-list {
    flex: 1; overflow-y: auto; padding: 4px 8px 12px;
    scrollbar-width: thin; scrollbar-color: #2a2a2a transparent;
}
.sb-list::-webkit-scrollbar { width: 3px; }
.sb-list::-webkit-scrollbar-thumb { background: #2a2a2a; }

.sb-section-label { font-size: 10px; font-weight: 700; color: #333; text-transform: uppercase; letter-spacing: 0.7px; padding: 12px 8px 4px; }

.conv-row {
    display: flex; align-items: center; gap: 8px;
    padding: 7px 10px; border-radius: 8px; cursor: pointer; margin-bottom: 1px;
}
.conv-row:hover { background: #1c1c1c; }
.conv-dot   { width: 6px; height: 6px; border-radius: 50%; background: #333; flex-shrink: 0; }
.conv-title { font-size: 12.5px; color: #888; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.conv-title:hover { color: #ccc; }

.sb-empty { font-size: 12px; color: #2e2e2e; padding: 20px 10px; line-height: 1.7; text-align: center; }

.sb-foot { padding: 12px 16px; border-top: 1px solid #1e1e1e; font-size: 10px; color: #2a2a2a; }

/* ── main column ──────────────────────────────────────────────── */
.main-col {
    flex: 1 1 auto !important; min-width: 0 !important;
    background: #fff !important; display: flex !important;
    flex-direction: column !important; padding: 0 !important;
}
.main-col > .wrap { padding: 0 !important; }

/* topbar */
.topbar {
    display: flex; align-items: center; justify-content: flex-end;
    padding: 10px 20px; border-bottom: 1px solid #f2f2f2;
    min-height: 48px; flex-shrink: 0; gap: 8px;
}
.gear-btn button {
    background: transparent !important; border: none !important;
    color: #bbb !important; font-size: 18px !important;
    padding: 4px 8px !important; cursor: pointer !important;
    border-radius: 6px !important; line-height: 1 !important;
    transition: color 0.15s, background 0.15s !important;
}
.gear-btn button:hover { color: #555 !important; background: #f4f4f4 !important; }

/* chat area */
.chat-wrap { flex: 1; min-height: 0; }

/* input pill */
.input-pill-wrap { padding: 10px 20px 8px; flex-shrink: 0; }
.input-pill {
    display: flex; align-items: flex-end; gap: 8px;
    background: #f9f9f9; border: 1px solid #e8e8e8;
    border-radius: 16px; padding: 10px 10px 10px 18px;
    box-shadow: 0 2px 12px rgba(0,0,0,.04);
    transition: border-color 0.2s, box-shadow 0.2s;
}
.input-pill:focus-within {
    border-color: #c8c8c8; background: #fff;
    box-shadow: 0 4px 20px rgba(0,0,0,.07);
}
.input-pill textarea, .input-pill .wrap, .input-pill .block, .input-pill .form {
    border: none !important; box-shadow: none !important;
    background: transparent !important; padding: 0 !important;
}
.send-btn button {
    background: #111 !important; color: #fff !important;
    border: none !important; border-radius: 10px !important;
    padding: 9px 18px !important; font-size: 13px !important; font-weight: 600 !important;
    cursor: pointer !important; transition: background 0.15s !important; min-width: 68px !important;
}
.send-btn button:hover { background: #333 !important; }

/* example chips */
.chip-row { padding: 6px 20px 12px; }
.chip-row .examples-holder { display: flex !important; flex-wrap: wrap !important; gap: 8px !important; }
.chip-row .examples-holder button {
    background: #f5f5f5 !important; border: 1px solid #eaeaea !important;
    border-radius: 99px !important; font-size: 12px !important; color: #555 !important;
    padding: 6px 14px !important; cursor: pointer !important; transition: all 0.15s !important;
}
.chip-row .examples-holder button:hover { background: #eee !important; border-color: #ddd !important; color: #111 !important; }

/* retrieval detail toggle */
.detail-toggle { padding: 0 20px 6px; }
.detail-toggle button {
    background: transparent !important; border: none !important;
    color: #bbb !important; font-size: 12px !important; cursor: pointer !important;
    padding: 4px 0 !important; transition: color 0.15s !important;
}
.detail-toggle button:hover { color: #666 !important; }

/* evidence panel */
.ev-panel { padding: 0 20px 16px; border-top: 1px solid #f2f2f2; }
.ev-card {
    background: #fafafa; border: 1px solid #f0f0f0; border-radius: 10px;
    padding: 12px 14px; margin-bottom: 8px; font-size: 12.5px; line-height: 1.6; color: #444;
}
.ev-card-head { font-weight: 700; font-size: 12px; color: #111; margin-bottom: 4px; }
.ev-card-meta { font-size: 10.5px; color: #bbb; font-family: monospace; margin-bottom: 6px; }

/* ── chatbot bubbles ──────────────────────────────────────────── */
.message.user {
    background: #f4f4f4 !important;
    border-radius: 18px 18px 4px 18px !important;
}
.message.user, .message.user .prose, .message.user .prose p,
.message.user .prose span, .message.user .prose code,
.message.user .prose strong, .message.user .prose em,
.message.user p, .message.user span { color: #111 !important; }

.message.bot {
    background: transparent !important;
}
.message.bot .prose { font-size: 14.5px !important; line-height: 1.7 !important; color: #111 !important; }
.message.bot .prose p { color: #111 !important; }
.message.bot .prose code {
    background: #f4f4f4 !important; border-radius: 4px !important;
    padding: 1px 5px !important; font-size: 12.5px !important;
}

/* ── settings overlay (position:fixed, right side) ────────────── */
.settings-overlay {
    position: fixed !important;
    top: 0 !important; right: 0 !important;
    width: 290px !important; height: 100vh !important;
    background: #fff !important; z-index: 1000 !important;
    border-left: 1px solid #ebebeb !important;
    box-shadow: -8px 0 40px rgba(0,0,0,.10) !important;
    overflow-y: auto !important; padding: 24px 20px !important;
    display: flex !important; flex-direction: column !important; gap: 2px !important;
}
.settings-overlay > .wrap { padding: 0 !important; gap: 0 !important; }
.settings-overlay label { font-size: 12px !important; font-weight: 600 !important; color: #555 !important; }
.settings-overlay .info  { font-size: 11px !important; color: #bbb !important; }
.close-btn button {
    background: transparent !important; border: none !important;
    color: #aaa !important; font-size: 18px !important; cursor: pointer !important;
    padding: 0 !important; float: right !important;
}
.close-btn button:hover { color: #333 !important; }
.settings-divider { border: none; border-top: 1px solid #f0f0f0; margin: 12px 0; }

/* general */
button.primary, .primary { background: #111 !important; border-color: #111 !important; color: #fff !important; border-radius: 8px !important; font-weight: 600 !important; }
button.secondary { border-radius: 8px !important; font-size: 12px !important; }
input[type="range"]    { accent-color: #111 !important; }
input[type="checkbox"] { accent-color: #111 !important; }

/* dark mode */
.dark .gradio-container, .dark .main-col { background: #111 !important; }
.dark .topbar { border-color: #222 !important; }
.dark .input-pill { background: #1a1a1a !important; border-color: #2a2a2a !important; }
.dark .input-pill:focus-within { background: #1f1f1f !important; border-color: #444 !important; }
.dark .send-btn button { background: #fff !important; color: #000 !important; }
.dark .message.user { background: #1e1e1e !important; }
.dark .message.user, .dark .message.user .prose,
.dark .message.user .prose p, .dark .message.user p,
.dark .message.user span { color: #eee !important; }
.dark .message.bot .prose { color: #ddd !important; }
.dark .message.bot .prose p { color: #ddd !important; }
.dark .settings-overlay { background: #161616 !important; border-color: #2a2a2a !important; }
"""

INIT_JS = """
() => {
    window.selectConv = function(idx) {
        const el = document.querySelector('#conv_selector textarea');
        if (el) { el.value = String(idx); el.dispatchEvent(new Event('input', { bubbles: true })); }
    };
}
"""


# ── Pipeline helpers ──────────────────────────────────────────────────────────

def ensure_sample_index() -> Path:
    if not DEFAULT_INDEX.exists():
        build_index(DEFAULT_CORPUS, DEFAULT_INDEX)
    return DEFAULT_INDEX


def get_pipeline(index_path_text: str, backend: str, model_name: str, use_4bit: bool) -> SelfRAGPipeline:
    index_path = Path(index_path_text.strip() or str(DEMO_DEFAULT_INDEX))
    if index_path == DEFAULT_INDEX:
        ensure_sample_index()
    key = (str(index_path), backend, model_name, use_4bit)
    if key not in PIPELINE_CACHE:
        PIPELINE_CACHE[key] = SelfRAGPipeline.from_index(
            str(index_path), backend=backend, model_name=model_name, use_4bit=use_4bit,
        )
    return PIPELINE_CACHE[key]


# ── Inference ─────────────────────────────────────────────────────────────────

def run_demo(
    query: str, top_k: int,
    index_path_text: str = str(DEFAULT_INDEX),
    backend: str = "heuristic",
    model_name: str = "selfrag/selfrag_llama2_7b",
    use_4bit: bool = True,
    answer_mode: str = "freeform",
) -> Tuple[str, str, str, str, str]:
    pipeline = get_pipeline(index_path_text, backend, model_name, use_4bit)
    result = pipeline.answer(query, top_k=top_k, answer_mode=answer_mode)
    return (
        result["retrieve_decision"],
        _format_evidence_html(result),
        _format_critique_json(result),
        result["answer"],
        json.dumps({"backend": result["backend"], "model": result["model_name"],
                    "answer_mode": answer_mode, "retrieve_decision": result["retrieve_decision"],
                    "top_k": top_k, "index": index_path_text}, indent=2),
    )


def _format_evidence_html(result: Dict[str, Any]) -> str:
    cards = []
    for i, c in enumerate(result["candidates"], 1):
        p = c.get("passage")
        if not p:
            continue
        title = html_mod.escape(p["title"] or p["id"])
        text  = html_mod.escape(p["text"][:300]) + ("…" if len(p["text"]) > 300 else "")
        cards.append(
            f'<div class="ev-card">'
            f'<div class="ev-card-head">[{i}] {title}</div>'
            f'<div class="ev-card-meta">retrieval {p["score"]:.3f} · critique {c["critique"].get("score", 0):.2f}</div>'
            f'{text}</div>'
        )
    return "".join(cards) or "<p style='color:#ccc;font-size:13px'>No retrieval used.</p>"


def _format_critique_json(result: Dict[str, Any]) -> str:
    return "\n\n".join(json.dumps(c["critique"], indent=2, ensure_ascii=False) for c in result["candidates"])


# ── Conversation helpers ──────────────────────────────────────────────────────

def _conv_html(conversations: list) -> str:
    if not conversations:
        return '<div class="sb-empty">Your conversations<br>will appear here</div>'
    rows = ['<div class="sb-section-label">Recent</div>']
    for i, c in enumerate(reversed(conversations)):
        idx   = len(conversations) - 1 - i
        title = html_mod.escape((c["title"][:36] + "…") if len(c["title"]) > 36 else c["title"])
        rows.append(
            f'<div class="conv-row" onclick="selectConv({idx})">'
            f'<div class="conv-dot"></div>'
            f'<div class="conv-title">{title}</div>'
            f'</div>'
        )
    return "\n".join(rows)


def _to_msg(m: Any) -> "ChatMessage":
    if isinstance(m, ChatMessage):
        return m
    return ChatMessage(content=m.get("content", ""), role=m.get("role", "assistant"))


def _msgs_to_dicts(history: list) -> list:
    return [{"role": (m.role if isinstance(m, ChatMessage) else m.get("role")),
             "content": (m.content if isinstance(m, ChatMessage) else m.get("content"))} for m in history]


def _dicts_to_msgs(history: list) -> list:
    return [ChatMessage(role=d["role"], content=d["content"]) for d in history]


# ── Event handlers ────────────────────────────────────────────────────────────

EMPTY_EV = "<p style='color:#ccc;font-size:13px;padding:8px 0'>Evidence will appear here after a query.</p>"


def chat_response(
    message, history, top_k, index_path_text, backend, model_name,
    use_4bit, answer_mode, conversations, current_conv_id, ev_open,
):
    if not message.strip():
        return history or [], "", gr.update(), gr.update(), gr.update(), gr.update(), gr.update(), _conv_html(conversations), conversations, current_conv_id, ev_open

    updated = [_to_msg(m) for m in (history or [])]

    try:
        decision, ev_html, critiques, answer, meta = run_demo(
            message, top_k, index_path_text, backend, model_name, use_4bit, answer_mode,
        )
    except Exception as exc:
        updated += [ChatMessage(content=message, role="user"),
                    ChatMessage(content=f"**Error:** {exc}", role="assistant")]
        return updated, "", gr.update(), gr.update(), gr.update(), gr.update(), gr.update(), _conv_html(conversations), conversations, current_conv_id, ev_open

    using_sample = Path(index_path_text.strip() or str(DEMO_DEFAULT_INDEX)) == DEFAULT_INDEX
    note = ("\n\n> **Note:** Sample index (15 entries). Switch index to `data/pubmedqa_index.json` for full biomedical retrieval."
            if using_sample else "")
    badge = "`[Retrieve]`" if "[Retrieve]" in decision and "[No" not in decision else "`[No Retrieve]`"
    reply = f"{answer}\n\n<sub>{badge} &nbsp; `{backend}` &nbsp; `{answer_mode}`</sub>{note}"

    updated += [ChatMessage(content=message, role="user"),
                ChatMessage(content=reply, role="assistant")]

    conv_entry = {"title": message, "history": _msgs_to_dicts(updated),
                  "index_path": index_path_text, "backend": backend, "answer_mode": answer_mode}
    new_convs = list(conversations)
    if current_conv_id < 0 or current_conv_id >= len(new_convs):
        new_convs.append(conv_entry)
        new_id = len(new_convs) - 1
    else:
        new_convs[current_conv_id] = conv_entry
        new_id = current_conv_id

    return (
        updated, "",
        ev_html, critiques, decision, meta,
        gr.update(visible=True, value="↑ Hide retrieval details" if ev_open else "↓ View retrieval details"),
        _conv_html(new_convs), new_convs, new_id, ev_open,
    )


def toggle_evidence(ev_open: bool):
    new_state = not ev_open
    return (gr.update(visible=new_state),
            gr.update(value="↑ Hide retrieval details" if new_state else "↓ View retrieval details"),
            new_state)


def toggle_settings(settings_visible: bool):
    new_state = not settings_visible
    return gr.update(visible=new_state), new_state


def new_chat():
    return [], "", EMPTY_EV, "", "", "", gr.update(visible=False, value="↓ View retrieval details"), -1, False


def load_conversation(conv_idx_str: str, conversations: list):
    try:
        idx  = int(conv_idx_str.strip())
        conv = conversations[idx]
        return (_dicts_to_msgs(conv.get("history", [])),
                conv.get("index_path", str(DEMO_DEFAULT_INDEX)),
                conv.get("backend", "heuristic"),
                conv.get("answer_mode", "freeform"))
    except (ValueError, IndexError, TypeError):
        return [], str(DEMO_DEFAULT_INDEX), "heuristic", "freeform"


# ── Build app ─────────────────────────────────────────────────────────────────

def build_app() -> Any:
    if gr is None:
        raise RuntimeError("Install gradio: pip install gradio")

    with gr.Blocks(title="Self-RAG") as app:

        # ── Persistent state ─────────────────────────────────────
        conversations    = gr.State([])
        current_conv_id  = gr.State(-1)
        settings_visible = gr.State(False)
        ev_open          = gr.State(False)

        # ── Two-column row ───────────────────────────────────────
        with gr.Row(elem_classes=["app-row"], equal_height=False):

            # ── Sidebar ──────────────────────────────────────────
            with gr.Column(scale=0, min_width=220, elem_classes=["sidebar"]):
                gr.HTML(
                    '<div class="sb-brand">'
                    '<div class="sb-name">Self-RAG</div>'
                    '<div class="sb-tagline">Biomedical Assistant · Asai et al. ICLR 2024</div>'
                    '</div>'
                )
                with gr.Column(elem_classes=["sb-new-wrap"]):
                    new_chat_btn = gr.Button("＋  New conversation", elem_classes=["sb-new"], size="sm")
                conv_html = gr.HTML(
                    '<div class="sb-empty">Your conversations<br>will appear here</div>',
                    elem_classes=["sb-list"],
                )
                conv_selector = gr.Textbox(visible=False, value="", elem_id="conv_selector")
                gr.HTML('<div class="sb-foot">selfrag/selfrag_llama2_7b</div>')

            # ── Main column ──────────────────────────────────────
            with gr.Column(scale=1, min_width=460, elem_classes=["main-col"]):

                # Top bar — just the gear button
                with gr.Row(elem_classes=["topbar"]):
                    gear_btn = gr.Button("⚙", elem_classes=["gear-btn"], size="sm")

                # Chat
                chatbot = gr.Chatbot(
                    label="", height=560, show_label=False,
                    elem_classes=["chat-wrap"],
                    placeholder=(
                        "<div style='text-align:center;padding:90px 30px'>"
                        "<div style='font-size:42px;margin-bottom:18px'>🧬</div>"
                        "<div style='font-size:22px;font-weight:700;color:#111;letter-spacing:-0.5px'>"
                        "What shall we investigate?</div>"
                        "<div style='font-size:13.5px;color:#aaa;margin-top:10px;line-height:1.7'>"
                        "Ask a biomedical question — I'll retrieve evidence,<br>"
                        "reflect with Self-RAG tokens, and give a grounded answer.</div>"
                        "</div>"
                    ),
                )

                # Input pill
                with gr.Column(elem_classes=["input-pill-wrap"]):
                    with gr.Row(elem_classes=["input-pill"]):
                        query = gr.Textbox(
                            show_label=False,
                            placeholder="Ask a biomedical question…",
                            lines=1, max_lines=6, container=False, scale=9,
                        )
                        run = gr.Button("Send", variant="primary", scale=1,
                                        min_width=68, size="lg", elem_classes=["send-btn"])

                # Example chips
                gr.Examples(
                    examples=[
                        "Do mitochondria play a role in remodelling lace plant leaves during PCD?",
                        "What does Self-RAG decide before retrieval?",
                        "How does BM25 sparse retrieval work?",
                        "What is LoRA fine-tuning used for?",
                    ],
                    inputs=query, label=None,
                )

                # Retrieval detail toggle button (hidden until first query)
                detail_btn = gr.Button(
                    "↓ View retrieval details",
                    visible=False, size="sm",
                    elem_classes=["detail-toggle"],
                )

                # Evidence panel (hidden until toggled)
                with gr.Column(visible=False, elem_classes=["ev-panel"]) as ev_col:
                    with gr.Tabs():
                        with gr.Tab("Evidence"):
                            passages = gr.HTML(EMPTY_EV)
                        with gr.Tab("Critique"):
                            critiques = gr.Code(label="", language="json", lines=10)
                        with gr.Tab("Meta"):
                            decision = gr.Textbox(label="Retrieve decision", interactive=False)
                            metadata = gr.Code(label="", language="json", lines=8)

        # ── Settings overlay (fixed, right side) ─────────────────
        with gr.Column(visible=False, elem_classes=["settings-overlay"]) as settings_col:
            with gr.Row():
                gr.Markdown("### Settings")
                close_btn = gr.Button("✕", elem_classes=["close-btn"], size="sm")
            backend = gr.Dropdown(
                label="Backend", choices=["heuristic", "hf"], value="heuristic",
                info="heuristic = instant local  ·  hf = real GPU model",
            )
            answer_mode = gr.Dropdown(
                label="Answer mode", choices=["freeform", "pubmedqa_label"], value="freeform",
                info="pubmedqa_label → yes / no / maybe",
            )
            top_k = gr.Slider(label="Top-K passages", minimum=1, maximum=10, value=3, step=1)
            use_4bit = gr.Checkbox(label="4-bit quantization (GPU)", value=True)
            gr.HTML('<hr class="settings-divider">')
            gr.Markdown("**Index & model**")
            index_path = gr.Textbox(
                label="Index path", value=str(DEMO_DEFAULT_INDEX),
                info="data/pubmedqa_index.json for full biomedical retrieval on GPU.",
            )
            model_name = gr.Textbox(label="HF model", value="selfrag/selfrag_llama2_7b")
            gr.HTML('<hr class="settings-divider">')
            clear_btn = gr.Button("Clear conversation", variant="secondary", size="sm")

        # ── Wire events ──────────────────────────────────────────
        _ins = [query, chatbot, top_k, index_path, backend, model_name,
                use_4bit, answer_mode, conversations, current_conv_id, ev_open]
        _outs = [chatbot, query, passages, critiques, decision, metadata,
                 detail_btn, conv_html, conversations, current_conv_id, ev_open]

        run.click(chat_response, inputs=_ins, outputs=_outs)
        query.submit(chat_response, inputs=_ins, outputs=_outs)

        detail_btn.click(toggle_evidence, inputs=[ev_open], outputs=[ev_col, detail_btn, ev_open])

        gear_btn.click(toggle_settings, inputs=[settings_visible], outputs=[settings_col, settings_visible])
        close_btn.click(toggle_settings, inputs=[settings_visible], outputs=[settings_col, settings_visible])

        _new_outs = [chatbot, query, passages, critiques, decision, metadata, detail_btn, current_conv_id, ev_open]
        new_chat_btn.click(new_chat, outputs=_new_outs)
        clear_btn.click(new_chat, outputs=_new_outs)

        conv_selector.change(load_conversation, inputs=[conv_selector, conversations],
                             outputs=[chatbot, index_path, backend, answer_mode])

    return app


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--server-name", default="127.0.0.1")
    parser.add_argument("--server-port", type=int, default=None)
    args = parser.parse_args()
    build_app().launch(
        server_name=args.server_name,
        server_port=args.server_port,
        inbrowser=True,
        share=False,
        theme=gr.themes.Default(
            font=gr.themes.GoogleFont("Inter"),
            primary_hue="neutral",
            neutral_hue="slate",
        ),
        css=APP_CSS,
        js=INIT_JS,
    )
