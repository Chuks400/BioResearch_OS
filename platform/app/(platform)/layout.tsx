"use client";

import { useEffect } from "react";
import { Sidebar }        from "@/components/layout/sidebar";
import { TopBar }         from "@/components/layout/top-bar";
import { RightPanel }     from "@/components/layout/right-panel";
import { CommandPalette } from "@/components/shared/command-palette";
import { useUIStore }     from "@/store/ui";
import { checkBackendHealth } from "@/lib/api";

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const { setBackendOnline } = useUIStore();

  // Health-check backend on mount and every 30 s
  useEffect(() => {
    const check = async () => {
      const alive = await checkBackendHealth();
      setBackendOnline(alive);
    };
    check();
    const interval = setInterval(check, 30_000);
    return () => clearInterval(interval);
  }, [setBackendOnline]);

  // Global keyboard shortcuts
  useEffect(() => {
    const { toggleSidebar, toggleRightPanel } = useUIStore.getState();
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        if (e.key === "\\") { e.preventDefault(); toggleSidebar(); }
        if (e.key === "/")  { e.preventDefault(); toggleRightPanel(); }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar />

        <div className="flex flex-1 min-h-0 overflow-hidden">
          <main className="flex-1 min-w-0 overflow-hidden">
            {children}
          </main>

          <RightPanel />
        </div>
      </div>

      <CommandPalette />
    </div>
  );
}
