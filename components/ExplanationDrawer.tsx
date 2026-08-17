import { getEvidenceLevelBadge } from "@/lib/utils/badges";
import { useEffect, useRef } from "react";
import { useClinicalMode } from "@/hooks/useClinicalMode";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { ClinicalMode } from "./ExplanationDrawerModes/ClinicalMode";
import { PatientMode } from "./ExplanationDrawerModes/PatientMode";

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
  const { isClinicalMode, toggleClinicalMode } = useClinicalMode();
  const drawerRef = useRef<HTMLDivElement>(null);

  // Trap tab focus inside drawer when open
  useFocusTrap(drawerRef, isOpen);

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
            <ClinicalMode
              evidenceBadge={evidenceBadge}
              clinicalDetail={clinicalDetail}
              source={source}
            />
          ) : (
            <PatientMode
              isExplanationLoading={isExplanationLoading}
              explanationData={explanationData}
              interactionId={interactionId}
              onExplainRequested={onExplainRequested}
            />
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
