import type { QueryRequest, QueryResponse, ConversationSettings } from "./types";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://127.0.0.1:7862";

// ── Gradio API adapter ────────────────────────────────────────────────────────
// The Gradio backend exposes /run/predict. We proxy through /api/query
// to avoid CORS and to add our own enrichment.

export async function submitQuery(
  query: string,
  settings: ConversationSettings
): Promise<import("./types").QueryResult> {
  const response = await fetch("/api/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, settings }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error ?? `HTTP ${response.status}`);
  }
  return response.json() as Promise<import("./types").QueryResult>;
}

// ── Direct backend call (used by the API route, server-side) ─────────────────
// Calls demo/server.py (port 7862) — a plain HTTP server wrapping run_demo.

export async function callGradioBackend(
  query: string,
  settings: ConversationSettings,
): Promise<{ data: unknown[] }> {
  const res = await fetch(`${BACKEND_URL}/query`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ query, settings }),
    signal:  AbortSignal.timeout(120_000),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error((err as { error: string }).error ?? `HTTP ${res.status}`);
  }
  // server.py already returns a QueryResult-shaped object; wrap in {data:[]} for parseGradioResponse
  const result = await res.json();
  return { data: [result] };
}

// ── Default settings ──────────────────────────────────────────────────────────

export const DEFAULT_SETTINGS: ConversationSettings = {
  backend:    "heuristic",
  answerMode: "freeform",
  topK:       3,
  indexPath:  "data/pubmedqa_index.json",
  modelName:  "selfrag/selfrag_llama2_7b",
  use4bit:    true,
};

// ── Health check ──────────────────────────────────────────────────────────────

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${BACKEND_URL}/`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

// ── Parse Gradio response into our QueryResult format ────────────────────────

export function parseGradioResponse(
  gradio: { data: unknown[] },
  query: string
): import("./types").QueryResult {
  // data[0] is the full QueryResult object returned by demo/server.py
  const r = gradio.data[0] as import("./types").QueryResult | null;
  if (r && r.answer !== undefined) {
    return {
      ...r,
      query: r.query || query,
      answer: r.answer.replace(/`\[.*?\]`\s*/g, "").trim(),
    };
  }
  return {
    query,
    answer:            "No response received.",
    retrieve_decision: "[Retrieve]",
    backend:           "heuristic",
    model_name:        "heuristic",
    candidates:        [],
  };
}
