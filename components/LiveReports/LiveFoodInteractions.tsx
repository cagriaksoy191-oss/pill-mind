import { FoodInteractionResult } from "@/lib/interactions";
import FoodSubstanceIcon from "@/components/FoodSubstanceIcon";
import {groupFoodInteractions} from "@/lib/utils/groupFoodInteractions";

interface LiveFoodInteractionsProps {
  foodInteractions: FoodInteractionResult[];
}

export default function LiveFoodInteractions({ foodInteractions }: LiveFoodInteractionsProps) {
  if (foodInteractions.length === 0) return null;
  const groups=groupFoodInteractions(foodInteractions);
  const warningCount=groups.filter(group=>!group.isUsage).length;
  const informationCount=groups.filter(group=>group.isUsage).length;

  return (
    <div className="backdrop-blur-xl bg-slate-900/40 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 rounded-3xl p-6 shadow-2xl animate-slide-down flex flex-col gap-4 mt-2">
      <h4 className="text-sm font-extrabold text-slate-950 dark:text-white flex items-center gap-2">
        🥗 Gıda ve Besin Bilgileri
        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
          {warningCount} Uyarı{informationCount>0 ? ` · ${informationCount} Bilgi` : ""}
        </span>
      </h4>

      <div className="flex flex-col gap-3">
        {groups.map((group) => {
          const themeClass = group.isUsage
            ? "bg-sky-500/5 dark:bg-sky-950/15 border-sky-500/20 text-sky-800 dark:text-sky-200"
            : group.isHigh
            ? "bg-red-500/5 dark:bg-red-950/15 border-red-500/20 text-red-800 dark:text-red-200"
            : "bg-amber-500/5 dark:bg-amber-950/15 border-amber-500/20 text-amber-800 dark:text-amber-200";
          return (
            <div key={`${group.isUsage}:${group.substance}`} className={`p-4 rounded-2xl border ${themeClass} flex gap-3 items-start`}>
              <FoodSubstanceIcon substance={group.substance} className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <div className="font-extrabold text-xs flex items-center gap-2">
                  <span className="text-slate-950 dark:text-white">{group.substance}</span>
                  {group.isUsage && <span className="text-[9px] font-bold text-sky-600 dark:text-sky-300">Kullanım bilgisi</span>}
                </div>
                {group.entries.map(entry=><div key={entry.id} className="mt-2">
                  <p className="text-xs font-bold text-slate-950 dark:text-white">{entry.drugName}</p>
                  <p className="text-xs mt-1 leading-relaxed font-semibold">{entry.effect}</p>
                  {entry.sourceUrl?.startsWith("https://dailymed.nlm.nih.gov/") && <a className="inline-block text-[10px] mt-1.5 underline underline-offset-2" href={entry.sourceUrl} target="_blank" rel="noopener noreferrer">NIH DailyMed · İlaç etiketi</a>}
                </div>)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
