"use client";

import { useState } from "react";

export interface PatientContext {
  isPregnant: boolean;
  isBreastfeeding: boolean;
  ageGroup: "adult" | "elderly";
  renalRisk: boolean;
  hepaticRisk: boolean;
  diseases: string[];
  [key: string]: unknown;
}

interface PatientProfileBarProps {
  context: PatientContext;
  onChange: (updated: PatientContext) => void;
}

const ICD_DISEASES = [
  { code: "K25", name: "Peptik Ülser" },
  { code: "I10", name: "Hipertansiyon" },
  { code: "N18", name: "Kronik Böbrek Yetmezliği" },
  { code: "E11", name: "Tip 2 Diyabet" },
  { code: "I50", name: "Kalp Yetmezliği" },
];

function PatientProfileHeader({
  isOpen,
  setIsOpen,
  hasActiveFilters,
}: {
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
  hasActiveFilters: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 text-left focus:outline-none group cursor-pointer"
      >
        <span className="text-xl" role="img" aria-label="Risk profil ikonu">
          👤
        </span>
        <div>
          <h4 className="text-sm font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
            Hasta Risk Faktörleri Modülü
            {hasActiveFilters && (
              <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full font-bold">
                Profil Aktif
              </span>
            )}
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            Gizlilik Odaklı (Local-First): Verileriniz veritabanına asla kaydedilmez.
          </p>
        </div>
      </button>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-8 h-8 rounded-lg bg-slate-200/50 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-600 dark:text-slate-400 flex items-center justify-center text-xs font-bold hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors cursor-pointer"
      >
        {isOpen ? "✕" : "⚙️"}
      </button>
    </div>
  );
}

type RiskField = keyof Omit<PatientContext, "diseases" | "ageGroup">;

function RiskToggle({
  context,
  field,
  toggleField,
  emoji,
  title,
  description,
  activeColorClass,
}: {
  context: PatientContext;
  field: RiskField;
  toggleField: (field: RiskField) => void;
  emoji: string;
  title: string;
  description: string;
  activeColorClass: string;
}) {
  return (
    <button
      type="button"
      onClick={() => toggleField(field)}
      className={`p-3 rounded-2xl border text-xs font-bold text-left flex items-center gap-2.5 transition-all cursor-pointer ${
        context[field]
          ? activeColorClass
          : "bg-slate-100/50 dark:bg-white/5 border-slate-200/60 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-white/15"
      }`}
    >
      <span className="text-base">{emoji}</span>
      <div>
        <div className="font-extrabold">{title}</div>
        <div className="text-[9px] font-normal text-slate-400 mt-0.5">{description}</div>
      </div>
    </button>
  );
}

function AgeGroupSelector({
  context,
  setAgeGroup,
}: {
  context: PatientContext;
  setAgeGroup: (ageGroup: "adult" | "elderly") => void;
}) {
  return (
    <div className="p-3 rounded-2xl border bg-slate-100/50 dark:bg-white/5 border-slate-200/60 dark:border-white/5 text-xs text-left flex flex-col justify-between gap-1.5">
      <span className="font-extrabold text-slate-600 dark:text-slate-400 flex items-center gap-1">
        👴 Yaş Grubu
      </span>
      <div className="grid grid-cols-2 gap-1.5 mt-1">
        <button
          type="button"
          onClick={() => setAgeGroup("adult")}
          className={`py-1 rounded-lg text-[10px] font-bold text-center transition-all cursor-pointer ${
            context.ageGroup === "adult"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/15"
              : "bg-white/5 text-slate-400 border border-transparent hover:border-white/5"
          }`}
        >
          Yetişkin
        </button>
        <button
          type="button"
          onClick={() => setAgeGroup("elderly")}
          className={`py-1 rounded-lg text-[10px] font-bold text-center transition-all cursor-pointer ${
            context.ageGroup === "elderly"
              ? "bg-amber-600 text-white shadow-md shadow-amber-600/15"
              : "bg-white/5 text-slate-400 border border-transparent hover:border-white/5"
          }`}
        >
          65 Yaş Üstü
        </button>
      </div>
    </div>
  );
}

function PhysiologicalToggles({
  context,
  toggleField,
  setAgeGroup,
}: {
  context: PatientContext;
  toggleField: (field: keyof Omit<PatientContext, "diseases" | "ageGroup">) => void;
  setAgeGroup: (ageGroup: "adult" | "elderly") => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
      {/* Pregnancy */}
      <button
        type="button"
        onClick={() => toggleField("isPregnant")}
        className={`p-3 rounded-2xl border text-xs font-bold text-left flex items-center gap-2.5 transition-all cursor-pointer ${
          context.isPregnant
            ? "bg-purple-500/10 border-purple-500/30 text-purple-700 dark:text-purple-300"
            : "bg-slate-100/50 dark:bg-white/5 border-slate-200/60 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-white/15"
        }`}
      >
        <span className="text-base">🤰</span>
        <div>
          <div className="font-extrabold">Gebelik Durumu</div>
          <div className="text-[9px] font-normal text-slate-400 mt-0.5">Kategori uyarılarını tetikler</div>
        </div>
      </button>

      {/* Breastfeeding */}
      <button
        type="button"
        onClick={() => toggleField("isBreastfeeding")}
        className={`p-3 rounded-2xl border text-xs font-bold text-left flex items-center gap-2.5 transition-all cursor-pointer ${
          context.isBreastfeeding
            ? "bg-pink-500/10 border-pink-500/30 text-pink-700 dark:text-pink-300"
            : "bg-slate-100/50 dark:bg-white/5 border-slate-200/60 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-white/15"
        }`}
      >
        <span className="text-base">🤱</span>
        <div>
          <div className="font-extrabold">Emzirme Durumu</div>
          <div className="text-[9px] font-normal text-slate-400 mt-0.5">Süte geçme riskleri</div>
        </div>
      </button>

      {/* Age Group */}
      <div className="p-3 rounded-2xl border bg-slate-100/50 dark:bg-white/5 border-slate-200/60 dark:border-white/5 text-xs text-left flex flex-col justify-between gap-1.5">
        <span className="font-extrabold text-slate-600 dark:text-slate-400 flex items-center gap-1">
          👴 Yaş Grubu
        </span>
        <div className="grid grid-cols-2 gap-1.5 mt-1">
          <button
            type="button"
            onClick={() => setAgeGroup("adult")}
            className={`py-1 rounded-lg text-[10px] font-bold text-center transition-all cursor-pointer ${
              context.ageGroup === "adult"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/15"
                : "bg-white/5 text-slate-400 border border-transparent hover:border-white/5"
            }`}
          >
            Yetişkin
          </button>
          <button
            type="button"
            onClick={() => setAgeGroup("elderly")}
            className={`py-1 rounded-lg text-[10px] font-bold text-center transition-all cursor-pointer ${
              context.ageGroup === "elderly"
                ? "bg-amber-600 text-white shadow-md shadow-amber-600/15"
                : "bg-white/5 text-slate-400 border border-transparent hover:border-white/5"
            }`}
          >
            65 Yaş Üstü
          </button>
        </div>
      </div>

      {/* Renal Risk */}
      <button
        type="button"
        onClick={() => toggleField("renalRisk")}
        className={`p-3 rounded-2xl border text-xs font-bold text-left flex items-center gap-2.5 transition-all cursor-pointer ${
          context.renalRisk
            ? "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300"
            : "bg-slate-100/50 dark:bg-white/5 border-slate-200/60 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-white/15"
        }`}
      >
        <span className="text-base">💧</span>
        <div>
          <div className="font-extrabold">Böbrek Yetmezliği</div>
          <div className="text-[9px] font-normal text-slate-400 mt-0.5">Renal eliminasyon uyarısı</div>
        </div>
      </button>

      {/* Hepatic Risk */}
      <button
        type="button"
        onClick={() => toggleField("hepaticRisk")}
        className={`p-3 rounded-2xl border text-xs font-bold text-left flex items-center gap-2.5 transition-all cursor-pointer ${
          context.hepaticRisk
            ? "bg-orange-500/10 border-orange-500/30 text-orange-700 dark:text-orange-300"
            : "bg-slate-100/50 dark:bg-white/5 border-slate-200/60 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-white/15"
        }`}
      >
        <span className="text-base">🧪</span>
        <div>
          <div className="font-extrabold">Karaciğer Yetmezliği</div>
          <div className="text-[9px] font-normal text-slate-400 mt-0.5">Hepatotoksisite riski</div>
        </div>
      </button>
    </div>
  );
}

function DiseaseSelector({
  context,
  toggleDisease,
}: {
  context: PatientContext;
  toggleDisease: (code: string) => void;
}) {
  return (
    <div className="border-t border-slate-200/60 dark:border-white/10 pt-4">
      <span className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5">
        🏥 Hastalık Bilgisi (ICD-10 Tanı Kodları)
      </span>
      <div className="flex flex-wrap gap-2">
        {ICD_DISEASES.map((dis) => {
          const isChecked = context.diseases.includes(dis.code);
          return (
            <button
              key={dis.code}
              type="button"
              onClick={() => toggleDisease(dis.code)}
              className={`px-3 py-2 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                isChecked
                  ? "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300 shadow-md shadow-red-500/5"
                  : "bg-slate-100/50 dark:bg-white/5 border-slate-200/60 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-white/15"
              }`}
            >
              <span className="font-mono text-[9px] opacity-75">{dis.code}</span>
              <span>{dis.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function PatientProfileBar({ context, onChange }: PatientProfileBarProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleField = (field: keyof Omit<PatientContext, "diseases" | "ageGroup">) => {
    onChange({
      ...context,
      [field]: !context[field],
    });
  };

  const setAgeGroup = (ageGroup: "adult" | "elderly") => {
    onChange({
      ...context,
      ageGroup,
    });
  };

  const toggleDisease = (code: string) => {
    const isSelected = context.diseases.includes(code);
    const updatedDiseases = isSelected
      ? context.diseases.filter((d) => d !== code)
      : [...context.diseases, code];
    onChange({
      ...context,
      diseases: updatedDiseases,
    });
  };

  const hasActiveFilters =
    context.isPregnant ||
    context.isBreastfeeding ||
    context.ageGroup === "elderly" ||
    context.renalRisk ||
    context.hepaticRisk ||
    context.diseases.length > 0;

  return (
    <div className="backdrop-blur-xl bg-white/40 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 rounded-3xl p-5 shadow-2xl relative overflow-hidden transition-all duration-300">
      {/* Decorative background glow */}
      <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 p-24 bg-gradient-to-br from-teal-500/5 to-transparent rounded-full -ml-10 -mt-10" />
      </div>

      <div className="relative z-10 flex flex-col gap-4">
        <PatientProfileHeader
          isOpen={isOpen}
          setIsOpen={setIsOpen}
          hasActiveFilters={hasActiveFilters}
        />

        {isOpen && (
          <div className="mt-2 border-t border-slate-200/60 dark:border-white/10 pt-4 flex flex-col gap-5 animate-slide-down">
            {/* Row 1: Physiological toggles */}
            <PhysiologicalToggles
              context={context}
              toggleField={toggleField}
              setAgeGroup={setAgeGroup}
            />

            {/* Row 2: Diseases Checkboxes */}
            <DiseaseSelector
              context={context}
              toggleDisease={toggleDisease}
            />
          </div>
        )}
      </div>
    </div>
  );
}
