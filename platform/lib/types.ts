// ── Core domain types ─────────────────────────────────────────────────────────

export type RetrieveDecision = "[Retrieve]" | "[No Retrieve]" | "[No Retrieval]";
export type SupportLevel = "Fully supported" | "Partially supported" | "No support";
export type RelevanceLevel = "Relevant" | "Irrelevant";
export type AnswerMode = "freeform" | "pubmedqa_label";
export type BackendType = "heuristic" | "hf";

export interface Critique {
  retrieve: RetrieveDecision;
  relevance: RelevanceLevel;
  support: SupportLevel;
  utility: number;       // 1-5
  score: number;         // computed 0-1
}

export interface Source {
  id: string;
  title: string;
  text: string;
  score: number;
  metadata: Record<string, unknown>;
}

export interface Candidate {
  answer: string;
  passage: Source | null;
  critique: Critique;
  score: number;
  raw_output?: string;
}

export interface QueryResult {
  query: string;
  answer: string;
  retrieve_decision: RetrieveDecision;
  backend: BackendType;
  model_name: string;
  candidates: Candidate[];
  latency_ms?: number;
}

// ── Chat / Conversation ───────────────────────────────────────────────────────

export type MessageRole = "user" | "assistant" | "system";

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: Date;
  result?: QueryResult;
  isStreaming?: boolean;
  metadata?: Record<string, unknown>;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  projectId?: string;
  settings: ConversationSettings;
  pinned?: boolean;
}

export interface ConversationSettings {
  backend: BackendType;
  answerMode: AnswerMode;
  topK: number;
  indexPath: string;
  modelName: string;
  use4bit: boolean;
}

// ── Projects ──────────────────────────────────────────────────────────────────

export interface Project {
  id: string;
  name: string;
  description?: string;
  emoji?: string;
  color?: string;
  conversations: string[];  // conversation IDs
  savedSources: string[];
  notes: Note[];
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  pinned?: boolean;
}

// ── Evidence / Sources ────────────────────────────────────────────────────────

export interface SavedSource {
  id: string;
  source: Source;
  note?: string;
  tags: string[];
  savedAt: Date;
  projectId?: string;
  conversationId?: string;
  bookmarked?: boolean;
}

// ── Notes ─────────────────────────────────────────────────────────────────────

export interface Note {
  id: string;
  content: string;
  sourceId?: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

// ── UI State ──────────────────────────────────────────────────────────────────

export interface PanelState {
  leftSidebar: boolean;
  rightPanel: boolean;
  rightPanelWidth: number;
  commandPalette: boolean;
  retrievalInspector: boolean;
}

export interface ActiveView {
  screen: AppScreen;
  conversationId?: string;
  projectId?: string;
}

export type AppScreen =
  | "home"
  | "workspace"
  | "dashboard"
  | "evidence"
  | "literature"
  | "papers"
  | "vault"
  | "projects"
  | "reports"
  | "settings"
  | "profile";

// ── API ───────────────────────────────────────────────────────────────────────

export interface QueryRequest {
  query: string;
  settings: ConversationSettings;
  conversationHistory: Array<{ role: MessageRole; content: string }>;
}

export interface QueryResponse {
  result: QueryResult;
  latency_ms: number;
}

export interface ApiError {
  error: string;
  code?: string;
  details?: unknown;
}

// ── Retrieval Inspector ───────────────────────────────────────────────────────

export interface RetrievalStep {
  id: string;
  label: string;
  description: string;
  status: "pending" | "running" | "done" | "skipped";
  data?: unknown;
  latency_ms?: number;
}

// ── Command Palette ───────────────────────────────────────────────────────────

export interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  shortcut?: string[];
  category: CommandCategory;
  action: () => void;
}

export type CommandCategory =
  | "navigation"
  | "action"
  | "project"
  | "conversation"
  | "settings";
