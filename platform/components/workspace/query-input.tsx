"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp, Loader2, Settings2, Sliders } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ConversationSettings } from "@/lib/types";

interface QueryInputProps {
  onSubmit:  (query: string) => void;
  isLoading: boolean;
  settings:  ConversationSettings;
  onSettingsChange: (s: Partial<ConversationSettings>) => void;
  placeholder?: string;
}

const EXAMPLE_PROMPTS = [
  "Do mitochondria play a role in remodelling lace plant leaves during PCD?",
  "What is the mechanism of action of mTOR inhibitors in cancer?",
  "Summarise the latest evidence on CRISPR gene therapy for sickle cell disease",
  "What are the primary biomarkers used in early Alzheimer's detection?",
];

export function QueryInput({ onSubmit, isLoading, settings, onSettingsChange, placeholder }: QueryInputProps) {
  const [value,       setValue]       = useState("");
  const [showOptions, setShowOptions] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = "auto";
      ref.current.style.height = Math.min(ref.current.scrollHeight, 200) + "px";
    }
  }, [value]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !isLoading) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    const q = value.trim();
    if (!q || isLoading) return;
    onSubmit(q);
    setValue("");
    if (ref.current) ref.current.style.height = "auto";
  };

  return (
    <div className="space-y-3">
      {/* ── Input container ──────────────────────────────────── */}
      <div className={cn(
        "relative rounded-2xl border transition-all duration-200",
        isLoading
          ? "border-accent/40 bg-accent/5"
          : "border-border bg-card hover:border-border/80 focus-within:border-accent/50 focus-within:bg-card"
      )}>
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? "Ask a biomedical question…"}
          disabled={isLoading}
          rows={1}
          className="w-full bg-transparent text-foreground text-sm placeholder:text-muted-dark resize-none px-4 pt-3.5 pb-12 outline-none leading-relaxed disabled:opacity-50"
          style={{ minHeight: 52, maxHeight: 200 }}
        />

        {/* Bottom toolbar */}
        <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between">
          {/* Left options */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowOptions(!showOptions)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all duration-100",
                showOptions
                  ? "bg-accent/15 text-accent"
                  : "text-muted-dark hover:text-muted hover:bg-card/80"
              )}
            >
              <Sliders size={11} />
              <span>{settings.answerMode === "pubmedqa_label" ? "Label mode" : "Freeform"}</span>
            </button>
            <span className="text-border text-xs">·</span>
            <span className="text-2xs text-muted-dark px-1">K={settings.topK}</span>
          </div>

          {/* Send button */}
          <button
            onClick={handleSubmit}
            disabled={!value.trim() || isLoading}
            className={cn(
              "w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-150",
              value.trim() && !isLoading
                ? "bg-accent text-white shadow-glow-accent hover:bg-accent-hover scale-100"
                : "bg-border/50 text-muted-dark cursor-not-allowed"
            )}
          >
            {isLoading
              ? <Loader2 size={14} className="animate-spin" />
              : <ArrowUp size={14} />
            }
          </button>
        </div>
      </div>

      {/* ── Inline settings (expandable) ────────────────────── */}
      <AnimatePresence>
        {showOptions && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="p-3 rounded-xl border border-border bg-card space-y-3">
              <p className="text-xs font-medium text-muted-dark">Query settings</p>
              <div className="grid grid-cols-2 gap-3">
                <SettingSelect
                  label="Backend"
                  value={settings.backend}
                  options={[{ v: "heuristic", l: "Heuristic (fast)" }, { v: "hf", l: "HF Model (GPU)" }]}
                  onChange={(v) => onSettingsChange({ backend: v as ConversationSettings["backend"] })}
                />
                <SettingSelect
                  label="Answer mode"
                  value={settings.answerMode}
                  options={[{ v: "freeform", l: "Freeform" }, { v: "pubmedqa_label", l: "Yes/No/Maybe" }]}
                  onChange={(v) => onSettingsChange({ answerMode: v as ConversationSettings["answerMode"] })}
                />
              </div>
              <div>
                <label className="text-2xs text-muted-dark mb-1.5 block">Top-K passages: {settings.topK}</label>
                <input
                  type="range" min={1} max={10} step={1}
                  value={settings.topK}
                  onChange={(e) => onSettingsChange({ topK: parseInt(e.target.value) })}
                  className="w-full accent-accent h-1 rounded-full"
                />
              </div>
              <div>
                <label className="text-2xs text-muted-dark mb-1 block">Index path</label>
                <input
                  type="text"
                  value={settings.indexPath}
                  onChange={(e) => onSettingsChange({ indexPath: e.target.value })}
                  className="input-base text-xs py-1.5"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Example prompts (shown when empty) ──────────────── */}
      <AnimatePresence>
        {!value && !isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex flex-wrap gap-2"
          >
            {EXAMPLE_PROMPTS.map((p) => (
              <button
                key={p}
                onClick={() => setValue(p)}
                className="px-3 py-1.5 rounded-lg border border-border/60 bg-card/40 hover:bg-card hover:border-border text-xs text-muted hover:text-foreground transition-all duration-100 text-left"
              >
                {p.length > 55 ? p.slice(0, 55) + "…" : p}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SettingSelect({ label, value, options, onChange }: {
  label: string;
  value: string;
  options: { v: string; l: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-2xs text-muted-dark mb-1 block">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input-base text-xs py-1.5"
      >
        {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </div>
  );
}
