"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookMarked, FileText, Tag, StickyNote, BarChart3, X, ExternalLink, Star, Trash2 } from "lucide-react";
import { cn, timeAgo, confidenceToLabel, confidenceToPercent } from "@/lib/utils";
import { useUIStore } from "@/store/ui";
import { useWorkspaceStore } from "@/store/workspace";
import type { QueryResult } from "@/lib/types";

interface RightPanelProps {
  lastResult?: QueryResult | null;
}

type RightTab = "evidence" | "sources" | "citations" | "notes" | "stats";

export function RightPanel({ lastResult = null }: RightPanelProps = {}) {
  const { panels } = useUIStore();
  const [activeTab, setActiveTab] = useState<RightTab>("evidence");
  const { savedSources, saveSource, removeSource } = useWorkspaceStore();

  const TABS: { id: RightTab; icon: React.ElementType; label: string }[] = [
    { id: "evidence",  icon: BarChart3,   label: "Evidence"  },
    { id: "sources",   icon: BookMarked,  label: "Sources"   },
    { id: "citations", icon: FileText,    label: "Citations" },
    { id: "notes",     icon: StickyNote,  label: "Notes"     },
    { id: "stats",     icon: BarChart3,   label: "Stats"     },
  ];

  return (
    <AnimatePresence>
      {panels.rightPanel && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: panels.rightPanelWidth, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          className="flex flex-col bg-sidebar border-l border-border overflow-hidden flex-shrink-0"
          style={{ minHeight: "100vh" }}
        >
          {/* ── Tab bar ─────────────────────────────────────── */}
          <div className="flex items-center border-b border-border/60 px-1 gap-0.5 flex-shrink-0 h-10">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs transition-all duration-100 whitespace-nowrap",
                  activeTab === tab.id
                    ? "bg-card text-foreground font-medium"
                    : "text-muted-dark hover:text-muted hover:bg-card/40"
                )}
              >
                <tab.icon size={11} />
                <span className="hidden xl:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* ── Tab content ─────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto p-3 min-h-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.12 }}
              >
                {activeTab === "evidence"  && <EvidenceTab result={lastResult} />}
                {activeTab === "sources"   && <SourcesTab savedSources={savedSources} onRemove={removeSource} />}
                {activeTab === "citations" && <CitationsTab result={lastResult} />}
                {activeTab === "notes"     && <NotesTab />}
                {activeTab === "stats"     && <StatsTab result={lastResult} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

// ── Evidence tab ──────────────────────────────────────────────────────────────

function EvidenceTab({ result }: { result?: QueryResult | null }) {
  if (!result) return <EmptyState icon="🔬" label="Evidence will appear here after a query" />;

  const { retrieve_decision, candidates } = result;
  const isRetrieved = retrieve_decision.includes("Retrieve") && !retrieve_decision.includes("No");

  return (
    <div className="space-y-3">
      {/* Retrieve decision badge */}
      <div className={cn("flex items-center gap-2 p-2.5 rounded-lg border text-xs",
        isRetrieved ? "border-success/20 bg-success/5 text-success" : "border-warning/20 bg-warning/5 text-warning"
      )}>
        <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", isRetrieved ? "bg-success" : "bg-warning")} />
        <span className="font-medium">{isRetrieved ? "Evidence retrieved" : "No retrieval used"}</span>
      </div>

      {/* Candidates */}
      {candidates.filter((c) => c.passage).map((c, i) => (
        <div key={i} className="p-3 rounded-lg bg-card border border-border space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground truncate-2 leading-tight">
                {c.passage?.title || `Source ${i + 1}`}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="badge badge-neutral">Score {c.score.toFixed(2)}</span>
                <span className={cn("badge", confidenceToLabel(c.critique.score).color === "text-success" ? "badge-success" : "badge-warning")}>
                  {c.critique.relevance}
                </span>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-lg font-bold text-foreground">{confidenceToPercent(c.score)}%</div>
              <div className="text-2xs text-muted-dark">relevance</div>
            </div>
          </div>

          {c.passage?.text && (
            <p className="text-xs text-muted leading-relaxed line-clamp-3">
              {c.passage.text.slice(0, 200)}…
            </p>
          )}

          {/* Critique details */}
          <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-border/60">
            {[
              ["Support",   c.critique.support],
              ["Utility",   `${c.critique.utility}/5`],
            ].map(([k, v]) => (
              <div key={k} className="text-2xs">
                <span className="text-muted-dark">{k} </span>
                <span className="text-muted font-medium">{v}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Sources tab ───────────────────────────────────────────────────────────────

function SourcesTab({ savedSources, onRemove }: {
  savedSources: ReturnType<typeof useWorkspaceStore.getState>["savedSources"];
  onRemove: (id: string) => void;
}) {
  if (savedSources.length === 0) return <EmptyState icon="📚" label="Save sources from your queries to collect them here" />;

  return (
    <div className="space-y-2">
      {savedSources.map((s) => (
        <div key={s.id} className="p-3 rounded-lg bg-card border border-border group space-y-1.5">
          <div className="flex items-start gap-2">
            <p className="text-xs font-medium text-foreground flex-1 truncate-2 leading-tight">
              {s.source.title}
            </p>
            <button
              onClick={() => onRemove(s.id)}
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-error/10 hover:text-error text-muted-dark transition-all"
            >
              <Trash2 size={11} />
            </button>
          </div>
          {s.note && <p className="text-xs text-muted italic">{s.note}</p>}
          <div className="flex items-center gap-1">
            {s.tags.map((t) => (
              <span key={t} className="badge badge-neutral text-2xs">{t}</span>
            ))}
            <span className="ml-auto text-2xs text-muted-dark">{timeAgo(s.savedAt)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Citations tab ─────────────────────────────────────────────────────────────

function CitationsTab({ result }: { result?: QueryResult | null }) {
  if (!result) return <EmptyState icon="📄" label="Citations appear after a retrieval query" />;
  const sources = result.candidates.filter((c) => c.passage).map((c) => c.passage!);

  return (
    <div className="space-y-2">
      {sources.map((s, i) => (
        <div key={s.id} className="flex gap-3 p-2.5 rounded-lg bg-card border border-border hover:border-border/80 transition-colors group">
          <div className="text-lg font-bold text-muted-dark/40 select-none">{i + 1}</div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground truncate-2 leading-tight">{s.title}</p>
            <p className="text-2xs text-muted-dark mt-0.5">PubMed · {s.id}</p>
          </div>
          <button className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-card text-muted-dark hover:text-muted transition-all">
            <ExternalLink size={11} />
          </button>
        </div>
      ))}
      {sources.length === 0 && <EmptyState icon="📄" label="No sources in this response" />}
    </div>
  );
}

// ── Notes tab ─────────────────────────────────────────────────────────────────

function NotesTab() {
  const [note, setNote] = useState("");
  const [notes, setNotes] = useState<string[]>([]);

  return (
    <div className="space-y-3">
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Add a note…"
        className="input-base resize-none text-xs"
        rows={3}
      />
      <button
        onClick={() => { if (note.trim()) { setNotes([note, ...notes]); setNote(""); } }}
        className="btn-outline text-xs w-full"
      >
        Save note
      </button>
      <div className="space-y-2">
        {notes.map((n, i) => (
          <div key={i} className="p-2.5 rounded-lg bg-card border border-border text-xs text-muted leading-relaxed">
            {n}
          </div>
        ))}
      </div>
      {notes.length === 0 && <EmptyState icon="🗒️" label="Your notes for this session" />}
    </div>
  );
}

// ── Stats tab ─────────────────────────────────────────────────────────────────

function StatsTab({ result }: { result?: QueryResult | null }) {
  if (!result) return <EmptyState icon="📊" label="Retrieval statistics appear after a query" />;

  const avgScore = result.candidates.length > 0
    ? result.candidates.reduce((a, c) => a + c.score, 0) / result.candidates.length
    : 0;

  const stats = [
    { label: "Candidates",    value: result.candidates.length },
    { label: "Avg Relevance", value: `${confidenceToPercent(avgScore)}%` },
    { label: "Backend",       value: result.backend },
    { label: "Decision",      value: result.retrieve_decision.replace(/\[|\]/g, "") },
  ];

  return (
    <div className="space-y-2">
      {stats.map((s) => (
        <div key={s.label} className="flex items-center justify-between p-2.5 rounded-lg bg-card border border-border text-xs">
          <span className="text-muted-dark">{s.label}</span>
          <span className="text-foreground font-medium">{String(s.value)}</span>
        </div>
      ))}

      {/* Confidence bar */}
      <div className="p-3 rounded-lg bg-card border border-border space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-muted-dark">Avg confidence</span>
          <span className="text-foreground font-semibold">{confidenceToPercent(avgScore)}%</span>
        </div>
        <div className="w-full bg-border rounded-full h-1.5">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${confidenceToPercent(avgScore)}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="h-1.5 rounded-full bg-accent"
          />
        </div>
      </div>
    </div>
  );
}

// ── Shared ────────────────────────────────────────────────────────────────────

function EmptyState({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
      <span className="text-2xl">{icon}</span>
      <p className="text-xs text-muted-dark leading-relaxed max-w-[160px]">{label}</p>
    </div>
  );
}
