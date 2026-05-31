import Link from "next/link";
import { CheckResult } from "@/lib/interactions";

interface StatusHeaderProps {
  selectedDrugIds: string[];
  isChecking: boolean;
  interactions: CheckResult[];
}

export default function StatusHeader({
  selectedDrugIds,
  isChecking,
  interactions,
}: StatusHeaderProps) {
  // Determine system status label based on current selections and findings
  const getSystemStatusLabel = () => {
    if (selectedDrugIds.length === 0) return "İlaç Bekleniyor";
    if (selectedDrugIds.length === 1) return "İkinci İlaç Bekleniyor";
    if (isChecking) return "Taranıyor...";
    if (interactions.length > 0) {
      const highAlert = interactions.some((i) => i.interaction.severity === "high");
      return highAlert ? "Potansiyel Ciddi Etkileşim!" : "Klinik Etkileşim Tespit Edildi";
    }
    return "Temiz Rapor (Etkileşim Saptanmadı)";
  };

  const getSystemStatusBadgeClass = () => {
    if (selectedDrugIds.length < 2) return "bg-slate-500/10 text-slate-400 border-slate-500/20";
    if (isChecking) return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20 animate-pulse";
    if (interactions.length > 0) {
      const highAlert = interactions.some((i) => i.interaction.severity === "high");
      return highAlert
        ? "bg-red-500/10 text-red-400 border-red-500/20 animate-pulse"
        : "bg-amber-500/10 text-amber-400 border-amber-500/20";
    }
    return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  };

  return (
    <header className="w-full py-4 px-6 border-b border-white/5 bg-slate-950/40 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2 group focus:outline-none">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-md group-hover:scale-105 transition-transform duration-200">
            P
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white group-hover:text-indigo-300 transition-colors">
            PillMind <span className="text-xs font-semibold text-slate-400 ml-1">Portal</span>
          </h1>
        </Link>

        <div className="flex items-center gap-4">
          {/* Live Engine Status indicator */}
          <div className={`text-[11px] font-bold px-3 py-1 rounded-full border flex items-center gap-1.5 transition-all duration-300 ${getSystemStatusBadgeClass()}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              selectedDrugIds.length < 2
                ? "bg-slate-400"
                : interactions.length > 0
                  ? interactions.some((i) => i.interaction.severity === "high") ? "bg-red-400" : "bg-amber-400"
                  : "bg-emerald-400"
            } ${isChecking || (selectedDrugIds.length >= 2 && interactions.length > 0) ? "animate-pulse" : ""}`}></span>
            {getSystemStatusLabel()}
          </div>

          <Link
            href="/"
            className="text-xs font-semibold text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/5 transition-all duration-200"
          >
            Ana Sayfa
          </Link>
        </div>
      </div>
    </header>
  );
}
