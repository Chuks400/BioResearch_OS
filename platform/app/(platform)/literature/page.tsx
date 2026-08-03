"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Search, BookOpen, ExternalLink, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useWorkspaceStore } from "@/store/workspace";

const EXAMPLE_SEARCHES = [
  "mitochondria programmed cell death",
  "mTOR inhibitors cancer therapy",
  "CRISPR sickle cell disease clinical trial",
  "Alzheimer biomarkers early detection",
  "CAR-T cell immunotherapy solid tumors",
];

export default function LiteraturePage() {
  const [query, setQuery] = useState("");
  const router  = useRouter();
  const { createConversation } = useWorkspaceStore();

  const handleSearch = (q: string) => {
    if (!q.trim()) return;
    const id = createConversation(q.slice(0, 50));
    sessionStorage.setItem(`prefill:${id}`, q);
    router.push(`/workspace/${id}`);
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto space-y-8">

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          <h1 className="text-xl font-semibold text-foreground">Literature Search</h1>
          <p className="text-sm text-muted-dark mt-1">Search PubMed via Self-RAG retrieval</p>
        </motion.div>

        {/* Search bar */}
        <div className="relative">
          <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-dark" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch(query)}
            placeholder="Search biomedical literature…"
            className="input-base pl-10 pr-24 py-3 text-sm"
            autoFocus
          />
          <button
            onClick={() => handleSearch(query)}
            disabled={!query.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 btn-primary text-xs px-3 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Search
          </button>
        </div>

        {/* Example searches */}
        <div>
          <p className="text-xs font-semibold text-muted-dark uppercase tracking-wider mb-3">Example searches</p>
          <div className="space-y-1.5">
            {EXAMPLE_SEARCHES.map((s) => (
              <button
                key={s}
                onClick={() => handleSearch(s)}
                className="flex items-center gap-3 w-full p-3 rounded-lg bg-card/50 border border-border/60 hover:bg-card hover:border-border transition-all text-left group"
              >
                <BookOpen size={13} className="text-muted-dark flex-shrink-0" />
                <span className="text-sm text-muted group-hover:text-foreground flex-1">{s}</span>
                <ArrowRight size={12} className="text-muted-dark group-hover:text-accent transition-colors" />
              </button>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="p-4 rounded-xl border border-border/60 bg-card/30 text-xs text-muted-dark leading-relaxed">
          <p className="font-medium text-muted mb-1">About literature search</p>
          Queries are answered using Self-RAG — the model decides whether to retrieve passages from the PubMed index before generating a grounded response. Results include critique scores for relevance, support level, and utility.
        </div>
      </div>
    </div>
  );
}
