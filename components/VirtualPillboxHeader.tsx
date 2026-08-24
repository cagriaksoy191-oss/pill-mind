import React from "react";

interface VirtualPillboxHeaderProps {
  drugCount: number;
}

export function VirtualPillboxHeader({ drugCount }: VirtualPillboxHeaderProps) {
  return (
    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
      <div style={{ transform: "translateZ(30px)" }}>
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          📥 Sanal İlaç Kutusu
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-500/20 font-semibold">
            {drugCount} Aktif İlaç
          </span>
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Etkileşim kontrolü için kutuya eklediğiniz ilaçlar
        </p>
      </div>

      {drugCount > 0 && (
        <div
          className="text-[11px] text-emerald-400 font-medium bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-2.5 py-1 flex items-center gap-1.5 self-start md:self-center"
          style={{ transform: "translateZ(20px)" }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          Klinik Tarama Aktif
        </div>
      )}
    </div>
  );
}
