"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, MessageSquare, BookMarked, FileText, Settings,
  Zap, FlaskConical, ArrowRight, Hash
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/ui";
import { useWorkspaceStore } from "@/store/workspace";
import { useRouter } from "next/navigation";

const STATIC_COMMANDS = [
  {
    id: "new-conversation",
    icon: MessageSquare,
    label: "New conversation",
    shortcut: "⌘N",
    section: "Actions",
    action: "new-conv",
  },
  {
    id: "literature",
    icon: BookMarked,
    label: "Open Literature Search",
    section: "Navigation",
    action: "nav:/literature",
  },
  {
    id: "vault",
    icon: FlaskConical,
    label: "Open Knowledge Vault",
    section: "Navigation",
    action: "nav:/vault",
  },
  {
    id: "settings",
    icon: Settings,
    label: "Settings",
    shortcut: "⌘,",
    section: "Navigation",
    action: "nav:/settings",
  },
];

export function CommandPalette() {
  const { panels, toggleCommandPalette, navigate } = useUIStore();
  const commandPalette = panels.commandPalette;
  const { conversations, createConversation } = useWorkspaceStore();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (commandPalette) {
      setQuery("");
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [commandPalette]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        toggleCommandPalette();
      }
      if (e.key === "Escape") toggleCommandPalette();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggleCommandPalette]);

  const q = query.toLowerCase();
  const filteredCommands = STATIC_COMMANDS.filter((c) =>
    !q || c.label.toLowerCase().includes(q)
  );
  const filteredConversations = conversations
    .filter((c) => !q || c.title.toLowerCase().includes(q))
    .slice(0, 5);

  const allItems = [
    ...filteredCommands.map((c) => ({ ...c, type: "command" as const })),
    ...filteredConversations.map((c) => ({
      id: c.id,
      icon: Hash,
      label: c.title,
      section: "Recent conversations",
      action: `nav:/workspace/${c.id}`,
      type: "conversation" as const,
    })),
  ];

  const execute = (action: string) => {
    toggleCommandPalette();
    if (action === "new-conv") {
      const id = createConversation("New conversation");
      router.push(`/workspace/${id}`);
    } else if (action.startsWith("nav:")) {
      router.push(action.slice(4));
    }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!commandPalette) return;
      if (e.key === "ArrowDown") { e.preventDefault(); setSelected((s) => Math.min(s + 1, allItems.length - 1)); }
      if (e.key === "ArrowUp")   { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)); }
      if (e.key === "Enter" && allItems[selected]) execute(allItems[selected].action);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  const grouped = allItems.reduce((acc, item) => {
    (acc[item.section] = acc[item.section] || []).push(item);
    return acc;
  }, {} as Record<string, typeof allItems>);

  return (
    <AnimatePresence>
      {commandPalette && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={toggleCommandPalette}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-lg z-50 shadow-command rounded-2xl overflow-hidden border border-border bg-sidebar"
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border/60">
              <Search size={14} className="text-muted-dark flex-shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => { setQuery(e.target.value); setSelected(0); }}
                placeholder="Search commands, conversations…"
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-dark outline-none"
              />
              <kbd className="text-2xs text-muted-dark font-mono bg-card px-1.5 py-0.5 rounded border border-border/60">Esc</kbd>
            </div>

            {/* Results */}
            <div className="max-h-[380px] overflow-y-auto py-1">
              {allItems.length === 0 ? (
                <p className="text-xs text-muted-dark text-center py-8">No results for "{query}"</p>
              ) : (
                Object.entries(grouped).map(([section, items]) => {
                  let runningIndex = 0;
                  const sectionStart = allItems.findIndex((i) => i.section === section);

                  return (
                    <div key={section}>
                      <p className="text-2xs font-semibold text-muted-dark uppercase tracking-wider px-4 pt-2.5 pb-1">
                        {section}
                      </p>
                      {items.map((item, localIdx) => {
                        const globalIdx = sectionStart + localIdx;
                        return (
                          <button
                            key={item.id}
                            onClick={() => execute(item.action)}
                            onMouseEnter={() => setSelected(globalIdx)}
                            className={cn(
                              "flex items-center gap-3 w-full px-4 py-2.5 text-left transition-colors",
                              selected === globalIdx ? "bg-accent/10" : "hover:bg-card/50"
                            )}
                          >
                            <div className={cn(
                              "w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0",
                              selected === globalIdx ? "bg-accent/15 text-accent" : "bg-card text-muted"
                            )}>
                              <item.icon size={12} />
                            </div>
                            <span className={cn(
                              "text-xs flex-1",
                              selected === globalIdx ? "text-foreground" : "text-muted"
                            )}>
                              {item.label}
                            </span>
                            {(item as any).shortcut && (
                              <kbd className="text-2xs text-muted-dark font-mono bg-card px-1.5 py-0.5 rounded border border-border/60">
                                {(item as any).shortcut}
                              </kbd>
                            )}
                            <ArrowRight
                              size={10}
                              className={cn(
                                "transition-opacity",
                                selected === globalIdx ? "opacity-100 text-accent" : "opacity-0"
                              )}
                            />
                          </button>
                        );
                      })}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-border/60 flex items-center gap-3 text-2xs text-muted-dark">
              <span><kbd className="font-mono bg-card px-1 py-0.5 rounded border border-border/40">↑↓</kbd> navigate</span>
              <span><kbd className="font-mono bg-card px-1 py-0.5 rounded border border-border/40">↵</kbd> select</span>
              <span><kbd className="font-mono bg-card px-1 py-0.5 rounded border border-border/40">Esc</kbd> close</span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
