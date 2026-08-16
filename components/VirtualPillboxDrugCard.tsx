import React from "react";
import { Drug } from "./VirtualPillbox";

interface VirtualPillboxDrugCardProps {
  drug: Drug;
  isNew: boolean;
  severityGlow: string;
  onRemove: (id: string) => void;
}

export function VirtualPillboxDrugCard({
  drug,
  isNew,
  severityGlow,
  onRemove,
}: VirtualPillboxDrugCardProps) {
  return (
    <div
      className={`relative flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 ease-out group overflow-hidden ${
        isNew
          ? "animate-drop-pill border-emerald-500/50 bg-emerald-500/10"
          : `${severityGlow ? severityGlow : "border-white/10"} bg-slate-900/40 hover:border-indigo-500/30 hover:bg-slate-900/60`
      }`}
      style={{
        transformStyle: "preserve-3d",
        animation: isNew
          ? "drop-pill 0.8s cubic-bezier(0.25, 1, 0.5, 1) forwards"
          : undefined,
      }}
    >
      {/* Glowing background on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      <div
        className="flex items-center gap-3 relative z-10"
        style={{ transform: "translateZ(20px)" }}
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center text-xl shadow-inner group-hover:scale-110 transition-transform duration-300">
          💊
        </div>
        <div>
          <h4 className="font-bold text-white text-sm group-hover:text-indigo-300 transition-colors">
            {drug.name}
          </h4>
          <p className="text-[11px] text-slate-400 font-medium truncate max-w-[150px] sm:max-w-[180px] mt-0.5">
            {drug.activeIngredient}
          </p>
        </div>
      </div>

      <button
        onClick={() => onRemove(drug.id)}
        className="relative z-10 w-11 h-11 sm:w-8 sm:h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-all cursor-pointer shadow-md focus:outline-none focus:ring-2 focus:ring-red-500/40"
        aria-label={`${drug.name} ilacını kutudan çıkar`}
        style={{ transform: "translateZ(20px)" }}
      >
        ✕
      </button>
    </div>
  );
}
