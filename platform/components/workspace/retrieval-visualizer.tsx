"use client";

import { motion } from "framer-motion";
import { ArrowDown, Search, Filter, Zap, Brain, CheckCircle2, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import type { QueryResult } from "@/lib/types";

interface RetrievalVisualizerProps {
  result: QueryResult;
  compact?: boolean;
}

export function RetrievalVisualizer({ result, compact = false }: RetrievalVisualizerProps) {
  const isRetrieve = result.retrieve_decision.includes("Retrieve") && !result.retrieve_decision.includes("No");

  const steps = [
    {
      id:    "query",
      icon:  Brain,
      label: "Query",
      desc:  result.query.slice(0, 60) + (result.query.length > 60 ? "…" : ""),
      color: "accent",
      done:  true,
    },
    {
      id:    "decision",
      icon:  Zap,
      label: "Retrieve decision",
      desc:  result.retrieve_decision.replace(/\[|\]/g, ""),
      color: isRetrieve ? "success" : "warning",
      done:  true,
    },
    ...(isRetrieve ? [
      {
        id:    "retrieve",
        icon:  Search,
        label: "Hybrid retrieval",
        desc:  `BM25 + dense · top-${result.candidates.length} candidates`,
        color: "accent",
        done:  true,
      },
      {
        id:    "rank",
        icon:  Filter,
        label: "Rank & filter",
        desc:  `${result.candidates.filter((c) => c.passage).length} sources selected`,
        color: "accent",
        done:  true,
      },
    ] : []),
    {
      id:    "answer",
      icon:  FileText,
      label: "Answer generated",
      desc:  `${result.backend} backend · ${result.model_name.split("/").pop()}`,
      color: "success",
      done:  true,
    },
  ];

  if (compact) {
    return (
      <div className="flex items-center gap-1 flex-wrap">
        {steps.map((step, i) => (
          <div key={step.id} className="flex items-center gap-1">
            <div className={cn(
              "flex items-center gap-1 px-2 py-0.5 rounded-md text-2xs font-medium",
              step.color === "success" ? "bg-success/10 text-success" :
              step.color === "warning" ? "bg-warning/10 text-warning" :
              "bg-accent/10 text-accent/80"
            )}>
              <step.icon size={9} />
              <span>{step.label}</span>
            </div>
            {i < steps.length - 1 && <ArrowDown size={8} className="text-muted-dark rotate-[-90deg]" />}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl bg-card border border-border space-y-1">
      <p className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2">
        <Brain size={12} className="text-accent" />
        Self-RAG retrieval pipeline
      </p>

      <div className="space-y-0">
        {steps.map((step, i) => (
          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06, duration: 0.2 }}
          >
            <div className="flex gap-3">
              {/* Connector line */}
              <div className="flex flex-col items-center">
                <div className={cn(
                  "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 border",
                  step.color === "success" ? "bg-success/10 border-success/20 text-success" :
                  step.color === "warning" ? "bg-warning/10 border-warning/20 text-warning" :
                  "bg-accent/10 border-accent/20 text-accent"
                )}>
                  <step.icon size={12} />
                </div>
                {i < steps.length - 1 && (
                  <div className="w-px flex-1 bg-border/60 my-1 min-h-[16px]" />
                )}
              </div>

              {/* Step content */}
              <div className="pb-3 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-foreground">{step.label}</span>
                  <CheckCircle2 size={10} className={cn(
                    step.color === "success" ? "text-success" :
                    step.color === "warning" ? "text-warning" : "text-accent"
                  )} />
                </div>
                <p className="text-2xs text-muted-dark mt-0.5 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
