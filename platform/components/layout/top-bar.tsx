"use client";

import { Search, Bell, ChevronDown, PanelLeft, PanelRight, Zap, Activity } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/ui";
import { useWorkspaceStore } from "@/store/workspace";

const MODELS = [
  { id: "heuristic",           label: "Heuristic",       badge: "fast",   color: "text-success" },
  { id: "selfrag_llama2_7b",   label: "Self-RAG 7B",     badge: "gpu",    color: "text-accent"  },
  { id: "selfrag_llama2_13b",  label: "Self-RAG 13B",    badge: "gpu+",   color: "text-warning" },
];

export function TopBar() {
  const { toggleSidebar, toggleRightPanel, toggleCommandPalette, panels, backendOnline } = useUIStore();
  const { getActiveConversation, updateConversationSettings } = useWorkspaceStore();
  const activeConv = getActiveConversation();

  return (
    <header className="flex items-center h-12 px-3 bg-sidebar border-b border-border/60 flex-shrink-0 gap-2 z-10">

      {/* ── Left: sidebar toggle + breadcrumb ───────────────── */}
      <div className="flex items-center gap-1 min-w-0">
        <TopBarButton onClick={toggleSidebar} tooltip="Toggle sidebar (⌘\\)">
          <PanelLeft size={15} />
        </TopBarButton>

        {activeConv && (
          <motion.div
            key={activeConv.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-1.5 ml-1 min-w-0"
          >
            <span className="text-border">/</span>
            <span className="text-xs text-muted truncate max-w-[200px]">{activeConv.title}</span>
          </motion.div>
        )}
      </div>

      {/* ── Center: command search ───────────────────────────── */}
      <div className="flex-1 flex justify-center px-4">
        <button
          onClick={toggleCommandPalette}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border hover:border-border/80 text-muted hover:text-foreground transition-all duration-150 text-xs group w-full max-w-md"
        >
          <Search size={12} className="text-muted-dark group-hover:text-muted transition-colors" />
          <span className="text-muted-dark group-hover:text-muted transition-colors flex-1 text-left">
            Search or ask anything…
          </span>
          <kbd className="hidden sm:flex items-center gap-0.5 text-2xs text-muted-dark font-mono bg-border/30 px-1.5 py-0.5 rounded border border-border/40">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* ── Right: model + status + actions ─────────────────── */}
      <div className="flex items-center gap-1">
        {/* Backend status */}
        <div className={cn(
          "flex items-center gap-1.5 px-2 py-1 rounded-md text-2xs font-medium",
          backendOnline ? "text-success bg-success/10" : "text-muted-dark bg-card"
        )}>
          <div className={cn(
            "w-1.5 h-1.5 rounded-full",
            backendOnline ? "bg-success animate-pulse-soft" : "bg-muted-dark"
          )} />
          {backendOnline ? "Backend live" : "Offline"}
        </div>

        {/* Model selector */}
        {activeConv && (
          <ModelSelector
            current={activeConv.settings.backend}
            onChange={(backend) =>
              updateConversationSettings(activeConv.id, {
                backend: backend as "heuristic" | "hf",
                modelName: backend === "heuristic" ? "heuristic" : "selfrag/selfrag_llama2_7b"
              })
            }
          />
        )}

        <TopBarButton onClick={() => {}} tooltip="Notifications">
          <Bell size={14} />
        </TopBarButton>

        <TopBarButton onClick={toggleRightPanel} tooltip="Toggle panel (⌘/)">
          <PanelRight size={15} className={cn(!panels.rightPanel && "text-muted-dark")} />
        </TopBarButton>

        {/* Avatar */}
        <button className="w-7 h-7 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center text-xs font-semibold text-accent ml-1 hover:bg-accent/30 transition-colors">
          R
        </button>
      </div>
    </header>
  );
}

function TopBarButton({ children, onClick, tooltip }: {
  children: React.ReactNode; onClick: () => void; tooltip?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={tooltip}
      className="w-8 h-8 flex items-center justify-center rounded-md text-muted hover:text-foreground hover:bg-card transition-all duration-100"
    >
      {children}
    </button>
  );
}

function ModelSelector({ current, onChange }: { current: string; onChange: (v: string) => void }) {
  const model = MODELS.find((m) => m.id === current) ?? MODELS[0];

  return (
    <select
      value={current}
      onChange={(e) => onChange(e.target.value)}
      className="h-7 px-2 pr-6 text-xs bg-card border border-border rounded-md text-muted hover:text-foreground hover:border-border/80 transition-all cursor-pointer appearance-none focus:outline-none focus:border-accent"
      style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' fill='none'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23666' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 6px center" }}
    >
      {MODELS.map((m) => (
        <option key={m.id} value={m.id}>{m.label}</option>
      ))}
    </select>
  );
}
