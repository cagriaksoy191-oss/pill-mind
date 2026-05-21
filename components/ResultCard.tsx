"use client";

import { useState } from "react";
import { getSeverityColor, getSeverityLabel } from "@/lib/interactions";

interface ResultCardProps {
  drug1Name: string;
  drug2Name: string;
  severity: string;
  summary: string;
  interactionId: string;
  sourceLabel?: string;
  verificationStatus?: string;
  source?: string;
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

function getLiveErrorTitle(reason?: string) {
  if (reason === "rate_limited" || reason === "timeout") {
    return "Canlı AI Şu Anda Kullanılamıyor";
  }

  if (reason === "missing_api_key" || reason === "demo_mode") {
    return "Canlı AI Kapalı";
  }

  return "Canlı AI Açıklaması Alınamadı";
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

      {isOpen && (
        <div
          id={`explain-drawer-${interactionId}`}
          className="px-6 pb-6 border-t border-slate-200/50 dark:border-slate-800/50 pt-5 bg-white/60 dark:bg-slate-950/60 backdrop-blur-md animate-slide-down"
        >
          <div className="flex gap-3">
            <span className="text-2xl shrink-0" role="img" aria-label="AI İkonu">🤖</span>
            <div className="flex-1 min-w-0">
              {isExplanationLoading ? (
                <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 py-6" aria-live="assertive">
                  <svg
                    className="animate-spin h-5 w-5 text-indigo-500 shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  <span className="text-sm font-semibold tracking-wide animate-pulse">
                    Klinik Canlı AI Açıklaması Hazırlanıyor...
                  </span>
                </div>
              ) : (explanationData?.source === "gemini_live" || explanationData?.source === "cache") ? (
                <>
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <p className="text-sm font-extrabold text-slate-800 dark:text-slate-200 tracking-tight">
                      Klinik Güvenlik Katmanı
                    </p>
                    
                    {explanationData.source === "cache" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold tracking-wide uppercase bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 shadow-sm animate-pulse-slow">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Güvenli Önbellek Yanıtı
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold tracking-wide uppercase bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20 shadow-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse"></span>
                        Canlı AI Açıklaması
                      </span>
                    )}
                    
                    {explanationData.generatedAt && (
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200/30 dark:border-slate-800/30">
                        {explanationData.generatedAt}
                      </span>
                    )}
                  </div>
                  
                  <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed md:pr-4 whitespace-pre-line font-medium">
                    {explanationData.explanation}
                  </div>
                </>
              ) : explanationData?.source === "error" ? (
                <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-4">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <p className="text-sm font-extrabold text-red-800 dark:text-red-300">
                      Sistem Durumu
                    </p>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide bg-white dark:bg-slate-900 text-red-700 dark:text-red-400 border border-red-200/50 dark:border-red-800/50 shadow-sm">
                      {getLiveErrorTitle(explanationData.reason)}
                    </span>
                  </div>
                  <p className="text-xs text-red-700 dark:text-red-400 leading-relaxed font-medium">
                    {explanationData.error ?? "Canlı AI açıklaması şu anda üretilemedi."}
                  </p>
                  <button
                    onClick={() => onExplainRequested(interactionId, true)}
                    className="mt-3 px-3.5 py-1.5 bg-white dark:bg-slate-900 border border-red-300 dark:border-red-800 rounded-lg shadow-sm hover:bg-red-50 dark:hover:bg-red-950/20 text-red-700 dark:text-red-400 text-xs font-bold cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/40"
                  >
                    Tekrar Dene
                  </button>
                </div>
              ) : (
                <div className="py-4 text-sm text-slate-500 dark:text-slate-400 italic">
                  Canlı açıklama henüz alınmadı. Lütfen tekrar deneyin.
                </div>
              )}
            </div>
          </div>

          {(sourceLabel || verificationStatus) && (
            <div className="mt-5 pt-4 border-t border-slate-200/30 dark:border-slate-800/30 flex flex-wrap items-center gap-3">
              {verificationStatus === "verified" && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20 shadow-sm">
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.8}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Deterministik Klinik Kanıtı
                </span>
              )}
              {sourceLabel && (
                <span
                  className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-semibold whitespace-nowrap bg-slate-100 dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-200/40 dark:border-slate-800/40 cursor-help"
                  title={source}
                >
                  📖 Kaynak: {sourceLabel}
                </span>
              )}
            </div>
          )}

          <div className="mt-4 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200/40 dark:border-slate-800/40">
            <p className="text-xs text-slate-500 dark:text-slate-400 italic leading-relaxed font-medium">
              <strong>Yasal Uyarı:</strong> Bu açıklamalar yalnızca hastayı bilgilendirme amaçlı üretilmiştir. Yapay zeka hekim kararlarının yerine geçemez. İlaç dozunu değiştirmeyiniz, ilacı bırakmayınız. Her türlü tıbbi değişiklik için hekiminize veya eczacınıza danışın.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
