import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow, format } from "date-fns";
import type { Conversation, Message } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function timeAgo(date: Date): string {
  return formatDistanceToNow(date, { addSuffix: true });
}

export function formatDate(date: Date): string {
  return format(date, "MMM d, yyyy");
}

export function formatTime(date: Date): string {
  return format(date, "h:mm a");
}

export function truncate(str: string, length = 60): string {
  return str.length > length ? str.slice(0, length) + "…" : str;
}

export function createConversationTitle(firstMessage: string): string {
  return truncate(firstMessage, 52);
}

export function createEmptyConversation(id?: string): Conversation {
  const now = new Date();
  return {
    id: id ?? generateId(),
    title: "New conversation",
    messages: [],
    createdAt: now,
    updatedAt: now,
    settings: {
      backend:    "heuristic",
      answerMode: "freeform",
      topK:       3,
      indexPath:  "data/pubmedqa_index.json",
      modelName:  "selfrag/selfrag_llama2_7b",
      use4bit:    true,
    },
  };
}

export function createMessage(
  role: Message["role"],
  content: string,
  extras?: Partial<Message>
): Message {
  return {
    id: generateId(),
    role,
    content,
    createdAt: new Date(),
    ...extras,
  };
}

export function confidenceToLabel(score: number): { label: string; color: string } {
  if (score >= 0.8) return { label: "High",   color: "text-success" };
  if (score >= 0.5) return { label: "Medium", color: "text-warning" };
  return                    { label: "Low",    color: "text-error"   };
}

export function confidenceToPercent(score: number): number {
  return Math.round(score * 100);
}

export function utilityToStars(utility: number): string {
  return "★".repeat(utility) + "☆".repeat(5 - utility);
}

export function stripReflectionTokens(text: string): string {
  return text
    .replace(/`\[(?:Retrieve|No Retrieve|No Retrieval|Relevant|Irrelevant|Fully supported|Partially supported|No support|Utility\s*:\s*[1-5])\]`/g, "")
    .replace(/\[(?:Retrieve|No Retrieve|No Retrieval|Relevant|Irrelevant|Fully supported|Partially supported|No support|Utility\s*:\s*[1-5])\]/g, "")
    .replace(/~~.*?~~/g, "")
    .trim();
}

export function parseConfidenceFromAnswer(answer: string): number | null {
  const m = answer.match(/(\d{1,3})%\s*confidence/i);
  return m ? parseInt(m[1]) / 100 : null;
}

export function groupConversationsByDate(conversations: Conversation[]): Record<string, Conversation[]> {
  const today    = new Date(); today.setHours(0,0,0,0);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate()-1);
  const lastWeek  = new Date(today); lastWeek.setDate(lastWeek.getDate()-7);

  return conversations.reduce<Record<string, Conversation[]>>((acc, conv) => {
    const d = new Date(conv.updatedAt); d.setHours(0,0,0,0);
    let key: string;
    if      (d >= today)     key = "Today";
    else if (d >= yesterday) key = "Yesterday";
    else if (d >= lastWeek)  key = "This week";
    else                     key = format(d, "MMMM yyyy");
    (acc[key] ??= []).push(conv);
    return acc;
  }, {});
}

export function getRetrieveStatus(decision: string): { label: string; color: string; bg: string } {
  const isRetrieve = decision.includes("Retrieve") && !decision.includes("No");
  return isRetrieve
    ? { label: "Retrieved",   color: "text-success",  bg: "bg-success/10" }
    : { label: "No Retrieve", color: "text-warning",  bg: "bg-warning/10" };
}
