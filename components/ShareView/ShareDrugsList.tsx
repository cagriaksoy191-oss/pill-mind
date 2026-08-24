"use client";

import { Drug } from "./types";

interface ShareDrugsListProps {
  drugs?: Drug[];
}

export default function ShareDrugsList({ drugs }: ShareDrugsListProps) {
  return (
    <div className="mb-8">
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
        Kutudaki İlaçlar ({drugs?.length || 0})
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {drugs?.map((d) => (
          <div
            key={d.id}
            className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition"
          >
            <h4 className="font-extrabold text-white text-sm">{d.name}</h4>
            <p className="text-xs text-slate-400 mt-1 font-semibold">
              Etken Madde: <span className="text-indigo-300">{d.activeIngredient}</span>
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-wide">
              {d.category} {d.pharmacologicalGroup ? `| ${d.pharmacologicalGroup}` : ""}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
