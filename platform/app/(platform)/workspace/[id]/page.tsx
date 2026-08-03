"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useWorkspaceStore } from "@/store/workspace";
import { useUIStore }        from "@/store/ui";
import { submitQuery, DEFAULT_SETTINGS } from "@/lib/api";
import { createMessage, generateId } from "@/lib/utils";
import { QueryInput }        from "@/components/workspace/query-input";
import { MessageBubble }     from "@/components/workspace/message-bubble";
import { RetrievalVisualizer } from "@/components/workspace/retrieval-visualizer";
import type { QueryResult, ConversationSettings } from "@/lib/types";

export default function WorkspacePage() {
  const params  = useParams();
  const router  = useRouter();
  const id      = params.id as string;

  const {
    getConversationMessages,
    getActiveConversation,
    addMessage,
    updateMessage,
    updateConversationSettings,
    conversations,
    setActiveConversation,
  } = useWorkspaceStore();

  const { setBackendOnline, panels } = useUIStore();

  const [isLoading,  setIsLoading]  = useState(false);
  const [lastResult, setLastResult] = useState<QueryResult | null>(null);
  const [pendingMsgId, setPendingMsgId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Ensure conversation exists or create it
  useEffect(() => {
    const exists = conversations.find((c) => c.id === id);
    if (!exists) {
      router.replace("/");
      return;
    }
    setActiveConversation(id);
  }, [id, conversations, router, setActiveConversation]);

  // Autoscroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [isLoading]);

  // Handle prefill from home page
  useEffect(() => {
    const prefill = sessionStorage.getItem(`prefill:${id}`);
    if (prefill) {
      sessionStorage.removeItem(`prefill:${id}`);
      handleQuery(prefill);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const activeConv = getActiveConversation();
  const messages   = getConversationMessages(id);
  const settings: ConversationSettings = activeConv?.settings ?? DEFAULT_SETTINGS;

  const handleQuery = useCallback(async (query: string) => {
    if (isLoading || !query.trim()) return;

    setIsLoading(true);
    setLastResult(null);

    // Add user message
    const userMsg = createMessage("user", query);
    addMessage(id, userMsg);

    // Add placeholder AI message
    const aiMsgId = generateId();
    const aiMsg   = createMessage("assistant", "", { id: aiMsgId });
    addMessage(id, aiMsg);
    setPendingMsgId(aiMsgId);

    // Scroll
    setTimeout(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, 50);

    try {
      const result = await submitQuery(query, settings);
      setLastResult(result);
      setBackendOnline(true);

      updateMessage(id, aiMsgId, {
        content:  result.answer,
        result,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to get response";
      setBackendOnline(false);
      toast.error(msg.includes("503") || msg.includes("offline")
        ? "Backend offline — start: python -m demo.app"
        : msg
      );
      updateMessage(id, aiMsgId, { content: `Error: ${msg}` });
    } finally {
      setIsLoading(false);
      setPendingMsgId(null);
    }
  }, [id, isLoading, settings, addMessage, updateMessage, setBackendOnline]);

  const handleSettingsChange = (partial: Partial<ConversationSettings>) => {
    if (activeConv) updateConversationSettings(activeConv.id, partial);
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full min-h-0">

      {/* ── Messages area ──────────────────────────────────────── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto min-h-0 px-4 py-6"
      >
        <div className="max-w-3xl mx-auto space-y-6 pb-2">
          <AnimatePresence initial={false}>
            {isEmpty ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-20 gap-4 text-center"
              >
                <motion.div
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="text-4xl"
                >
                  🧬
                </motion.div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">Start your investigation</p>
                  <p className="text-xs text-muted-dark">Ask a biomedical question to retrieve PubMed evidence</p>
                </div>
              </motion.div>
            ) : (
              messages.map((msg) => {
                const isThisPending = msg.id === pendingMsgId;
                const msgResult: QueryResult | null =
                  msg.role === "assistant"
                    ? (isThisPending ? null : (msg.result ?? null))
                    : null;

                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18 }}
                  >
                    <MessageBubble
                      message={msg}
                      result={msgResult}
                      isStreaming={isThisPending && isLoading}
                    />

                    {/* Retrieval pipeline visualizer after AI message */}
                    {msg.role === "assistant" && !isThisPending && msg.result && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        transition={{ delay: 0.3, duration: 0.2 }}
                        className="mt-2 ml-10"
                      >
                        <RetrievalVisualizer result={msg.result} compact />
                      </motion.div>
                    )}
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Input bar ──────────────────────────────────────────── */}
      <div className="flex-shrink-0 border-t border-border/60 bg-sidebar/80 backdrop-blur-sm px-4 py-4">
        <div className="max-w-3xl mx-auto">
          <QueryInput
            onSubmit={handleQuery}
            isLoading={isLoading}
            settings={settings}
            onSettingsChange={handleSettingsChange}
            placeholder={
              isEmpty
                ? "Ask a biomedical question (e.g. 'Do mitochondria play a role…')"
                : "Ask a follow-up question…"
            }
          />
          <p className="text-center text-2xs text-muted-dark mt-2.5">
            Self-RAG · PubMed · {settings.backend === "heuristic" ? "Heuristic backend" : "HF Model"}
            {" · "}
            <span className="text-muted">For research use only</span>
          </p>
        </div>
      </div>
    </div>
  );
}
