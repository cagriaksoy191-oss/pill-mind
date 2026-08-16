import { FoodInteractionResult } from "@/lib/interactions";

interface FoodInteractionsProps {
  foodInteractions: FoodInteractionResult[];
}

export default function FoodInteractions({ foodInteractions }: FoodInteractionsProps) {
  if (foodInteractions.length === 0) return null;

  return (
    <div className="mb-6 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900">
      <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[10px] mb-2">
        🥗 Gıda, Alkol ve Besin Etkileşim Raporu
      </h3>
      <div className="flex flex-col gap-2">
        {foodInteractions.map((f, i) => (
          <div key={i} className="border-b border-slate-200/50 pb-1.5 last:border-0 last:pb-0">
            <span className="font-bold text-slate-900">{f.drugName} &amp; {f.substance} ({f.severity.toUpperCase()} Risk):</span>
            <span className="block text-[11px] text-slate-700 mt-0.5 font-medium">{f.effect}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
