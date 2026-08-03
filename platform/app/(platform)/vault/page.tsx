"use client";

import { motion } from "framer-motion";
import { FlaskConical, Trash2, Tag } from "lucide-react";
import { useWorkspaceStore } from "@/store/workspace";
import { timeAgo } from "@/lib/utils";

export default function VaultPage() {
  const { savedSources, removeSource } = useWorkspaceStore();

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto space-y-6">

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-xl font-semibold text-foreground">Knowledge Vault</h1>
          <p className="text-sm text-muted-dark mt-1">Sources you've saved across conversations</p>
        </motion.div>

        {savedSources.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
            <FlaskConical size={32} className="text-muted-dark/40" />
            <p className="text-sm text-muted-dark">No saved sources yet</p>
            <p className="text-xs text-muted-dark/60">Bookmark sources from query results to collect them here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {savedSources.map((s) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl bg-card border border-border group space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-foreground leading-tight">{s.source.title}</p>
                  <button
                    onClick={() => removeSource(s.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-error/10 hover:text-error text-muted-dark transition-all"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                {s.note && <p className="text-xs text-muted italic">{s.note}</p>}
                <p className="text-xs text-muted leading-relaxed line-clamp-2">
                  {s.source.text.slice(0, 180)}…
                </p>
                <div className="flex items-center gap-2 pt-1">
                  {s.tags.map((t) => (
                    <span key={t} className="badge badge-neutral text-2xs flex items-center gap-1">
                      <Tag size={8} />{t}
                    </span>
                  ))}
                  <span className="ml-auto text-2xs text-muted-dark">{timeAgo(new Date(s.savedAt))}</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
