"use client";

import { Drug } from "@/lib/interactions";

interface DrugListProps {
  filtered: Drug[];
  query: string;
  activeIndex: number;
  onAddDrug: (drugId: string) => void;
  isLoading?: boolean;
}

export default function DrugList({
  filtered,
  query,
  activeIndex,
  onAddDrug,
  isLoading,
}: DrugListProps) {
  if (isLoading) {
    return <div className="animate-pulse">...</div>;
  }
  return (
    <div
      className="absolute z-40 w-full mt-2 rounded-2xl bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xl overflow-hidden max-h-72 overflow-y-auto animate-fade-in divide-y divide-slate-100 dark:divide-slate-900"
      role="listbox"
    >
      {filtered.length === 0 ? (
        <div className="px-5 py-4 text-sm text-slate-400 dark:text-slate-500 italic text-center">
          {query
            ? "Eşleşen herhangi bir ilaç bulunamadı"
            : "Tüm ilaçlar kutuya eklendi"}
        </div>
      ) : (
        filtered.map((drug, index) => {
          const isHighlighted = index === activeIndex;
          return (
            <button
              key={drug.id}
              onClick={() => onAddDrug(drug.id)}
              className={`w-full text-left px-5 py-3.5 transition-all duration-200 flex items-center justify-between cursor-pointer ${
                isHighlighted
                  ? "bg-indigo-500/10 dark:bg-indigo-500/20 border-l-4 border-indigo-500 pl-4"
                  : "hover:bg-slate-50 dark:hover:bg-slate-900/50 border-l-4 border-transparent"
              }`}
              role="option"
              aria-selected={isHighlighted}
            >
              <div className="flex-1 min-w-0 pr-4">
                <div className="font-bold text-slate-800 dark:text-slate-100 text-sm md:text-base truncate flex items-center gap-1.5">
                  <span>💊</span>
                  <span>{drug.name}</span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
                  Etken Madde:{" "}
                  <span className="font-semibold text-slate-600 dark:text-slate-300">
                    {drug.activeIngredient}
                  </span>
                </div>
              </div>
              <div className="text-[10px] md:text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border border-slate-200/40 dark:border-slate-700/40 shrink-0">
                {drug.category}
              </div>
            </button>
          );
        })
      )}
    </div>
  );
}
