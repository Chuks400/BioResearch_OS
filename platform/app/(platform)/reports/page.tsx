"use client";

import { motion } from "framer-motion";
import { FileText, Download } from "lucide-react";

export default function ReportsPage() {
  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto space-y-6">

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-xl font-semibold text-foreground">Reports</h1>
          <p className="text-sm text-muted-dark mt-1">Export and share your research findings</p>
        </motion.div>

        <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
          <FileText size={32} className="text-muted-dark/40" />
          <p className="text-sm text-muted-dark">No reports generated yet</p>
          <p className="text-xs text-muted-dark/60 max-w-xs">Run queries and save sources, then export them as a structured research report</p>
        </div>
      </div>
    </div>
  );
}
