import { useState, useEffect } from "react";
import Link from "next/link";
import { CheckResult } from "@/lib/interactions";
import UserPanel from "./UserPanel";

interface StatusHeaderProps {
  selectedDrugIds: string[];
  isChecking: boolean;
  interactions: CheckResult[];
  onLoadPillbox: (drugIds: string[]) => void;
  isOffline?: boolean;
}

export default function StatusHeader({
  selectedDrugIds,
  isChecking,
  interactions,
  onLoadPillbox,
  isOffline,
}: StatusHeaderProps) {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("pillmind_theme") as "light" | "dark" | null;
      if (savedTheme === "light" || savedTheme === "dark") return savedTheme;
      const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      return systemPrefersDark ? "dark" : "light";
    }
    return "dark";
  });

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("pillmind_theme", nextTheme);
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

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
    if (selectedDrugIds.length < 2) return "bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/20";
    if (isChecking) return "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 animate-pulse";
    if (interactions.length > 0) {
      const highAlert = interactions.some((i) => i.interaction.severity === "high");
      return highAlert
        ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 animate-pulse"
        : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
    }
    return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
  };

  return (
    <header className="w-full py-4 px-6 border-b border-slate-200/50 dark:border-white/5 bg-white/60 dark:bg-slate-950/40 backdrop-blur-md sticky top-0 z-50 print:hidden">
      <div className="max-w-6xl mx-auto flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2 group focus:outline-none">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-md group-hover:scale-105 transition-transform duration-200">
            P
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">
            PillMind <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1">Portal</span>
          </h1>
        </Link>

        <div className="flex items-center gap-3">
          {/* Çevrimdışı Durum Göstergesi */}
          {isOffline && (
            <div className="text-[11px] font-bold px-3 py-1 rounded-full border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center gap-1.5 animate-pulse shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              Çevrimdışı Mod (Yerel Koruma)
            </div>
          )}

          {/* Live Engine Status indicator */}
          <div className={`text-[11px] font-bold px-3 py-1 rounded-full border flex items-center gap-1.5 transition-all duration-300 ${getSystemStatusBadgeClass()}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              selectedDrugIds.length < 2
                ? "bg-slate-400"
                : interactions.length > 0
                  ? interactions.some((i) => i.interaction.severity === "high") ? "bg-red-500" : "bg-amber-500"
                  : "bg-emerald-500"
            } ${isChecking || (selectedDrugIds.length >= 2 && interactions.length > 0) ? "animate-pulse" : ""}`}></span>
            {getSystemStatusLabel()}
          </div>

          {/* Bulut Kaydet ve Oturum Yönetim Paneli */}
          <UserPanel
            selectedDrugIds={selectedDrugIds}
            onLoadPillbox={onLoadPillbox}
          />

          {/* Tema Değiştirici Düğme */}
          <button
            onClick={toggleTheme}
            className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white transition-all cursor-pointer"
            aria-label="Aydınlık / Karanlık Tema Değiştirici"
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>

          <Link
            href="/"
            className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 border border-transparent hover:border-slate-200 dark:hover:border-white/5 transition-all duration-200"
          >
            Ana Sayfa
          </Link>
        </div>
      </div>
    </header>
  );
}
