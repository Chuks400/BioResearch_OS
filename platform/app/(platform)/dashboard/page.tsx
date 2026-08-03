"use client";

import { motion } from "framer-motion";
import { useWorkspaceStore } from "@/store/workspace";
import { useRouter } from "next/navigation";
import { MessageSquare, FlaskConical, BookMarked, TrendingUp, Zap, Clock } from "lucide-react";
import { timeAgo } from "@/lib/utils";

export default function DashboardPage() {
  const { conversations, createConversation } = useWorkspaceStore();
  const router = useRouter();

  const totalQueries = conversations.reduce((a, c) => a + c.messages.filter(m => m.role === "user").length, 0);
  const recent = conversations.slice(0, 5);

  const stats = [
    { icon: MessageSquare, label: "Conversations", value: conversations.length, color: "text-accent" },
    { icon: Zap,           label: "Queries run",   value: totalQueries,          color: "text-success" },
    { icon: FlaskConical,  label: "Sources saved",  value: 0,                    color: "text-warning" },
    { icon: BookMarked,    label: "Notes",           value: 0,                    color: "text-info" },
  ];

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-dark mt-1">Your research activity at a glance</p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.2 }}
              className="p-4 rounded-xl bg-card border border-border space-y-2"
            >
              <s.icon size={16} className={s.color} />
              <div className="text-2xl font-bold text-foreground">{s.value}</div>
              <div className="text-xs text-muted-dark">{s.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Quick actions */}
        <div>
          <p className="text-xs font-semibold text-muted-dark uppercase tracking-wider mb-3">Quick actions</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "New conversation",   desc: "Start a biomedical query", onClick: () => { const id = createConversation(); router.push(`/workspace/${id}`); } },
              { label: "Literature search",  desc: "Search PubMed literature",  onClick: () => router.push("/literature") },
              { label: "Knowledge vault",    desc: "Browse saved sources",      onClick: () => router.push("/vault") },
              { label: "View reports",       desc: "Your saved reports",        onClick: () => router.push("/reports") },
            ].map((a) => (
              <button
                key={a.label}
                onClick={a.onClick}
                className="p-4 rounded-xl bg-card border border-border hover:border-accent/30 hover:bg-card/80 transition-all text-left group"
              >
                <p className="text-sm font-medium text-foreground group-hover:text-white">{a.label}</p>
                <p className="text-xs text-muted-dark mt-0.5">{a.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Recent conversations */}
        {recent.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-dark uppercase tracking-wider mb-3">Recent conversations</p>
            <div className="space-y-1">
              {recent.map((c) => (
                <button
                  key={c.id}
                  onClick={() => router.push(`/workspace/${c.id}`)}
                  className="flex items-center gap-3 w-full p-3 rounded-lg bg-card/50 border border-border/60 hover:bg-card hover:border-border transition-all text-left group"
                >
                  <MessageSquare size={13} className="text-muted-dark flex-shrink-0" />
                  <span className="text-sm text-muted group-hover:text-foreground flex-1 truncate">{c.title}</span>
                  <span className="text-xs text-muted-dark flex-shrink-0 flex items-center gap-1">
                    <Clock size={10} />{timeAgo(new Date(c.updatedAt))}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {conversations.length === 0 && (
          <div className="text-center py-16 space-y-3">
            <div className="text-4xl">🧬</div>
            <p className="text-sm text-muted-dark">No activity yet — start your first query</p>
            <button
              onClick={() => { const id = createConversation(); router.push(`/workspace/${id}`); }}
              className="btn-primary text-sm px-4 py-2"
            >
              New conversation
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
