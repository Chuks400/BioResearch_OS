"use client";

import { motion } from "framer-motion";
import { useWorkspaceStore } from "@/store/workspace";

export default function ProfilePage() {
  const { conversations } = useWorkspaceStore();
  const totalQueries = conversations.reduce((a, c) => a + c.messages.filter(m => m.role === "user").length, 0);

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto space-y-8">

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-xl font-semibold text-foreground">Profile</h1>
        </motion.div>

        <div className="flex items-center gap-4 p-5 rounded-xl bg-card border border-border">
          <div className="w-14 h-14 rounded-full bg-accent/20 border-2 border-accent/30 flex items-center justify-center text-xl font-bold text-accent">
            R
          </div>
          <div>
            <p className="text-base font-semibold text-foreground">Researcher</p>
            <p className="text-sm text-muted-dark">BioResearch OS · Enterprise</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Conversations", value: conversations.length },
            { label: "Total queries",  value: totalQueries },
            { label: "Saved sources",  value: 0 },
          ].map((s) => (
            <div key={s.label} className="p-4 rounded-xl bg-card border border-border text-center">
              <div className="text-2xl font-bold text-foreground">{s.value}</div>
              <div className="text-xs text-muted-dark mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
