"use client";

import { useState } from "react";
import { getSeverityLabel, getSeverityColor } from "@/lib/interactions";

interface ResultCardProps {
  drug1Name: string;
  drug2Name: string;
  severity: string;
  summary: string;
  explanation: string;
  sourceLabel?: string;
  verificationStatus?: string;
  source?: string;
}

export default function ResultCard({
  drug1Name,
  drug2Name,
  severity,
  summary,
  explanation,
  sourceLabel,
  verificationStatus,
  source,
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
          onClick={() => setIsOpen(!isOpen)}
          className={`mt-3 text-sm font-medium ${colors.text} hover:underline cursor-pointer`}
        >
          {isOpen ? "Detayı gizle ▲" : "Detayı gör ▼"}
        </button>
      </div>

      {isOpen && (
        <div className="px-5 pb-5 border-t border-slate-200/60 pt-4 bg-white/50">
          <div className="flex gap-2">
            <span className="text-xl">🤖</span>
            <div className="flex-1">
              <p className="text-sm text-slate-800 leading-relaxed font-medium">
                Açıklama:
              </p>
              <p className="text-sm text-slate-700 leading-relaxed mt-1">
                {explanation}
              </p>
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
