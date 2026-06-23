"use client";

import { useState } from "react";
import { getSeverityLabel } from "@/lib/interactions";
import ExplanationDrawer from "./ExplanationDrawer";

interface ResultCardProps {
  drug1Name: string;
  drug2Name: string;
  severity: string;
  summary: string;
  interactionId: string;
  sourceLabel?: string;
  verificationStatus?: string;
  source?: string;
  evidenceLevel?: string;
  clinicalDetail?: string;
  explanationData?: {
    explanation?: string;
    source?: string;
    generatedAt?: string;
    reason?: string;
    error?: string;
  };
  isExplanationLoading?: boolean;
  onExplainRequested: (id: string, force: boolean) => void;
}

export default function ResultCard({
  interactionId,
  drug1Name,
  drug2Name,
  severity,
  summary,
  sourceLabel,
  verificationStatus,
  source,
  evidenceLevel,
  clinicalDetail,
  explanationData,
  isExplanationLoading,
  onExplainRequested,
}: ResultCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const label = getSeverityLabel(severity);

  // Premium, customized dark/light glassmorphic status theme mapping
  const getGlassColors = (sev: string) => {
    switch (sev) {
      case "high":
        return {
          cardBg: "bg-red-500/5 dark:bg-red-950/15 border-red-500/20 dark:border-red-500/30",
          badge: "bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/20",
          text: "text-red-800 dark:text-red-200",
          accentColor: "#ef4444",
          icon: "🔴",
        };
      case "medium":
        return {
          cardBg: "bg-amber-500/5 dark:bg-amber-950/15 border-amber-500/20 dark:border-amber-500/30",
          badge: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20",
          text: "text-amber-800 dark:text-amber-200",
          accentColor: "#f59e0b",
          icon: "🟡",
        };
      case "low":
        return {
          cardBg: "bg-emerald-500/5 dark:bg-emerald-950/15 border-emerald-500/20 dark:border-emerald-500/30",
          badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20",
          text: "text-emerald-800 dark:text-emerald-200",
          accentColor: "#10b981",
          icon: "🟢",
        };
      default:
        return {
          cardBg: "bg-slate-500/5 dark:bg-slate-950/15 border-slate-500/20 dark:border-slate-500/30",
          badge: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-500/20",
          text: "text-slate-800 dark:text-slate-200",
          accentColor: "#64748b",
          icon: "ℹ️",
        };
    }
  };

  const currentTheme = getGlassColors(severity);

  return (
    <div
      className={`rounded-2xl border backdrop-blur-xl ${currentTheme.cardBg} overflow-hidden shadow-lg transition-all duration-300 hover:scale-[1.015] hover:shadow-2xl`}
      style={{
        boxShadow: `0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)`,
      }}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2.5 mb-2">
              <span className="text-base" role="img" aria-label="Etkileşim Seviye İkonu">
                {currentTheme.icon}
              </span>
              <span
                className={`text-[11px] font-bold tracking-wide uppercase px-2.5 py-0.5 rounded-full ${currentTheme.badge}`}
              >
                {label}
              </span>
            </div>

            <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-lg md:text-xl mt-3 tracking-tight flex items-center gap-2">
              <span className="text-indigo-500 dark:text-indigo-400">{drug1Name}</span>
              <span className="text-slate-400 dark:text-slate-600 font-light">&amp;</span>
              <span className="text-indigo-500 dark:text-indigo-400">{drug2Name}</span>
            </h3>

            <p className={`text-sm mt-2 leading-relaxed font-medium ${currentTheme.text}`}>
              {summary}
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            const nextIsOpen = !isOpen;
            setIsOpen(nextIsOpen);
            if (nextIsOpen && !isExplanationLoading) {
              onExplainRequested(interactionId, true);
            }
          }}
          className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 transition-colors duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/40 rounded px-2 py-1 bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/10"
          aria-expanded={isOpen}
          aria-controls={`explain-drawer-${interactionId}`}
        >
          <span>{isOpen ? "Açıklama Detayını Gizle" : "Klinik Canlı AI Açıklamasını Gör"}</span>
          <span className="text-xs transition-transform duration-200" style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0)" }}>
            ▼
          </span>
        </button>
      </div>

      <ExplanationDrawer
        isOpen={isOpen}
        interactionId={interactionId}
        isExplanationLoading={isExplanationLoading}
        explanationData={explanationData}
        onExplainRequested={onExplainRequested}
        verificationStatus={verificationStatus}
        sourceLabel={sourceLabel}
        source={source}
        evidenceLevel={evidenceLevel}
        clinicalDetail={clinicalDetail}
      />
    </div>
  );
}
