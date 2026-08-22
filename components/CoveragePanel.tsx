import { useEffect, useRef } from "react";
import { useClinicalMode } from "@/hooks/useClinicalMode";
import { CheckResult } from "@/lib/interactions";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import CoverageClinicalView from "./CoveragePanelSections/CoverageClinicalView";
import CoveragePatientView from "./CoveragePanelSections/CoveragePatientView";

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
  const { isClinicalMode, toggleClinicalMode } = useClinicalMode();
  const panelRef = useRef<HTMLDivElement>(null);

  // Trap focus inside coverage panel when visible
  useFocusTrap(panelRef, showCoveragePanel);

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
        <CoverageClinicalView interactions={interactions} />
      ) : (
        <CoveragePatientView
          isCoverageLoading={isCoverageLoading}
          coverageExplanation={coverageExplanation}
          handleRequestCoverageExplanation={handleRequestCoverageExplanation}
        />
      )}
    </div>
  );
}
