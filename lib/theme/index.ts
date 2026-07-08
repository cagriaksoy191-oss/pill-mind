export const getGlassColors = (sev: string) => {
  switch (sev) {
    case "high":
      return {
        cardBg: "bg-red-500/5 dark:bg-red-950/15 border-red-500/20 dark:border-red-500/30",
        badge: "bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/20",
        text: "text-red-800 dark:text-red-200",
        accentColor: "#ef4444",
        icon: "🔴",
      };
    case "medium":
      return {
        cardBg: "bg-amber-500/5 dark:bg-amber-950/15 border-amber-500/20 dark:border-amber-500/30",
        badge: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20",
        text: "text-amber-800 dark:text-amber-200",
        accentColor: "#f59e0b",
        icon: "🟡",
      };
    case "low":
      return {
        cardBg: "bg-emerald-500/5 dark:bg-emerald-950/15 border-emerald-500/20 dark:border-emerald-500/30",
        badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20",
        text: "text-emerald-800 dark:text-emerald-200",
        accentColor: "#10b981",
        icon: "🟢",
      };
    default:
      return {
        cardBg: "bg-slate-500/5 dark:bg-slate-950/15 border-slate-500/20 dark:border-slate-500/30",
        badge: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-500/20",
        text: "text-slate-800 dark:text-slate-200",
        accentColor: "#64748b",
        icon: "ℹ️",
      };
  }
};
