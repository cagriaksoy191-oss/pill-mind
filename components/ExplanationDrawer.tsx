import { getEvidenceLevelBadge } from "@/lib/utils/badges";
import React, { useState, useEffect, useRef } from "react";
import { useFocusTrap } from "@/hooks/useFocusTrap";

interface ExplanationData {
  explanation?: string;
  source?: string;
  generatedAt?: string;
  reason?: string;
  error?: string;
}

interface ExplanationDrawerProps {
  isOpen: boolean;
  interactionId: string;
  isExplanationLoading?: boolean;
  explanationData?: ExplanationData;
  onExplainRequested: (id: string, force: boolean) => void;
  verificationStatus?: string;
  sourceLabel?: string;
  source?: string;
  evidenceLevel?: string;
  clinicalDetail?: string;
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


export default function ExplanationDrawer({
  isOpen,
  interactionId,
  isExplanationLoading,
  explanationData,
  onExplainRequested,
  verificationStatus,
  sourceLabel,
  source,
  evidenceLevel,
  clinicalDetail,
}: ExplanationDrawerProps) {
  const [isClinicalMode, setIsClinicalMode] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("pillmind_clinical_mode") === "true";
    }
    return false;
  });
  const drawerRef = useRef<HTMLDivElement>(null);

  // Trap tab focus inside drawer when open
  useFocusTrap(drawerRef, isOpen);

  const toggleClinicalMode = () => {
    const nextMode = !isClinicalMode;
    setIsClinicalMode(nextMode);
    if (typeof window !== "undefined") {
      localStorage.setItem("pillmind_clinical_mode", String(nextMode));
      window.dispatchEvent(new Event("pillmind_clinical_mode_changed"));
    }
  };

  useEffect(() => {
    const handleModeChange = () => {
      if (typeof window !== "undefined") {
        const currentMode = localStorage.getItem("pillmind_clinical_mode") === "true";
        setIsClinicalMode(currentMode);
      }
    };
    window.addEventListener("pillmind_clinical_mode_changed", handleModeChange);
    return () => {
      window.removeEventListener("pillmind_clinical_mode_changed", handleModeChange);
    };
  }, []);

  // Auto-request AI explanation if switching to Hasta mode and not loaded
  useEffect(() => {
    if (isOpen && !isClinicalMode && !explanationData && !isExplanationLoading) {
      onExplainRequested(interactionId, false);
    }
  }, [isOpen, isClinicalMode, explanationData, isExplanationLoading, interactionId, onExplainRequested]);

  const evidenceBadge = getEvidenceLevelBadge(evidenceLevel);

  return (
    <div
      ref={drawerRef}
      id={`explain-drawer-${interactionId}`}
      className={`px-6 pb-6 border-t border-slate-200/50 dark:border-slate-800/50 pt-5 bg-white/60 dark:bg-slate-950/60 backdrop-blur-md animate-slide-down ${
        isOpen ? "block" : "hidden print:block"
      }`}
    >
      {/* Premium Segmented Toggle Switch */}
      <div className="flex items-center justify-between border-b border-slate-200/30 dark:border-slate-800/30 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Açıklama Katmanı
          </span>
        </div>
        <div className="bg-slate-200/50 dark:bg-slate-900/50 p-0.5 rounded-lg flex border border-slate-200/20 dark:border-slate-800/30">
          <button
            onClick={() => isClinicalMode && toggleClinicalMode()}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all duration-200 cursor-pointer flex items-center gap-1 ${
              !isClinicalMode
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <span>👤</span> Hasta
          </button>
          <button
            onClick={() => !isClinicalMode && toggleClinicalMode()}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all duration-200 cursor-pointer flex items-center gap-1 ${
              isClinicalMode
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <span>🩺</span> Hekim
          </button>
        </div>
      </div>

      <div className="flex gap-3">
        <span className="text-2xl shrink-0" role="img" aria-label="AI İkonu">
          {isClinicalMode ? "🔬" : "🤖"}
        </span>
        <div className="flex-1 min-w-0">
          {isClinicalMode ? (
            /* Hekim Modu Detaylı Görünümü */
            <div className="flex flex-col gap-3 py-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500">Kanıt Seviyesi:</span>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold tracking-wide uppercase border ${evidenceBadge.style}`}
                  title={evidenceBadge.desc}
                >
                  {evidenceBadge.label}
                </span>
              </div>

              <div className="bg-indigo-500/5 dark:bg-indigo-950/20 border border-indigo-500/10 rounded-xl p-4">
                <h5 className="text-xs font-bold uppercase tracking-wider text-indigo-500 dark:text-indigo-400 mb-1.5 flex items-center gap-1">
                  <span>🧬</span> Farmakolojik Mekanizma Detayı
                </h5>
                <p className="text-sm text-slate-800 dark:text-slate-300 leading-relaxed font-semibold">
                  {clinicalDetail || "Bu etkileşim için özel klinik mekanizma kaydı bulunmamaktadır. Lütfen kaynakları inceleyin."}
                </p>
              </div>

              {source && (
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  <span className="font-bold text-slate-600 dark:text-slate-500">Klinik Literatür &amp; Referans:</span>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {source.split(";").map((src, i) => {
                      const trimSrc = src.trim();
                      if (!trimSrc) return null;
                      const isPubMed = trimSrc.toLowerCase().includes("pubmed");
                      const url = isPubMed
                        ? `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(trimSrc)}`
                        : `https://www.google.com/search?q=${encodeURIComponent(trimSrc)}`;
                      return (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500/40 text-slate-600 dark:text-slate-400 hover:text-indigo-400 transition-colors"
                        >
                          <span>📖</span> {trimSrc}
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Hasta Modu (AI Açıklaması) */
            <>
              {isExplanationLoading ? (
                <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 py-6" aria-live="assertive">
                  <svg className="animate-spin h-5 w-5 text-indigo-500 shrink-0" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span className="text-sm font-semibold tracking-wide animate-pulse">
                    Klinik Canlı AI Açıklaması Hazırlanıyor...
                  </span>
                </div>
              ) : explanationData?.source === "gemini_live" || explanationData?.source === "cache" ? (
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
                    <p className="text-sm font-extrabold text-red-800 dark:text-red-300">Sistem Durumu</p>
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
            </>
          )}
        </div>
      </div>

      {/* Footer / Disclaimer in both modes */}
      {(sourceLabel || verificationStatus) && (
        <div className="mt-5 pt-4 border-t border-slate-200/30 dark:border-slate-800/30 flex flex-wrap items-center gap-3">
          {verificationStatus === "verified" && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20 shadow-sm">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
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
  );
}
