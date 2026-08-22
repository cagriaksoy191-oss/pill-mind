"use client";

import { useState } from "react";
import { useInteractions } from "@/hooks/useInteractions";
import { getAllDrugs, Drug } from "@/lib/interactions";
import Disclaimer from "@/components/Disclaimer";
import StatusHeader from "@/components/StatusHeader";
import MedicalReport from "@/components/MedicalReport";
import { PatientContext } from "@/components/PatientProfileBar";
import KontrolSearchPanel from "@/components/KontrolSearchPanel";
import KontrolScanReports from "@/components/KontrolScanReports";

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
        <KontrolSearchPanel
          drugs={drugs}
          selectedDrugIds={selectedDrugIds}
          setSelectedDrugIds={setSelectedDrugIds}
          selectedDrugs={selectedDrugs}
          isOffline={isOffline}
          patientContext={patientContext}
          setPatientContext={setPatientContext}
          interactions={interactions}
          accumulationWarnings={accumulationWarnings}
        />

        {/* Right Side: Raporlar ve Klinik Analiz Sonuçları */}
        <KontrolScanReports
          selectedDrugIds={selectedDrugIds}
          setSelectedDrugIds={setSelectedDrugIds}
          selectedDrugs={selectedDrugs}
          interactions={interactions}
          setInteractions={setInteractions}
          isChecking={isChecking}
          checkingError={checkingError}
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
          setCoverageExplanation={setCoverageExplanation}
        />
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
