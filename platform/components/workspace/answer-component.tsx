"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Bookmark, ExternalLink, Zap, Brain, FlaskConical, CheckCircle2, AlertCircle, MinusCircle } from "lucide-react";
import { cn, confidenceToLabel, confidenceToPercent, stripReflectionTokens, getRetrieveStatus } from "@/lib/utils";
import type { QueryResult, Candidate } from "@/lib/types";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface AnswerComponentProps {
  result: QueryResult;
  isStreaming?: boolean;
}

export function AnswerComponent({ result, isStreaming }: AnswerComponentProps) {
  const [showEvidence,  setShowEvidence]  = useState(false);
  const [showReasoning, setShowReasoning] = useState(false);

  const cleanAnswer   = stripReflectionTokens(result.answer);
  const topCandidate  = result.candidates[0];
  const avgConfidence = result.candidates.length
    ? result.candidates.reduce((a, c) => a + c.score, 0) / result.candidates.length
    : 0;
  const { label: confLabel, color: confColor } = confidenceToLabel(avgConfidence);
  const retrieve = getRetrieveStatus(result.retrieve_decision);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-3"
    >
      {/* ── Main answer ─────────────────────────────────────── */}
      <div className={cn("ai-prose", isStreaming && "streaming-cursor")}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {cleanAnswer}
        </ReactMarkdown>
      </div>

      {!isStreaming && (
        <>
          {/* ── Meta row ──────────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {/* Retrieve decision */}
            <div className={cn("badge text-2xs", retrieve.color, retrieve.bg.replace("bg-", "bg-"))}>
              <div className={cn("w-1.5 h-1.5 rounded-full mr-1",
                retrieve.color.includes("success") ? "bg-success" : "bg-warning"
              )} />
              {retrieve.label}
            </div>

            {/* Confidence */}
            <div className={cn("badge badge-neutral text-2xs gap-1.5")}>
              <div className="w-10 h-1 bg-border rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${confidenceToPercent(avgConfidence)}%` }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className={cn("h-full rounded-full",
                    avgConfidence >= 0.8 ? "bg-success" :
                    avgConfidence >= 0.5 ? "bg-warning" : "bg-error"
                  )}
                />
              </div>
              <span className={confColor}>{confLabel} confidence</span>
              <span className="text-muted-dark">{confidenceToPercent(avgConfidence)}%</span>
            </div>

            {/* Backend */}
            <span className="badge badge-neutral text-2xs">{result.backend}</span>
          </div>

          {/* ── Evidence used ──────────────────────────────────── */}
          {result.candidates.filter((c) => c.passage).length > 0 && (
            <div className="border border-border/60 rounded-xl overflow-hidden">
              <button
                onClick={() => setShowEvidence(!showEvidence)}
                className="flex items-center justify-between w-full px-4 py-2.5 text-xs text-muted hover:text-foreground hover:bg-card/40 transition-all duration-100"
              >
                <div className="flex items-center gap-2">
                  <FlaskConical size={12} className="text-accent" />
                  <span className="font-medium">
                    Evidence used · {result.candidates.filter((c) => c.passage).length} sources
                  </span>
                </div>
                {showEvidence ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>

              <AnimatePresence>
                {showEvidence && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="border-t border-border/60 divide-y divide-border/40"
                  >
                    {result.candidates.filter((c) => c.passage).map((c, i) => (
                      <SourceCard key={i} candidate={c} index={i} />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* ── Reasoning ─────────────────────────────────────── */}
          {topCandidate && (
            <div className="border border-border/60 rounded-xl overflow-hidden">
              <button
                onClick={() => setShowReasoning(!showReasoning)}
                className="flex items-center justify-between w-full px-4 py-2.5 text-xs text-muted hover:text-foreground hover:bg-card/40 transition-all duration-100"
              >
                <div className="flex items-center gap-2">
                  <Brain size={12} className="text-accent/80" />
                  <span className="font-medium">Self-RAG reasoning</span>
                </div>
                {showReasoning ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>

              <AnimatePresence>
                {showReasoning && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="border-t border-border/60 p-4 space-y-3"
                  >
                    <ReasoningStep
                      icon={<Zap size={11} className="text-accent" />}
                      label="Retrieve decision"
                      value={topCandidate.critique.retrieve.replace(/\[|\]/g, "")}
                    />
                    <ReasoningStep
                      icon={<CheckCircle2 size={11} className="text-success" />}
                      label="Relevance"
                      value={topCandidate.critique.relevance}
                    />
                    <ReasoningStep
                      icon={<CheckCircle2 size={11} className="text-success" />}
                      label="Support level"
                      value={topCandidate.critique.support}
                    />
                    <ReasoningStep
                      icon={<Brain size={11} className="text-warning" />}
                      label="Utility"
                      value={`${topCandidate.critique.utility}/5`}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* ── Follow-up suggestions ─────────────────────────── */}
          <FollowUpSuggestions query={result.query} />
        </>
      )}
    </motion.div>
  );
}

// ── Source card (inline) ──────────────────────────────────────────────────────

function SourceCard({ candidate, index }: { candidate: Candidate; index: number }) {
  const [saved, setSaved] = useState(false);
  const p = candidate.passage!;

  return (
    <div className="flex gap-3 p-3 hover:bg-card/30 transition-colors group">
      <div className="w-5 h-5 rounded-md bg-accent/10 border border-accent/20 flex items-center justify-center text-2xs font-bold text-accent flex-shrink-0 mt-0.5">
        {index + 1}
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <p className="text-xs font-medium text-foreground leading-tight truncate-2">{p.title}</p>
        <p className="text-2xs text-muted leading-relaxed line-clamp-2">{p.text.slice(0, 160)}…</p>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-2xs text-muted-dark">
            <div className="w-12 h-0.5 bg-border rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full"
                style={{ width: `${Math.round(p.score * 100)}%` }}
              />
            </div>
            <span>{Math.round(p.score * 100)}%</span>
          </div>
          <span className="badge badge-neutral text-2xs">{candidate.critique.relevance}</span>
        </div>
      </div>
      <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => setSaved(!saved)}
          className={cn("p-1.5 rounded-md transition-all", saved ? "text-accent bg-accent/10" : "text-muted-dark hover:text-muted hover:bg-card")}
          title="Save source"
        >
          <Bookmark size={11} className={cn(saved && "fill-current")} />
        </button>
        <button className="p-1.5 rounded-md text-muted-dark hover:text-muted hover:bg-card transition-all" title="Open in PubMed">
          <ExternalLink size={11} />
        </button>
      </div>
    </div>
  );
}

// ── Reasoning step ────────────────────────────────────────────────────────────

function ReasoningStep({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-xs text-muted">
        {icon}
        {label}
      </div>
      <span className="text-xs text-foreground font-medium">{value}</span>
    </div>
  );
}

// ── Follow-up suggestions ─────────────────────────────────────────────────────

const FOLLOWUP_TEMPLATES = [
  (q: string) => `What are the underlying mechanisms in: "${q.slice(0, 45)}${q.length > 45 ? "…" : ""}"?`,
  (q: string) => `What clinical evidence supports findings related to this?`,
  (q: string) => `What do the most recent studies say on this topic?`,
];

function FollowUpSuggestions({ query }: { query: string }) {
  const suggestions = FOLLOWUP_TEMPLATES.map((fn) => fn(query));

  return (
    <div className="space-y-1.5 pt-1">
      <p className="text-2xs text-muted-dark font-medium uppercase tracking-wider px-1">Suggested follow-ups</p>
      <div className="flex flex-col gap-1">
        {suggestions.map((s, i) => (
          <button
            key={i}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card/60 border border-border/40 hover:bg-card hover:border-border text-xs text-muted hover:text-foreground transition-all duration-100 text-left group"
          >
            <span className="text-accent/60 group-hover:text-accent transition-colors">→</span>
            <span>{s}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
