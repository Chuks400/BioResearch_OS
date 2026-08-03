"use client";

import { motion } from "framer-motion";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { AnswerComponent } from "./answer-component";
import type { Message, QueryResult } from "@/lib/types";

interface MessageBubbleProps {
  message: Message;
  result?: QueryResult | null;
  isStreaming?: boolean;
}

export function MessageBubble({ message, result, isStreaming }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}
    >
      {/* AI avatar */}
      {!isUser && (
        <div className="w-7 h-7 rounded-lg bg-accent/15 border border-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="text-xs">🧬</span>
        </div>
      )}

      {/* Bubble / content */}
      <div className={cn("max-w-[85%] min-w-0", isUser ? "max-w-[70%]" : "flex-1")}>
        {isUser ? (
          <UserBubble text={message.content} />
        ) : (
          <AssistantContent
            content={message.content}
            result={result}
            isStreaming={isStreaming}
          />
        )}
      </div>

      {/* User avatar */}
      {isUser && (
        <div className="w-7 h-7 rounded-full bg-card border border-border flex items-center justify-center flex-shrink-0 text-xs font-semibold text-muted mt-0.5">
          R
        </div>
      )}
    </motion.div>
  );
}

// ── User bubble ───────────────────────────────────────────────────────────────

function UserBubble({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="group relative">
      <div className="px-4 py-2.5 rounded-2xl rounded-tr-md bg-card border border-border text-sm text-foreground leading-relaxed">
        {text}
      </div>
      <button
        onClick={copy}
        className="absolute -bottom-5 right-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-2xs text-muted-dark hover:text-muted px-1"
      >
        {copied ? <Check size={10} className="text-success" /> : <Copy size={10} />}
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

// ── Assistant content ─────────────────────────────────────────────────────────

function AssistantContent({ content, result, isStreaming }: {
  content: string;
  result?: QueryResult | null;
  isStreaming?: boolean;
}) {
  if (isStreaming && !result) {
    return (
      <div className="flex items-center gap-2 py-2">
        <LoadingDots />
        <span className="text-xs text-muted-dark">Searching PubMed…</span>
      </div>
    );
  }

  if (result) {
    return <AnswerComponent result={result} isStreaming={isStreaming} />;
  }

  return (
    <div className="text-sm text-muted leading-relaxed py-1">
      {content}
    </div>
  );
}

// ── Loading dots ──────────────────────────────────────────────────────────────

function LoadingDots() {
  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.8, delay: i * 0.15, repeat: Infinity }}
          className="w-1.5 h-1.5 rounded-full bg-accent/60"
        />
      ))}
    </div>
  );
}
