"use client";

import { FoodInteraction } from "./types";

interface ShareFoodInteractionsProps {
  interactions?: FoodInteraction[];
}

export default function ShareFoodInteractions({ interactions }: ShareFoodInteractionsProps) {
  if (!interactions || interactions.length === 0) return null;

  return (
    <div className="mb-6 p-5 rounded-2xl bg-slate-900/50 border border-white/10">
      <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-1.5">
        🥗 Gıda &amp; Besin Etkileşimleri
      </h4>
      <div className="flex flex-col gap-3">
        {interactions.map((f, idx) => (
          <div key={idx} className="p-3 rounded-xl bg-white/5 border border-white/5 text-xs">
            <p className="font-bold text-white">
              {f.drugName} &amp; <span className={f.kind === "usage" ? "text-sky-300" : "text-amber-300"}>{f.substance}</span>
              {f.kind === "usage" && <span className="ml-2 text-[10px] text-sky-300">Kullanım bilgisi</span>}
            </p>
            {f.sourceUrl?.startsWith("https://dailymed.nlm.nih.gov/") && <a href={f.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-block mt-1 text-[10px] text-slate-400 underline">NIH DailyMed · İlaç etiketi</a>}
            <p className="text-slate-300 mt-1 text-[11px] leading-relaxed">
              {f.effect}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
