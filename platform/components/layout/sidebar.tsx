"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  MessageSquare, FolderOpen, BookMarked, Archive,
  BookOpen, FileText, Settings, User, Plus, ChevronDown,
  Pin, Dna, LayoutDashboard, Search
} from "lucide-react";
import { cn, groupConversationsByDate, truncate } from "@/lib/utils";
import { useWorkspaceStore } from "@/store/workspace";
import { useUIStore } from "@/store/ui";

export function Sidebar() {
  const { conversations, activeConversationId, createConversation, setActiveConversation, projects } = useWorkspaceStore();
  const { activeView, navigate, panels } = useUIStore();
  const router = useRouter();

  const grouped = groupConversationsByDate(conversations);
  const pinned  = conversations.filter((c) => c.pinned);

  const handleNewChat = () => {
    const id = createConversation();
    router.push(`/workspace/${id}`);
  };

  const handleSelectConversation = (convId: string) => {
    setActiveConversation(convId);
    router.push(`/workspace/${convId}`);
  };

  return (
    <AnimatePresence>
      {panels.leftSidebar && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 240, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          className="flex flex-col bg-sidebar border-r border-border overflow-hidden flex-shrink-0"
          style={{ minHeight: "100vh" }}
        >
          {/* ── Logo ──────────────────────────────────────────── */}
          <div className="flex items-center gap-2.5 px-4 py-4 border-b border-border/60">
            <div className="w-7 h-7 rounded-lg bg-accent/20 border border-accent/30 flex items-center justify-center flex-shrink-0">
              <Dna size={14} className="text-accent" />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight text-foreground">BioResearch OS</div>
              <div className="text-2xs text-muted-dark">v1.0 · Enterprise</div>
            </div>
          </div>

          {/* ── New Conversation ───────────────────────────────── */}
          <div className="px-3 py-2.5">
            <button
              onClick={handleNewChat}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-muted hover:text-foreground hover:bg-card transition-all duration-100 border border-dashed border-border/60 hover:border-border group"
            >
              <Plus size={14} className="text-muted-dark group-hover:text-accent transition-colors" />
              <span>New conversation</span>
              <span className="ml-auto text-2xs text-muted-dark font-mono">⌘N</span>
            </button>
          </div>

          {/* ── Nav ───────────────────────────────────────────── */}
          <nav className="px-2 py-1 space-y-0.5">
            <NavItem icon={LayoutDashboard} label="Dashboard"  active={activeView.screen === "dashboard"}  onClick={() => router.push("/dashboard")} />
            <NavItem icon={Search}          label="Literature" active={activeView.screen === "literature"} onClick={() => router.push("/literature")} />
            <NavItem icon={Archive}         label="Vault"      active={activeView.screen === "vault"}      onClick={() => router.push("/vault")} />
            <NavItem icon={FileText}        label="Reports"    active={activeView.screen === "reports"}    onClick={() => router.push("/reports")} />
          </nav>

          {/* ── Projects ──────────────────────────────────────── */}
          <SidebarSection label="Projects">
            {projects.length === 0 ? (
              <p className="px-3 text-xs text-muted-dark py-1">No projects yet</p>
            ) : (
              projects.slice(0, 5).map((p) => (
                <button
                  key={p.id}
                  onClick={() => navigate("projects", { projectId: p.id })}
                  className={cn(
                    "flex items-center gap-2 w-full px-3 py-1.5 rounded-md text-xs transition-all duration-100",
                    activeView.projectId === p.id
                      ? "bg-card text-foreground"
                      : "text-muted hover:text-foreground hover:bg-card/50"
                  )}
                >
                  <span>{p.emoji ?? "🧬"}</span>
                  <span className="truncate">{p.name}</span>
                </button>
              ))
            )}
          </SidebarSection>

          {/* ── Conversations ─────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto px-2 py-1 space-y-3 min-h-0">
            {pinned.length > 0 && (
              <SidebarSection label="Pinned">
                {pinned.map((c) => (
                  <ConversationItem
                    key={c.id} conv={c}
                    active={c.id === activeConversationId}
                    onClick={() => handleSelectConversation(c.id)}
                  />
                ))}
              </SidebarSection>
            )}
            {Object.entries(grouped).map(([group, convs]) => (
              <SidebarSection key={group} label={group}>
                {convs.filter((c) => !c.pinned).map((c) => (
                  <ConversationItem
                    key={c.id} conv={c}
                    active={c.id === activeConversationId}
                    onClick={() => handleSelectConversation(c.id)}
                  />
                ))}
              </SidebarSection>
            ))}
            {conversations.length === 0 && (
              <div className="px-3 py-6 text-center">
                <p className="text-xs text-muted-dark">No conversations yet</p>
                <p className="text-xs text-muted-dark/60 mt-1">Start by asking a question</p>
              </div>
            )}
          </div>

          {/* ── Footer ────────────────────────────────────────── */}
          <div className="border-t border-border/60 p-2 space-y-0.5">
            <NavItem icon={Settings} label="Settings" active={activeView.screen === "settings"} onClick={() => router.push("/settings")} />
            <NavItem icon={User}     label="Profile"  active={activeView.screen === "profile"}  onClick={() => router.push("/profile")} />
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function NavItem({ icon: Icon, label, active, onClick }: {
  icon: React.ElementType; label: string; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 w-full px-3 py-1.5 rounded-md text-sm transition-all duration-100",
        active
          ? "bg-accent/10 text-accent font-medium"
          : "text-muted hover:text-foreground hover:bg-card/50"
      )}
    >
      <Icon size={14} className={cn(active ? "text-accent" : "text-muted-dark")} />
      <span>{label}</span>
    </button>
  );
}

function SidebarSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="px-3 pb-1 text-2xs font-semibold text-muted-dark uppercase tracking-wider">{label}</p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function ConversationItem({ conv, active, onClick }: {
  conv: { id: string; title: string; messages: unknown[]; pinned?: boolean };
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-start gap-2 w-full px-3 py-1.5 rounded-md text-left transition-all duration-100 group",
        active
          ? "bg-card text-foreground"
          : "text-muted hover:text-foreground hover:bg-card/40"
      )}
    >
      {conv.pinned && <Pin size={10} className="text-accent mt-0.5 flex-shrink-0" />}
      <span className="text-xs truncate leading-relaxed">{conv.title}</span>
    </button>
  );
}
