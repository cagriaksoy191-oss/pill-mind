"use client";

import { useState } from "react";
import { getSeverityLabel, getDrugClinicalMetadata } from "@/lib/interactions";
import ExplanationDrawer from "./ExplanationDrawer";
import { getGlassColors } from "@/lib/theme";

interface ResultCardProps {
  drug1Id?: string;
  drug2Id?: string;
  drug1Name: string;
  drug2Name: string;
  severity: string;
  summary: string;
  interactionId: string;
  sourceLabel?: string;
  verificationStatus?: string;
  source?: string;
  evidenceLevel?: string;
  clinicalDetail?: string;
  evidences?: // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any[];
  mechanisms?: // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any[];
  explanationData?: {
    explanation?: string;
    source?: string;
    generatedAt?: string;
    reason?: string;
    error?: string;
  };
  isExplanationLoading?: boolean;
  onExplainRequested: (id: string, force: boolean) => void;
}

export default function ResultCard({
  interactionId,
  drug1Id,
  drug2Id,
  drug1Name,
  drug2Name,
  severity,
  summary,
  sourceLabel,
  verificationStatus,
  source,
  evidenceLevel,
  clinicalDetail,
  evidences,
  mechanisms,
  explanationData,
  isExplanationLoading,
  onExplainRequested,
}: ResultCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isClinicalOpen, setIsClinicalOpen] = useState(false);

  const rawLabel = getSeverityLabel(severity);
  const label =
    rawLabel === "Potansiyel Önemli Etkileşim"
      ? "Dikkat gerektiren kayıtlı etkileşim bulundu (Potansiyel Önemli Etkileşim)"
      : rawLabel;

  const currentTheme = getGlassColors(severity);

  return (
    <div
      className={`rounded-2xl border backdrop-blur-xl ${currentTheme.cardBg} overflow-hidden shadow-lg transition-all duration-300 hover:scale-[1.015] hover:shadow-2xl`}
      style={{
        boxShadow: `0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)`,
      }}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2.5 mb-2">
              <span className="text-base" role="img" aria-label="Etkileşim Seviye İkonu">
                {currentTheme.icon}
              </span>
              <span
                className={`text-[11px] font-bold tracking-wide uppercase px-2.5 py-0.5 rounded-full ${currentTheme.badge}`}
              >
                {label}
              </span>
            </div>

            <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-lg md:text-xl mt-3 tracking-tight flex items-center gap-2">
              <span className="text-indigo-500 dark:text-indigo-400">{drug1Name}</span>
              <span className="text-slate-400 dark:text-slate-600 font-light">&amp;</span>
              <span className="text-indigo-500 dark:text-indigo-400">{drug2Name}</span>
            </h3>

            <p className={`text-sm mt-2 leading-relaxed font-medium ${currentTheme.text}`}>
              {summary}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          <button
            onClick={() => {
              const nextIsOpen = !isOpen;
              setIsOpen(nextIsOpen);
              if (nextIsOpen && !isExplanationLoading) {
                onExplainRequested(interactionId, true);
              }
            }}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 transition-colors duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/40 rounded px-2 py-1 bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/10"
            aria-expanded={isOpen}
            aria-controls={`explain-drawer-${interactionId}`}
          >
            <span>{isOpen ? "Açıklama Detayını Gizle" : "Klinik Canlı AI Açıklamasını Gör"}</span>
            <span className="text-xs transition-transform duration-200" style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0)" }}>
              ▼
            </span>
          </button>

          <button
            onClick={() => setIsClinicalOpen(!isClinicalOpen)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-200 transition-colors duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/40 rounded px-2 py-1 bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/10"
            aria-expanded={isClinicalOpen}
          >
            <span>{isClinicalOpen ? "Klinik Modu Kapat" : "🔬 Klinik Detay (Hekim/Eczacı Modu)"}</span>
            <span className="text-xs transition-transform duration-200" style={{ transform: isClinicalOpen ? "rotate(180deg)" : "rotate(0)" }}>
              ▼
            </span>
          </button>
        </div>

        {/* Collapsible Clinical Detail Panel */}
        {isClinicalOpen && (
          <div className="mt-4 p-4 rounded-xl bg-slate-100/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/80 text-xs text-slate-700 dark:text-slate-300 flex flex-col gap-3 animate-slide-down">
            <h4 className="font-extrabold uppercase tracking-wider text-[10px] text-emerald-600 dark:text-emerald-400">
              🔬 Sağlık Profesyonelleri İçin Klinik Veriler
            </h4>
            
            {clinicalDetail && (
              <div>
                <span className="font-bold text-slate-900 dark:text-slate-100">Klinik Detay:</span>
                <p className="mt-0.5 leading-relaxed">{clinicalDetail}</p>
              </div>
            )}

            {mechanisms && mechanisms.length > 0 && (
              <div>
                <span className="font-bold text-slate-900 dark:text-slate-100">Farmakolojik Mekanizma Detayları:</span>
                <ul className="list-disc pl-4 mt-0.5 flex flex-col gap-1.5">
                  {// eslint-disable-next-line @typescript-eslint/no-explicit-any
                  mechanisms.map((m: any, index: number) => (
                    <li key={index}>
                      <span className="font-semibold">{m.type}:</span> {m.mechanism} 
                      {m.pharmacokinetic && <span className="ml-1 text-[9px] bg-indigo-500/10 text-indigo-400 px-1 py-0.2 rounded">Farmakokinetik</span>}
                      {m.pharmacodynamic && <span className="ml-1 text-[9px] bg-purple-500/10 text-purple-400 px-1 py-0.2 rounded">Farmakodinamik</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-200 dark:border-slate-850 pt-3">
              <div>
                <span className="font-bold text-slate-900 dark:text-slate-100">Kanıt Düzeyi:</span>
                <span className="ml-1.5 px-2 py-0.5 rounded bg-slate-200 dark:bg-white/5 border border-slate-300 dark:border-white/10 font-mono text-[10px]">
                  {evidenceLevel || "Belirtilmemiş"}
                </span>
              </div>
              
              <div>
                <span className="font-bold text-slate-900 dark:text-slate-100">Kayıt Onay Durumu:</span>
                <span className="ml-1.5 px-2 py-0.5 rounded bg-slate-200 dark:bg-white/5 border border-slate-300 dark:border-white/10 font-mono text-[10px] text-emerald-600 dark:text-emerald-400">
                  {verificationStatus || "VERIFIED"}
                </span>
              </div>
            </div>

            {/* Kademeli Gebelik ve Organ Detayları (Hekim Modu v3) */}
            <div className="border-t border-slate-200 dark:border-slate-850 pt-3 flex flex-col gap-2">
              <span className="font-bold text-slate-900 dark:text-slate-100">🤰 Gebelik ve Organ Eliminasyon Uyarıları:</span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
                {[
                  { id: drug1Id, name: drug1Name },
                  { id: drug2Id, name: drug2Name }
                ].map((dInfo) => {
                  if (!dInfo.id) return null;
                  const meta = getDrugClinicalMetadata(dInfo.id);
                  return (
                    <div key={dInfo.id} className="p-2.5 rounded bg-slate-200/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 flex flex-col gap-1">
                      <span className="font-bold text-indigo-600 dark:text-indigo-450 text-[11px]">{dInfo.name}</span>
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Gebelik Kategorisi:</span>
                        <span className="px-1.5 py-0.2 text-[9px] font-extrabold rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">{meta.pregnancyCategory}</span>
                      </div>
                      <p className="text-[10px] leading-relaxed text-slate-500 dark:text-slate-400"><span className="font-semibold text-slate-700 dark:text-slate-300">Gebelik:</span> {meta.pregnancyNote}</p>
                      <p className="text-[10px] leading-relaxed text-slate-500 dark:text-slate-400"><span className="font-semibold text-slate-700 dark:text-slate-300">Böbrek:</span> {meta.renalNote}</p>
                      <p className="text-[10px] leading-relaxed text-slate-500 dark:text-slate-400"><span className="font-semibold text-slate-700 dark:text-slate-300">Karaciğer:</span> {meta.hepaticNote}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {evidences && evidences.length > 0 ? (
              <div className="border-t border-slate-200 dark:border-slate-850 pt-3">
                <span className="font-bold text-slate-900 dark:text-slate-100">Bilimsel Kanıt ve Referans Kaynakları:</span>
                <div className="mt-1.5 flex flex-col gap-2">
                  {// eslint-disable-next-line @typescript-eslint/no-explicit-any
                  evidences.map((e: any, index: number) => (
                    <div key={index} className="p-2 rounded bg-slate-200/40 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-900 flex flex-col gap-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{e.source.title}</span>
                        {e.source.url && (
                          <a
                            href={e.source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-indigo-500 hover:underline flex items-center gap-0.5 shrink-0"
                          >
                            Kaynağa Git ↗
                          </a>
                        )}
                      </div>
                      <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400 italic">
                        &ldquo;{e.summary}&rdquo;
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              source && (
                <div className="border-t border-slate-200 dark:border-slate-850 pt-3">
                  <span className="font-bold text-slate-900 dark:text-slate-100">Bilimsel Kaynak:</span>
                  <p className="mt-0.5">{sourceLabel || source}</p>
                </div>
              )
            )}
          </div>
        )}
      </div>

      <ExplanationDrawer
        isOpen={isOpen}
        interactionId={interactionId}
        isExplanationLoading={isExplanationLoading}
        explanationData={explanationData}
        onExplainRequested={onExplainRequested}
        verificationStatus={verificationStatus}
        sourceLabel={sourceLabel}
        source={source}
        evidenceLevel={evidenceLevel}
        clinicalDetail={clinicalDetail}
      />
    </div>
  );
}
