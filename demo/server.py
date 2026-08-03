"""Minimal REST server wrapping run_demo — for the Next.js platform.
Runs on port 7862 (separate from the Gradio UI on 7861).
"""
from __future__ import annotations

import json
import sys
import os
from pathlib import Path

os.environ.setdefault("GRADIO_ANALYTICS_ENABLED", "False")

# ── Add project root to path ──────────────────────────────────────────────────
ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

try:
    from http.server import BaseHTTPRequestHandler, HTTPServer
except ImportError:
    pass

from demo.app import run_demo  # reuse existing inference logic


class QueryHandler(BaseHTTPRequestHandler):

    def log_message(self, fmt, *args):  # silence default access log
        pass

    def do_OPTIONS(self):
        self._set_cors()
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        if self.path in ("/", "/health"):
            self._json(200, {"status": "ok"})
        else:
            self._json(404, {"error": "not found"})

    def do_POST(self):
        if self.path != "/query":
            self._json(404, {"error": "not found"})
            return

        length = int(self.headers.get("Content-Length", 0))
        raw    = self.rfile.read(length)
        try:
            body = json.loads(raw)
        except json.JSONDecodeError:
            self._json(400, {"error": "invalid JSON"})
            return

        query       = str(body.get("query", "")).strip()
        settings    = body.get("settings", {})
        top_k       = int(settings.get("topK", 3))
        index_path  = str(settings.get("indexPath", "data/pubmedqa_index.json"))
        backend     = str(settings.get("backend", "heuristic"))
        model_name  = str(settings.get("modelName", "heuristic"))
        use_4bit    = bool(settings.get("use4bit", True))
        answer_mode = str(settings.get("answerMode", "freeform"))

        if not query:
            self._json(400, {"error": "query is required"})
            return

        try:
            decision, ev_html, critiques_text, answer, meta_json = run_demo(
                query, top_k, index_path, backend, model_name, use_4bit, answer_mode
            )
        except Exception as exc:
            self._json(500, {"error": str(exc)})
            return

        # Parse meta and candidates from critiques_text (newline-separated JSON blocks)
        candidates = []
        for block in critiques_text.split("\n\n"):
            block = block.strip()
            if not block:
                continue
            try:
                c = json.loads(block)
                candidates.append({
                    "answer": "",
                    "passage": None,
                    "critique": {
                        "retrieve":  c.get("retrieve",  "[Retrieve]"),
                        "relevance": c.get("relevance", "Relevant"),
                        "support":   c.get("support",   "Partially supported"),
                        "utility":   c.get("utility",   3),
                        "score":     c.get("score",     0.5),
                    },
                    "score": c.get("score", 0.5),
                })
            except Exception:
                continue

        try:
            meta = json.loads(meta_json)
        except Exception:
            meta = {}

        self._json(200, {
            "query":             query,
            "answer":            answer,
            "retrieve_decision": decision,
            "backend":           meta.get("backend", backend),
            "model_name":        meta.get("model", model_name),
            "candidates":        candidates,
        })

    def _set_cors(self):
        self.send_header("Access-Control-Allow-Origin",  "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _json(self, status: int, data: dict):
        body = json.dumps(data).encode()
        self.send_response(status)
        self._set_cors()
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    port = int(os.environ.get("API_PORT", 7862))
    print(f"BioResearch API server starting on http://127.0.0.1:{port}", flush=True)
    server = HTTPServer(("127.0.0.1", port), QueryHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("Stopped.")
