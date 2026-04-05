"use client";

import { useState } from "react";
import { getSeverityLabel, getSeverityColor } from "@/lib/interactions";

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
    explanation: string;
    source?: string;
    generatedAt?: string;
    fallbackReason?: string;
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
  explanationData,
  isExplanationLoading,
  onExplainRequested,
}: ResultCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const colors = getSeverityColor(severity);
  const label = getSeverityLabel(severity);

  const severityIcon =
    severity === "high" ? "🔴" : severity === "medium" ? "🟡" : "ℹ️";

  return (
    <div
      className={`rounded-xl border-2 ${colors.border} ${colors.bg} overflow-hidden transition-all duration-200`}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{severityIcon}</span>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colors.badge}`}
              >
                {label}
              </span>
            </div>
            <h3 className="font-bold text-slate-800 mt-2">
              {drug1Name} + {drug2Name}
            </h3>
            <p className={`text-sm mt-1 ${colors.text}`}>{summary}</p>
          </div>
        </div>

        <button
          onClick={() => {
            const nextIsOpen = !isOpen;
            setIsOpen(nextIsOpen);
            if (nextIsOpen && !explanationData && !isExplanationLoading) {
              onExplainRequested(interactionId, false);
            }
          }}
          className={`mt-3 text-sm font-medium ${colors.text} hover:underline cursor-pointer transition-colors`}
        >
          {isOpen ? "Detayı gizle ▲" : "Detayı gör ▼"}
        </button>
      </div>

      {isOpen && (
        <div className="px-5 pb-5 border-t border-slate-200/60 pt-4 bg-white/50">
          <div className="flex gap-2">
            <span className="text-xl">🤖</span>
            <div className="flex-1">
              
              {isExplanationLoading ? (
                <div className="flex items-center gap-3 text-slate-500 py-4">
                  <svg className="animate-spin h-5 w-5 text-indigo-500" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span className="text-sm font-medium">Canlı açıklama hazırlanıyor...</span>
                </div>
              ) : explanationData ? (
                <>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <p className="text-sm font-semibold text-slate-800">
                      Açıklama Katmanı
                    </p>
                    {explanationData.source === "gemini_live" ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse"></span>
                        Canlı AI Açıklaması
                      </span>
                    ) : explanationData.source === "gemini_cached" ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                        Önbelleklenmiş AI Açıklaması
                      </span>
                    ) : explanationData.source === "fallback" ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                        {explanationData.fallbackReason === "rate_limited" || explanationData.fallbackReason === "timeout"
                          ? "AI Yoğun - Yedek Açıklama"
                          : explanationData.fallbackReason === "unsafe_output"
                          ? "Sınırlı Çıktı - Yedek Açıklama"
                          : explanationData.fallbackReason === "missing_api_key" || explanationData.fallbackReason === "demo_mode"
                          ? "Offline Demo - Yedek Açıklama"
                          : "Yedek Açıklama"}
                      </span>
                    ) : null}
                    {explanationData.generatedAt && (
                       <span className="text-[11px] text-slate-400 font-medium">
                         • {explanationData.generatedAt}
                       </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed md:pr-4">
                    {explanationData.explanation}
                  </p>
                  
                  {/* Retry butonu ve alt metin sadece rate_limited veya timeout'da gösterilir */}
                  {(explanationData.fallbackReason === "rate_limited" || explanationData.fallbackReason === "timeout") && (
                    <div className="mt-3 flex items-center justify-between bg-slate-50 border border-slate-200 rounded p-2">
                      <p className="text-xs text-slate-500 italic">
                        Not: Canlı AI katmanı şu an yoğun olabilir. Yedek açıklama gösteriliyor.
                      </p>
                      <button 
                        onClick={() => onExplainRequested(interactionId, true)} 
                        className="ml-3 px-3 py-1 shrink-0 bg-white border border-slate-300 rounded shadow-sm hover:bg-slate-50 text-indigo-600 text-xs font-semibold cursor-pointer transition-colors"
                      >
                        Tekrar Dene
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="py-4 text-sm text-slate-500">
                  Açıklama yüklenemedi. Lütfen tekrar deneyin.
                </div>
              )}
            </div>
          </div>
          
          {(sourceLabel || verificationStatus) && (
            <div className="mt-5 pt-4 border-t border-slate-200/50 flex flex-col sm:flex-row sm:items-center gap-3">
              {verificationStatus === "verified" && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200/60">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Doğrulandı
                </span>
              )}
              {sourceLabel && (
                <span 
                  className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-medium whitespace-nowrap cursor-help"
                  title={source}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  Kaynak: {sourceLabel}
                </span>
              )}
            </div>
          )}

          <div className="mt-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
             <p className="text-xs text-slate-500 italic leading-relaxed">
              <strong>Uyarı:</strong> Bu bilgiler genel bilgilendirme amaçlıdır; tanı, tedavi veya reçete önerisi içermez. İlaç kullanımınızı değiştirmeden önce daima sağlık profesyoneline danışın.
             </p>
          </div>
        </div>
      )}
    </div>
  );
}
