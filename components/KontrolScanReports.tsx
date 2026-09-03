"use client";

import { Dispatch, SetStateAction } from "react";
import {
  Drug,
  CheckResult,
  ExplanationData,
  AccumulationWarning,
  ContraindicationResult,
  PolypharmacyReport,
  FoodInteractionResult,
} from "@/lib/interactions";
import LiveReportsPanel from "@/components/LiveReports/LiveReportsPanel";
import { CoverageExplanation } from "@/hooks/useCoverageExplanation";

interface KontrolScanReportsProps {
  selectedDrugIds: string[];
  setSelectedDrugIds: Dispatch<SetStateAction<string[]>>;
  selectedDrugs: Drug[];
  interactions: CheckResult[];
  setInteractions: Dispatch<SetStateAction<CheckResult[]>>;
  isChecking: boolean;
  checkingError: string | null;
  explanations: Record<string, ExplanationData>;
  accumulationWarnings: AccumulationWarning[];
  contraindications: ContraindicationResult[];
  polypharmacyReport: PolypharmacyReport | null;
  foodInteractions: FoodInteractionResult[];
  loadingExplanations: Record<string, boolean>;
  onExplainRequested: (interactionId: string, force: boolean) => Promise<void>;
  handleRequestCoverageExplanation: () => Promise<void>;
  isCoverageLoading: boolean;
  showCoveragePanel: boolean;
  setShowCoveragePanel: (show: boolean) => void;
  coverageExplanation: CoverageExplanation | null;
  setCoverageExplanation: Dispatch<SetStateAction<CoverageExplanation | null>>;
}

export default function KontrolScanReports({
  selectedDrugIds,
  setSelectedDrugIds,
  selectedDrugs,
  interactions,
  setInteractions,
  isChecking,
  checkingError,
  explanations,
  accumulationWarnings,
  contraindications,
  polypharmacyReport,
  foodInteractions,
  loadingExplanations,
  onExplainRequested,
  handleRequestCoverageExplanation,
  isCoverageLoading,
  showCoveragePanel,
  setShowCoveragePanel,
  coverageExplanation,
  setCoverageExplanation,
}: KontrolScanReportsProps) {
  return (
    <section className="lg:col-span-5 flex flex-col gap-6" aria-label="Klinik Tarama Raporları">
      {/* Header for Results */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
          📊 Tarama Raporları
          {selectedDrugIds.length >= 2 && !isChecking && (
            <span className="text-xs px-2 py-0.5 rounded-md bg-slate-200/50 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-500 dark:text-slate-400">
              {interactions.length} Etkileşim
            </span>
          )}
        </h3>

        {/* Print and Clear Buttons */}
        <div className="flex items-center gap-2 print:hidden">
          {selectedDrugIds.length >= 2 && !isChecking && (
            <button
              onClick={() => window.print()}
              className="text-xs font-bold text-indigo-500 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-500/20 transition-all cursor-pointer flex items-center gap-1"
            >
              <span>🖨️</span> PDF İndir
            </button>
          )}
          {selectedDrugIds.length > 0 && (
            <button
              onClick={() => {
                setSelectedDrugIds([]);
                setInteractions([]);
                setCoverageExplanation(null);
                setShowCoveragePanel(false);
              }}
              className="text-xs font-bold text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-500/10 px-3 py-1.5 rounded-lg border border-transparent hover:border-red-500/20 transition-all cursor-pointer"
            >
              Kutuyu Sıfırla
            </button>
          )}
        </div>
      </div>

      {/* Results State Machine */}
      <div className="flex-1 flex flex-col gap-4">
        {selectedDrugIds.length < 2 ? (
          // Welcome / Instruction State
          <div className="backdrop-blur-md bg-white/40 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 rounded-3xl p-8 text-center flex flex-col items-center justify-center py-20 shadow-lg min-h-[350px]">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-3xl mb-4 animate-pulse-slow">
              🩺
            </div>
            <h4 className="font-bold text-slate-800 dark:text-white text-base">Tarama Başlatmak İçin İlaç Ekleyin</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mt-2 leading-relaxed">
              İlaç-ilaç etkileşim denetimini başlatmak için sol panelden en az iki ilaç aratıp Sanal İlaç Kutusu&apos;na eklemeniz gerekmektedir.
            </p>
            <div className="mt-6 flex flex-wrap gap-2 justify-center">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 px-2.5 py-1 rounded-md">
                Levenshtein Fuzzy Match
              </span>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 px-2.5 py-1 rounded-md">
                Deterministik DB Sorgusu
              </span>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 px-2.5 py-1 rounded-md">
                Gemini Canlı AI
              </span>
            </div>
          </div>
        ) : isChecking ? (
          // Loading Shimmer State
          <div className="flex flex-col gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white/5 border border-white/5 rounded-2xl p-5 animate-pulse flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-slate-800 rounded-full"></div>
                  <div className="w-24 h-4 bg-slate-800 rounded"></div>
                </div>
                <div className="w-3/4 h-6 bg-slate-800 rounded mt-1"></div>
                <div className="w-full h-4 bg-slate-800 rounded mt-2"></div>
                <div className="w-5/6 h-4 bg-slate-800 rounded"></div>
              </div>
            ))}
          </div>
        ) : checkingError ? (
          // API Error State
          <div className="backdrop-blur-md bg-red-500/5 border border-red-500/20 rounded-3xl p-6 text-center">
            <span className="text-3xl mb-3 inline-block">⚠️</span>
            <h4 className="font-bold text-red-200 text-sm">Klinik Servis Bağlantı Hatası</h4>
            <p className="text-xs text-red-400/80 mt-1 max-w-sm mx-auto leading-relaxed">
              {checkingError}
            </p>
            <button
              onClick={() => setSelectedDrugIds([...selectedDrugIds])}
              className="mt-4 px-4 py-2 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              Yeniden Dene
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <LiveReportsPanel
              selectedDrugs={selectedDrugs}
              interactions={interactions}
              explanations={explanations}
              accumulationWarnings={accumulationWarnings}
              contraindications={contraindications}
              polypharmacyReport={polypharmacyReport}
              foodInteractions={foodInteractions}
              loadingExplanations={loadingExplanations}
              onExplainRequested={onExplainRequested}
              handleRequestCoverageExplanation={handleRequestCoverageExplanation}
              isCoverageLoading={isCoverageLoading}
              showCoveragePanel={showCoveragePanel}
              setShowCoveragePanel={setShowCoveragePanel}
              coverageExplanation={coverageExplanation}
            />
          </div>
        )}
      </div>
    </section>
  );
}
