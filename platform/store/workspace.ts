import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Conversation, Message, Project, SavedSource, ConversationSettings } from "@/lib/types";
import { generateId, createEmptyConversation, createMessage, createConversationTitle } from "@/lib/utils";
import { DEFAULT_SETTINGS } from "@/lib/api";

interface WorkspaceState {
  // ── Conversations ──────────────────────────────────────────────
  conversations: Conversation[];
  activeConversationId: string | null;

  // ── Projects ───────────────────────────────────────────────────
  projects: Project[];
  activeProjectId: string | null;

  // ── Saved Sources ──────────────────────────────────────────────
  savedSources: SavedSource[];

  // ── Actions ────────────────────────────────────────────────────
  createConversation: (title?: string, projectId?: string) => string;
  setActiveConversation: (id: string | null) => void;
  addMessage: (conversationId: string, message: Message) => void;
  updateMessage: (conversationId: string, messageId: string, updates: Partial<Message>) => void;
  updateConversationSettings: (conversationId: string, settings: Partial<ConversationSettings>) => void;
  deleteConversation: (id: string) => void;
  pinConversation: (id: string) => void;

  createProject: (name: string, emoji?: string) => string;
  setActiveProject: (id: string | null) => void;
  deleteProject: (id: string) => void;

  saveSource: (source: SavedSource) => void;
  removeSource: (id: string) => void;

  getActiveConversation: () => Conversation | null;
  getConversationMessages: (id: string) => Message[];
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      conversations:        [],
      activeConversationId: null,
      projects:             [],
      activeProjectId:      null,
      savedSources:         [],

      // ── Conversations ──────────────────────────────────────────

      createConversation: (title, projectId) => {
        const conv = createEmptyConversation();
        if (title)     conv.title     = title;
        if (projectId) conv.projectId = projectId;
        set((s) => ({ conversations: [conv, ...s.conversations], activeConversationId: conv.id }));
        return conv.id;
      },

      setActiveConversation: (id) => set({ activeConversationId: id }),

      addMessage: (conversationId, message) => {
        set((s) => ({
          conversations: s.conversations.map((c) => {
            if (c.id !== conversationId) return c;
            const messages = [...c.messages, message];
            const title = messages.length === 1 && message.role === "user"
              ? createConversationTitle(message.content)
              : c.title;
            return { ...c, messages, title, updatedAt: new Date() };
          }),
        }));
      },

      updateMessage: (conversationId, messageId, updates) => {
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id !== conversationId ? c : {
              ...c,
              messages: c.messages.map((m) => m.id === messageId ? { ...m, ...updates } : m),
              updatedAt: new Date(),
            }
          ),
        }));
      },

      updateConversationSettings: (conversationId, settings) => {
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id !== conversationId ? c : { ...c, settings: { ...c.settings, ...settings } }
          ),
        }));
      },

      deleteConversation: (id) => {
        set((s) => ({
          conversations: s.conversations.filter((c) => c.id !== id),
          activeConversationId: s.activeConversationId === id ? null : s.activeConversationId,
        }));
      },

      pinConversation: (id) => {
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === id ? { ...c, pinned: !c.pinned } : c
          ),
        }));
      },

      // ── Projects ───────────────────────────────────────────────

      createProject: (name, emoji = "🧬") => {
        const project: Project = {
          id: generateId(),
          name,
          emoji,
          conversations: [],
          savedSources:  [],
          notes:         [],
          tags:          [],
          createdAt:     new Date(),
          updatedAt:     new Date(),
        };
        set((s) => ({ projects: [project, ...s.projects] }));
        return project.id;
      },

      setActiveProject: (id) => set({ activeProjectId: id }),

      deleteProject: (id) => {
        set((s) => ({
          projects:        s.projects.filter((p) => p.id !== id),
          activeProjectId: s.activeProjectId === id ? null : s.activeProjectId,
        }));
      },

      // ── Sources ────────────────────────────────────────────────

      saveSource: (source) => {
        set((s) => ({ savedSources: [source, ...s.savedSources] }));
      },

      removeSource: (id) => {
        set((s) => ({ savedSources: s.savedSources.filter((s) => s.id !== id) }));
      },

      // ── Selectors ──────────────────────────────────────────────

      getActiveConversation: () => {
        const { conversations, activeConversationId } = get();
        return conversations.find((c) => c.id === activeConversationId) ?? null;
      },

      getConversationMessages: (id) => {
        return get().conversations.find((c) => c.id === id)?.messages ?? [];
      },
    }),
    {
      name: "biomedical-os-workspace",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        conversations: s.conversations,
        projects:      s.projects,
        savedSources:  s.savedSources,
      }),
    }
  )
);
