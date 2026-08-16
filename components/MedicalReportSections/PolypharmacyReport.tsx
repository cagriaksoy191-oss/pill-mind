import { PolypharmacyReport as PolypharmacyReportType } from "@/lib/interactions";

interface PolypharmacyReportProps {
  polypharmacyReport: PolypharmacyReportType | null;
}

export default function PolypharmacyReport({ polypharmacyReport }: PolypharmacyReportProps) {
  if (!polypharmacyReport || (polypharmacyReport.score < 4 && polypharmacyReport.beersWarnings.length === 0)) {
    return null;
  }

  return (
    <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950">
      <h3 className="font-bold text-amber-800 uppercase tracking-wider text-[10px] mb-1">
        📊 Polifarmasi &amp; Beers Yaşlı Hasta Analizi
      </h3>
      <p className="font-semibold">{polypharmacyReport.message}</p>
      {polypharmacyReport.beersWarnings.length > 0 && (
        <ul className="list-disc pl-4 mt-2 flex flex-col gap-1 text-[11px] font-semibold text-amber-900">
          {polypharmacyReport.beersWarnings.map((w: string, i: number) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
