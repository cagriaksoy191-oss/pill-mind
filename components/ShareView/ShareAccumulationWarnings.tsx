"use client";

import { AccumulationWarning } from "./types";

interface ShareAccumulationWarningsProps {
  warnings?: AccumulationWarning[];
}

export default function ShareAccumulationWarnings({ warnings }: ShareAccumulationWarningsProps) {
  if (!warnings || warnings.length === 0) return null;

  return (
    <div className="mb-6 p-5 rounded-2xl bg-red-950/20 border border-red-500/20 text-red-200">
      <h4 className="text-xs font-extrabold uppercase tracking-wider text-red-400 mb-3 flex items-center gap-1.5">
        🚨 Doz Aşımı / Grup Birikim Uyarıları
      </h4>
      <ul className="list-disc pl-5 text-xs flex flex-col gap-2 font-medium">
        {warnings.map((w, i) => (
          <li key={i}>
            <strong>{w.message}</strong>
            {w.detail && <span className="block text-[11px] text-slate-400 mt-0.5">{w.detail}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
