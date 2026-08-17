"use client";

import { useState } from "react";
import { useInteractions } from "@/hooks/useInteractions";
import { getAllDrugs, Drug } from "@/lib/interactions";
import DrugSelector from "@/components/DrugSelector";
import VirtualPillbox from "@/components/VirtualPillbox";
import Disclaimer from "@/components/Disclaimer";
import StatusHeader from "@/components/StatusHeader";
import MedicalReport from "@/components/MedicalReport";
import PatientProfileBar, { PatientContext } from "@/components/PatientProfileBar";
import LiveReportsPanel from "@/components/LiveReports/LiveReportsPanel";

export default function KontrolPage() {
  const [drugs] = useState<Drug[]>(() => getAllDrugs());
  const [selectedDrugIds, setSelectedDrugIds] = useState<string[]>([]);
  const [patientContext, setPatientContext] = useState<PatientContext>({
    isPregnant: false,
    isBreastfeeding: false,
    ageGroup: "adult",
    renalRisk: false,
    hepaticRisk: false,
    diseases: []
  });

  const {
    interactions,
    setInteractions,
    accumulationWarnings,
    foodInteractions,
    contraindications,
    polypharmacyReport,
    isChecking,
    checkingError,
    explanations,
    loadingExplanations,
    coverageExplanation,
    setCoverageExplanation,
    isCoverageLoading,
    showCoveragePanel,
    setShowCoveragePanel,
    isOffline,
    handleExplainRequested,
    handleRequestCoverageExplanation,
  } = useInteractions(selectedDrugIds, patientContext);

  // Convert selected drug IDs to complete Drug object array
  const selectedDrugs = drugs.filter((d) => selectedDrugIds.includes(d.id));





  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 font-sans selection:bg-indigo-500/30 selection:text-indigo-200 relative overflow-hidden flex flex-col justify-between">
      {/* Background Ambient Glows */}
      <div className="absolute top-[10%] left-[10%] w-[30rem] h-[30rem] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none animate-pulse-slow"></div>
      <div className="absolute bottom-[20%] right-[10%] w-[35rem] h-[35rem] rounded-full bg-purple-500/10 blur-[130px] pointer-events-none animate-pulse-slow"></div>
      <div className="absolute top-[40%] right-[20%] w-[25rem] h-[25rem] rounded-full bg-emerald-500/5 blur-[100px] pointer-events-none"></div>

      <StatusHeader
        selectedDrugIds={selectedDrugIds}
        isChecking={isChecking}
        interactions={interactions}
        onLoadPillbox={setSelectedDrugIds}
        isOffline={isOffline}
      />

      <MedicalReport
        selectedDrugs={selectedDrugs}
        accumulationWarnings={accumulationWarnings}
        contraindications={contraindications}
        polypharmacyReport={polypharmacyReport}
        foodInteractions={foodInteractions}
        interactions={interactions}
        explanations={explanations}
      />

      {/* Main Workspace */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 pt-10 pb-16 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 print:hidden">

        {/* Left Side: Interaksiyon Arama ve Kutu Yönetimi */}
        <section className="lg:col-span-7 flex flex-col gap-6" aria-label="İlaç Seçim ve Ekleme Paneli">
          <div className="backdrop-blur-xl bg-white/40 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-20 group">
            <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
              <div className="absolute top-0 right-0 p-32 bg-gradient-to-bl from-indigo-500/10 to-transparent rounded-full -mr-20 -mt-20" />
            </div>

            <div className="relative z-10">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-950 dark:text-white tracking-tight leading-tight">
                İlaç Etkileşim <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-cyan-500 dark:from-indigo-400 dark:to-cyan-400">
                  Canlı Tarama Paneli
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed max-w-lg">
                Fuzzy Search teknolojisi ile Türkçe karakter veya yazım hatası fark etmeksizin ilaçlarınızı arayın, sanal kutunuza ekleyerek etkileşimleri anında denetleyin.
              </p>

              <div className="mt-8">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2.5">
                  🔍 İlaç Arama ve Giriş Alanı
                </label>
                <DrugSelector
                  drugs={drugs}
                  selected={selectedDrugIds}
                  onSelect={setSelectedDrugIds}
                />
                {isOffline && (
                  <p className="mt-3 text-xs text-amber-600 dark:text-amber-400 font-semibold bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 leading-relaxed animate-slide-down">
                    ⚠️ Yerel koruma aktif. Canlı AI açıklaması çevrimdışı kullanılamaz; temel tarama yapılır. Veri snapshot tarihi: 2026.06.26
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Patient Risk Profile Bar */}
          <PatientProfileBar context={patientContext} onChange={setPatientContext} />

          {/* 3D Virtual Pillbox Container */}
          <div className="w-full relative z-10">
            <VirtualPillbox
              selectedDrugs={selectedDrugs}
              onRemove={(id) => setSelectedDrugIds((prev) => prev.filter((x) => x !== id))}
              interactions={interactions}
              accumulationWarnings={accumulationWarnings}
            />
          </div>
        </section>

        {/* Right Side: Raporlar ve Klinik Analiz Sonuçları */}
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
                  onExplainRequested={handleExplainRequested}
                  handleRequestCoverageExplanation={handleRequestCoverageExplanation}
                  isCoverageLoading={isCoverageLoading}
                  showCoveragePanel={showCoveragePanel}
                  setShowCoveragePanel={setShowCoveragePanel}
                  coverageExplanation={coverageExplanation}
                />
              </div>

          </div>
        </section>
      </main>

      {/* Core Clinical Disclaimer Footer */}
      <footer className="relative z-10 w-full">
        <Disclaimer />
      </footer>

      {/* Global CSS Inject for Animations & Smooth Custom Transitions */}
      <style jsx global>{`
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.8; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.03); }
        }
        .animate-pulse-slow {
          animation: pulse-slow 8s infinite ease-in-out;
        }
        @keyframes slide-down {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-down {
          animation: slide-down 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          header, footer, nav, button, input, .print\:hidden, [role="search"], .bg-slate-950, .pointer-events-none {
            display: none !important;
          }
          section:first-of-type {
            display: none !important;
          }
          section:last-of-type {
            width: 100% !important;
            grid-column: span 12 / span 12 !important;
            display: block !important;
          }
          .min-h-screen {
            background: white !important;
            color: black !important;
            min-height: auto !important;
            padding: 0 !important;
          }
          .backdrop-blur-xl, .backdrop-blur-md {
            background: white !important;
            border: 1px solid #e2e8f0 !important;
            color: black !important;
            box-shadow: none !important;
            border-radius: 12px !important;
            margin-bottom: 16px !important;
            page-break-inside: avoid;
          }
          h3, h4, h5, p, span, a {
            color: black !important;
          }
          .print\:block {
            display: block !important;
          }
          a {
            text-decoration: underline !important;
            color: #1e3a8a !important;
          }
        }
      `}</style>
    </div>
  );
}
