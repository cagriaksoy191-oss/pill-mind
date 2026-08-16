import { ContraindicationResult } from "@/lib/interactions";

interface ContraindicationsProps {
  contraindications: ContraindicationResult[];
}

export default function Contraindications({ contraindications }: ContraindicationsProps) {
  if (contraindications.length === 0) return null;

  return (
    <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900">
      <h3 className="font-bold text-red-800 uppercase tracking-wider text-[10px] mb-2">
        ❌ Kritik Tıbbi Uyumsuzluklar (Contraindications)
      </h3>
      <ul className="list-disc pl-4 flex flex-col gap-2 font-semibold">
        {contraindications.map((c, i) => (
          <li key={i}>
            <strong>{c.drugName} &amp; {c.diseaseName || c.diseaseIcd}:</strong> {c.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
