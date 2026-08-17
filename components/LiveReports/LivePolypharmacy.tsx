import { PolypharmacyReport } from "@/lib/interactions";

interface LivePolypharmacyProps {
  polypharmacyReport: PolypharmacyReport | null;
}

export default function LivePolypharmacy({ polypharmacyReport }: LivePolypharmacyProps) {
  if (!polypharmacyReport || (polypharmacyReport.score < 4 && polypharmacyReport.beersWarnings.length === 0)) return null;

  return (
    <div className="backdrop-blur-xl bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 shadow-lg flex flex-col gap-2.5 mb-2 animate-slide-down">
      <div className="flex items-start gap-3">
        <span className="text-xl shrink-0 mt-0.5">📊</span>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h4 className="font-extrabold text-xs uppercase tracking-wider text-amber-500">
              Çoklu İlaç ve Beers Analizi
            </h4>
            <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30`}>
              {polypharmacyReport.level === "high" ? "Yüksek Risk" : "Orta Risk"}
            </span>
          </div>
          <p className="text-xs mt-1.5 leading-relaxed text-amber-200 dark:text-amber-200/95 font-medium">
            {polypharmacyReport.message}
          </p>
        </div>
      </div>

      {polypharmacyReport.beersWarnings.length > 0 && (
        <div className="border-t border-amber-500/10 pt-2 flex flex-col gap-1.5">
          {polypharmacyReport.beersWarnings.map((warn: string, idx: number) => (
            <div key={idx} className="flex items-start gap-2 text-[11px] text-amber-200/80 leading-relaxed font-bold">
              <span className="shrink-0 text-xs">👴</span>
              <div>{warn}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
