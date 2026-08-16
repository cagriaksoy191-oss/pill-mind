import { AccumulationWarning } from "@/lib/interactions";

interface AccumulationWarningsProps {
  accumulationWarnings: AccumulationWarning[];
}

export default function AccumulationWarnings({ accumulationWarnings }: AccumulationWarningsProps) {
  if (accumulationWarnings.length === 0) return null;

  return (
    <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900">
      <h3 className="font-bold text-red-800 uppercase tracking-wider text-[10px] mb-2">
        🚨 Aşırı Doz / Farmakolojik Grup Çakışmaları
      </h3>
      <ul className="list-disc pl-4 flex flex-col gap-1.5 font-semibold">
        {accumulationWarnings.map((w, i) => (
          <li key={i}>{w.message}</li>
        ))}
      </ul>
    </div>
  );
}
