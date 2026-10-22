"use client";

import Link from "next/link";
import PillMindBrand from "../PillMindBrand";

interface ShareHeaderProps {
  onPrint: () => void;
}

export default function ShareHeader({ onPrint }: ShareHeaderProps) {
  return (
    <header className="w-full py-2.5 px-4 sm:px-6 border-b border-white/5 bg-slate-950/40 backdrop-blur-md sticky top-0 z-50 print:hidden">
      <div className="max-w-5xl mx-auto flex flex-wrap gap-3 justify-between items-center">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="flex"><PillMindBrand tone="light" /></h1>
          <span className="text-[10px] text-indigo-400 font-semibold px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 uppercase">
            Salt Okunur
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={onPrint}
            className="text-xs font-bold text-white bg-white/5 border border-white/10 hover:bg-white/10 px-4 py-2 rounded-xl transition"
          >
            Yazdır / PDF
          </button>
          <Link
            href="/"
            className="text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-xl transition shadow-lg hover:shadow-indigo-500/20"
          >
            Kendi Kunu Kontrol Et
          </Link>
        </div>
      </div>
    </header>
  );
}
