import { create } from "zustand";
import type { ActiveView, PanelState, AppScreen } from "@/lib/types";

interface UIState {
  panels: PanelState;
  activeView: ActiveView;
  isLoading: boolean;
  backendOnline: boolean;

  // ── Panel actions ──────────────────────────────────────────────
  toggleSidebar:         () => void;
  toggleRightPanel:      () => void;
  toggleCommandPalette:  () => void;
  toggleRetrievalInspector: () => void;
  setRightPanelWidth:    (w: number) => void;
  closeCommandPalette:   () => void;

  // ── Navigation ─────────────────────────────────────────────────
  navigate: (screen: AppScreen, extras?: Partial<ActiveView>) => void;

  // ── Global state ───────────────────────────────────────────────
  setLoading:       (v: boolean) => void;
  setBackendOnline: (v: boolean) => void;
}

export const useUIStore = create<UIState>()((set) => ({
  panels: {
    leftSidebar:        true,
    rightPanel:         true,
    rightPanelWidth:    320,
    commandPalette:     false,
    retrievalInspector: false,
  },
  activeView:     { screen: "home" },
  isLoading:      false,
  backendOnline:  false,

  toggleSidebar: () =>
    set((s) => ({ panels: { ...s.panels, leftSidebar: !s.panels.leftSidebar } })),

  toggleRightPanel: () =>
    set((s) => ({ panels: { ...s.panels, rightPanel: !s.panels.rightPanel } })),

  toggleCommandPalette: () =>
    set((s) => ({ panels: { ...s.panels, commandPalette: !s.panels.commandPalette } })),

  toggleRetrievalInspector: () =>
    set((s) => ({ panels: { ...s.panels, retrievalInspector: !s.panels.retrievalInspector } })),

  setRightPanelWidth: (w) =>
    set((s) => ({ panels: { ...s.panels, rightPanelWidth: w } })),

  closeCommandPalette: () =>
    set((s) => ({ panels: { ...s.panels, commandPalette: false } })),

  navigate: (screen, extras = {}) =>
    set({ activeView: { screen, ...extras } }),

  setLoading:       (v) => set({ isLoading: v }),
  setBackendOnline: (v) => set({ backendOnline: v }),
}));
