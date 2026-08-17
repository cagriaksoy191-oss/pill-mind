import { AccumulationWarning } from "@/lib/interactions";

interface LiveAccumulationWarningsProps {
  accumulationWarnings: AccumulationWarning[];
}

export default function LiveAccumulationWarnings({ accumulationWarnings }: LiveAccumulationWarningsProps) {
  if (accumulationWarnings.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 mb-2 animate-slide-down">
      {accumulationWarnings.map((warning, index) => {
        const isHigh = warning.severity === "high";
        const cardBg = isHigh
          ? "bg-red-500/10 border-red-500/30 text-red-200"
          : "bg-amber-500/10 border-amber-500/30 text-amber-200";
        const icon = isHigh ? "🚨" : "⚠️";
        const title = isHigh ? "Aşırı Doz / Çift İlaç Çakışması" : "Farmakolojik Sınıf Birikimi";

        return (
          <div
            key={index}
            className={`backdrop-blur-xl border rounded-2xl p-4 shadow-lg flex gap-3 items-start ${cardBg}`}
          >
            <span className="text-xl shrink-0 mt-0.5">{icon}</span>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-xs uppercase tracking-wider text-white">
                  {title}
                </h4>
                <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                  isHigh
                    ? "bg-red-500/20 text-red-300 border border-red-500/30"
                    : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                }`}>
                  {isHigh ? "Yüksek Risk" : "Orta Risk"}
                </span>
              </div>
              <p className="text-xs font-semibold mt-1.5 leading-relaxed">
                {warning.message}
              </p>
              {warning.detail && (
                <p className="text-[11px] text-slate-400 mt-1">
                  {warning.detail}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
