"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";

const SECTIONS = [
  {
    title: "Backend",
    fields: [
      { key: "backendUrl",  label: "REST API URL",   default: "http://127.0.0.1:7862", type: "text" },
      { key: "gradioUrl",   label: "Gradio UI URL",  default: "http://127.0.0.1:7861", type: "text" },
    ],
  },
  {
    title: "Defaults",
    fields: [
      { key: "defaultTopK",      label: "Default top-K",      default: "3",                          type: "number" },
      { key: "defaultIndex",     label: "Default index path",  default: "data/pubmedqa_index.json",   type: "text" },
      { key: "defaultBackend",   label: "Default backend",     default: "heuristic",                  type: "text" },
      { key: "defaultMode",      label: "Default answer mode", default: "freeform",                   type: "text" },
    ],
  },
  {
    title: "Appearance",
    fields: [
      { key: "theme", label: "Theme", default: "Dark (default)", type: "text" },
    ],
  },
];

export default function SettingsPage() {
  const [values, setValues] = useState<Record<string, string>>({});

  const get = (key: string, def: string) => values[key] ?? def;
  const set = (key: string, val: string) => setValues((s) => ({ ...s, [key]: val }));

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto space-y-8">

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-xl font-semibold text-foreground">Settings</h1>
          <p className="text-sm text-muted-dark mt-1">Configure your BioResearch OS environment</p>
        </motion.div>

        {SECTIONS.map((section) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <p className="text-xs font-semibold text-muted-dark uppercase tracking-wider">{section.title}</p>
            <div className="rounded-xl border border-border bg-card divide-y divide-border/60">
              {section.fields.map((f) => (
                <div key={f.key} className="flex items-center gap-4 px-4 py-3">
                  <label className="text-sm text-muted w-44 flex-shrink-0">{f.label}</label>
                  <input
                    type={f.type}
                    value={get(f.key, f.default)}
                    onChange={(e) => set(f.key, e.target.value)}
                    className="input-base text-xs py-1.5 flex-1"
                  />
                </div>
              ))}
            </div>
          </motion.div>
        ))}

        <button
          onClick={() => toast.success("Settings saved")}
          className="btn-primary text-sm px-5 py-2"
        >
          Save settings
        </button>
      </div>
    </div>
  );
}
