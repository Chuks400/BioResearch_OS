"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useWorkspaceStore } from "@/store/workspace";
import { ArrowRight, FlaskConical, BookOpen, Database, Zap } from "lucide-react";

const SUGGESTIONS = [
  {
    icon: FlaskConical,
    label: "Mitochondria & lace plant PCD",
    query: "Do mitochondria play a role in remodelling lace plant leaves during programmed cell death?",
  },
  {
    icon: Zap,
    label: "mTOR inhibitors in cancer",
    query: "What is the mechanism of action of mTOR inhibitors in cancer therapy?",
  },
  {
    icon: BookOpen,
    label: "CRISPR sickle cell therapy",
    query: "Summarise the latest clinical evidence on CRISPR gene therapy for sickle cell disease",
  },
  {
    icon: Database,
    label: "Alzheimer's biomarkers",
    query: "What are the primary biomarkers used for early Alzheimer's disease detection?",
  },
];

export default function HomePage() {
  const router   = useRouter();
  const { createConversation } = useWorkspaceStore();

  const startConversation = (query?: string) => {
    const id = createConversation(query ? query.slice(0, 50) + "…" : "New conversation");
    if (query) {
      sessionStorage.setItem(`prefill:${id}`, query);
    }
    router.push(`/workspace/${id}`);
  };

  return (
    <div className="h-full flex flex-col items-center justify-center px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-2xl space-y-10"
      >
        {/* Hero */}
        <div className="text-center space-y-4">
          <motion.div
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="text-5xl select-none mb-2"
          >
            🧬
          </motion.div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            What shall we investigate?
          </h1>
          <p className="text-sm text-muted-dark max-w-sm mx-auto leading-relaxed">
            Ask a biomedical question. The system retrieves evidence from PubMed
            using Self-RAG — grounded, critiqued, cited.
          </p>
        </div>

        {/* New conversation input trigger */}
        <div className="relative">
          <button
            onClick={() => startConversation()}
            className="w-full text-left px-5 py-4 rounded-2xl border border-border bg-card hover:border-accent/40 hover:bg-card/80 transition-all duration-200 text-sm text-muted-dark group"
          >
            Ask a biomedical question…
            <ArrowRight
              size={14}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-dark group-hover:text-accent group-hover:translate-x-0.5 transition-all duration-150"
            />
          </button>
        </div>

        {/* Suggestion cards */}
        <div>
          <p className="text-xs font-medium text-muted-dark uppercase tracking-wider mb-3 px-1">
            Start with an example
          </p>
          <div className="grid grid-cols-2 gap-2">
            {SUGGESTIONS.map((s, i) => (
              <motion.button
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i + 0.1, duration: 0.2 }}
                onClick={() => startConversation(s.query)}
                className="flex items-start gap-3 p-3.5 rounded-xl border border-border/60 bg-card/30 hover:bg-card hover:border-border text-left transition-all duration-150 group"
              >
                <div className="w-6 h-6 rounded-md bg-accent/10 border border-accent/15 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-accent/20 transition-colors">
                  <s.icon size={12} className="text-accent" />
                </div>
                <div>
                  <p className="text-xs font-medium text-foreground group-hover:text-white transition-colors leading-tight">
                    {s.label}
                  </p>
                  <p className="text-2xs text-muted-dark mt-0.5 leading-relaxed line-clamp-2">
                    {s.query}
                  </p>
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Footer hint */}
        <p className="text-center text-2xs text-muted-dark">
          Press{" "}
          <kbd className="font-mono bg-card border border-border/60 px-1 py-0.5 rounded text-muted">⌘K</kbd>
          {" "}for commands ·{" "}
          <kbd className="font-mono bg-card border border-border/60 px-1 py-0.5 rounded text-muted">⌘\</kbd>
          {" "}toggle sidebar
        </p>
      </motion.div>
    </div>
  );
}
