"use client";

import { CheckResult } from "./types";

interface ShareClinicalInteractionsProps {
  interactions?: CheckResult[];
}

export default function ShareClinicalInteractions({ interactions }: ShareClinicalInteractionsProps) {
  return (
    <div>
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
        Klinik Etkileşim Bulguları ({interactions?.length || 0})
      </h3>

      {interactions && interactions.length === 0 ? (
        <div className="p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 text-emerald-300 flex items-start gap-3">
          <span className="text-xl">💚</span>
          <div>
            <h5 className="font-bold text-white text-sm">Bilinen Etkileşim Saptanmadı</h5>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Kutuda bulunan ilaçlar arasında veri tabanımızda kayıtlı herhangi bir etkileşim bulunmamaktadır.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {interactions?.map((res, idx) => {
            const isHigh = res.interaction.severity === "high";
            const isMedium = res.interaction.severity === "medium";
            const badgeColor = isHigh
              ? "bg-red-500/20 text-red-300 border border-red-500/30"
              : isMedium
              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
              : "bg-green-500/20 text-green-300 border border-green-500/30";

            return (
              <div key={idx} className="p-5 rounded-2xl bg-white/5 border border-white/5 flex flex-col gap-3">
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <h4 className="font-bold text-white text-sm">
                    {res.drug1Name} + {res.drug2Name}
                  </h4>
                  <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${badgeColor}`}>
                    {res.interaction.severity.toUpperCase()} Risk
                  </span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed font-semibold">
                  {res.interaction.summary}
                </p>
                {res.interaction.clinicalDetail && (
                  <p className="text-[11px] text-slate-400 bg-black/25 p-3 rounded-lg border border-white/5 mt-1">
                    <strong>Klinik Detay:</strong> {res.interaction.clinicalDetail}
                  </p>
                )}
                <p className="text-[9px] text-slate-500 flex items-center gap-1 mt-1 font-semibold">
                  📖 Kaynak: {res.interaction.sourceLabel || res.interaction.source}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
