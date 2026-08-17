import { FoodInteractionResult } from "@/lib/interactions";

interface LiveFoodInteractionsProps {
  foodInteractions: FoodInteractionResult[];
}

export default function LiveFoodInteractions({ foodInteractions }: LiveFoodInteractionsProps) {
  if (foodInteractions.length === 0) return null;

  return (
    <div className="backdrop-blur-xl bg-slate-900/40 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 rounded-3xl p-6 shadow-2xl animate-slide-down flex flex-col gap-4 mt-2">
      <h4 className="text-sm font-extrabold text-slate-950 dark:text-white flex items-center gap-2">
        🥗 Gıda ve Besin Etkileşim Uyarıları
        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
          {foodInteractions.length} Uyarı
        </span>
      </h4>

      <div className="flex flex-col gap-3">
        {foodInteractions.map((fInt, idx) => {
          const isHigh = fInt.severity === "high";
          const themeClass = isHigh
            ? "bg-red-500/5 dark:bg-red-950/15 border-red-500/20 text-red-800 dark:text-red-200"
            : "bg-amber-500/5 dark:bg-amber-950/15 border-amber-500/20 text-amber-800 dark:text-amber-200";
          return (
            <div key={idx} className={`p-4 rounded-2xl border ${themeClass} flex gap-3 items-start`}>
              <span className="text-lg shrink-0 mt-0.5">{isHigh ? "🍊" : "🥦"}</span>
              <div>
                <div className="font-extrabold text-xs flex items-center gap-2">
                  <span className="text-slate-950 dark:text-white">{fInt.drugName}</span>
                  <span className="opacity-65">&amp;</span>
                  <span className="text-indigo-600 dark:text-indigo-400">{fInt.substance}</span>
                </div>
                <p className="text-xs mt-1.5 leading-relaxed font-semibold">
                  {fInt.effect}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
