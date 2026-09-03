"use client";

import { Dispatch, SetStateAction } from "react";
import { Drug, CheckResult, AccumulationWarning } from "@/lib/interactions";
import DrugSelector from "@/components/DrugSelector";
import VirtualPillbox from "@/components/VirtualPillbox";
import PatientProfileBar, { PatientContext } from "@/components/PatientProfileBar";

interface KontrolSearchPanelProps {
  drugs: Drug[];
  selectedDrugIds: string[];
  setSelectedDrugIds: Dispatch<SetStateAction<string[]>>;
  selectedDrugs: Drug[];
  isOffline: boolean;
  patientContext: PatientContext;
  setPatientContext: Dispatch<SetStateAction<PatientContext>>;
  interactions: CheckResult[];
  accumulationWarnings: AccumulationWarning[];
}

export default function KontrolSearchPanel({
  drugs,
  selectedDrugIds,
  setSelectedDrugIds,
  selectedDrugs,
  isOffline,
  patientContext,
  setPatientContext,
  interactions,
  accumulationWarnings,
}: KontrolSearchPanelProps) {
  return (
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
  );
}
