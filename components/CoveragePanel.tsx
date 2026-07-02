import { getEvidenceLevelBadge } from "@/lib/utils/badges";
import React, { useState, useEffect, useRef } from "react";
import { CheckResult } from "@/lib/interactions";
import { useFocusTrap } from "@/hooks/useFocusTrap";

interface CoveragePanelProps {
  showCoveragePanel: boolean;
  setShowCoveragePanel: (show: boolean) => void;
  isCoverageLoading: boolean;
  coverageExplanation: {
    source?: string;
    explanation?: string;
    generatedAt?: string;
    error?: string;
  } | null;
  handleRequestCoverageExplanation: () => Promise<void>;
  interactions?: CheckResult[];
}

export default function CoveragePanel({
  showCoveragePanel,
  setShowCoveragePanel,
  isCoverageLoading,
  coverageExplanation,
  handleRequestCoverageExplanation,
  interactions = [],
}: CoveragePanelProps) {
  const [isClinicalMode, setIsClinicalMode] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("pillmind_clinical_mode") === "true";
    }
    return false;
  });
  const panelRef = useRef<HTMLDivElement>(null);

  // Trap focus inside coverage panel when visible
  useFocusTrap(panelRef, showCoveragePanel);

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

  // Auto-trigger analysis if switching to Hasta mode and empty
  useEffect(() => {
    if (showCoveragePanel && !isClinicalMode && !coverageExplanation && !isCoverageLoading) {
      handleRequestCoverageExplanation();
    }
  }, [showCoveragePanel, isClinicalMode, coverageExplanation, isCoverageLoading, handleRequestCoverageExplanation]);

  if (!showCoveragePanel) return null;

  return (
    <div
      ref={panelRef}
      className="backdrop-blur-xl bg-slate-900/90 border border-indigo-500/20 rounded-3xl p-6 shadow-2xl mt-4 animate-fade-in relative overflow-hidden"
      style={{ boxShadow: "0 20px 40px -15px rgba(99, 102, 241, 0.25)" }}
    >
      <div className="absolute top-0 right-0 p-12 bg-linear-to-bl from-indigo-500/5 to-transparent rounded-full pointer-events-none" />

      <div className="flex justify-between items-center mb-4 pb-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="text-xl">{isClinicalMode ? "🔬" : "🤖"}</span>
          <div>
            <h4 className="font-extrabold text-white text-sm tracking-tight">Kapsamlı İlaç Analiz Raporu</h4>
            <p className="text-[9px] text-slate-400 mt-0.5">
              {isClinicalMode ? "Deterministik Veri Modu" : "Google Gemini Güvenlik Katmanı"}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowCoveragePanel(false)}
          className="w-6 h-6 rounded-md bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white text-xs cursor-pointer transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Segmented control for switching views */}
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/5">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Açıklama Katmanı</span>
        <div className="bg-slate-800/50 p-0.5 rounded-lg flex border border-white/5">
          <button
            onClick={() => isClinicalMode && toggleClinicalMode()}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all duration-200 cursor-pointer flex items-center gap-1 ${
              !isClinicalMode ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <span>👤</span> Hasta
          </button>
          <button
            onClick={() => !isClinicalMode && toggleClinicalMode()}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all duration-200 cursor-pointer flex items-center gap-1 ${
              isClinicalMode ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <span>🩺</span> Hekim
          </button>
        </div>
      </div>

      {isClinicalMode ? (
        /* Hekim Modu: Deterministik verileri listele */
        <div className="flex flex-col gap-4 py-2">
          <h5 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-2 flex items-center gap-1">
            <span>🔬</span> Deterministik Klinik Kanıt Verileri
          </h5>
          {interactions && interactions.length > 0 ? (
            <div className="flex flex-col gap-3">
              {interactions.map((res) => {
                const level = res.interaction.evidenceLevel;
                const evidenceBadge = getEvidenceLevelBadge(level);
                return (
                  <div key={res.interaction.id} className="bg-indigo-950/30 border border-indigo-500/15 rounded-2xl p-4">
                    <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                      <span className="text-xs font-extrabold text-white">
                        {res.drug1Name} &amp; {res.drug2Name}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${evidenceBadge.style}`}>
                        {evidenceBadge.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed font-semibold">
                      {res.interaction.clinicalDetail || res.interaction.summary}
                    </p>
                    {res.interaction.source && (
                      <div className="text-[10px] text-slate-400 mt-2">
                        <span className="font-bold">Referanslar:</span>{" "}
                        {res.interaction.source.split(";").map((s, idx) => {
                          const trimSrc = s.trim();
                          if (!trimSrc) return null;
                          const isPubMed = trimSrc.toLowerCase().includes("pubmed");
                          const url = isPubMed
                            ? `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(trimSrc)}`
                            : `https://www.google.com/search?q=${encodeURIComponent(trimSrc)}`;
                          return (
                            <a
                              key={idx}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-block mx-1 hover:text-indigo-400 underline"
                            >
                              {trimSrc}
                            </a>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white/5 border border-white/5 rounded-2xl p-5 text-center text-xs text-slate-400">
              Kombinasyon içinde bilinen ikili klinik etkileşim kaydı bulunmamaktadır.
            </div>
          )}
        </div>
      ) : (
        /* Hasta Modu: AI Açıklaması */
        <>
          {isCoverageLoading ? (
            <div className="py-8 flex flex-col items-center justify-center gap-3">
              <svg className="animate-spin h-6 w-6 text-indigo-500" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-xs text-slate-400 font-semibold animate-pulse tracking-wide">
                Tüm Kombinasyon Canlı Yapay Zekayla Analiz Ediliyor...
              </p>
            </div>
          ) : coverageExplanation?.source === "gemini_live" || coverageExplanation?.source === "cache" ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-2">
                {coverageExplanation.source === "cache" ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[9px] font-bold tracking-wide uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    Önbellek Yanıtı
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[9px] font-bold tracking-wide uppercase bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse"></span>
                    Canlı Analiz
                  </span>
                )}
                {coverageExplanation.generatedAt && (
                  <span className="text-[9px] text-slate-400 font-semibold bg-white/5 border border-white/5 px-2 py-0.5 rounded">
                    {coverageExplanation.generatedAt}
                  </span>
                )}
              </div>

              <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-line font-medium pr-1">
                {coverageExplanation.explanation}
              </div>

              {/* Disclaimer specifically designed inside our clinical display panel */}
              <div className="mt-2 bg-white/5 p-3.5 rounded-xl border border-white/5">
                <p className="text-[10px] text-slate-400 italic leading-relaxed font-medium">
                  <strong>Klinik Uyarı:</strong> Bu analiz tamamen bilgilendirme amaçlıdır. İlaç tedavlerinizi değiştirmeden, bırakmadan veya doz ayarlamadan önce her zaman hekiminize veya eczacınıza danışınız. Yapay zeka hiçbir koşulda profesyonel hekim kararının yerine geçemez.
                </p>
              </div>
            </div>
          ) : coverageExplanation?.source === "error" ? (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-center">
              <h5 className="text-xs font-bold text-red-200">Analiz Tamamlanamadı</h5>
              <p className="text-[10px] text-red-400/80 mt-1.5 leading-relaxed font-medium">
                {coverageExplanation.error || "Canlı kombinasyon açıklaması şu anda sunulamıyor."}
              </p>
              <button
                onClick={handleRequestCoverageExplanation}
                className="mt-3 px-3 py-1.5 bg-white/5 border border-red-500/20 text-red-300 hover:bg-red-500/10 text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                Yeniden Dene
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
