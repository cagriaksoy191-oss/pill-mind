import { ContraindicationResult } from "@/lib/interactions";

interface LiveContraindicationsProps {
  contraindications: ContraindicationResult[];
}

export default function LiveContraindications({ contraindications }: LiveContraindicationsProps) {
  if (contraindications.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 mb-2 animate-slide-down">
      {contraindications.map((contra, idx) => (
        <div
          key={idx}
          className="backdrop-blur-xl border border-red-500/30 bg-red-500/10 text-red-200 rounded-2xl p-4 shadow-lg flex gap-3 items-start"
        >
          <span className="text-xl shrink-0 mt-0.5">❌</span>
          <div className="flex-1">
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-extrabold text-[10px] uppercase tracking-wider text-white">
                Tıbbi Uyumsuzluk (Kontrendikasyon)
              </h4>
              <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 shrink-0">
                Kritik Uyarısı
              </span>
            </div>
            <p className="text-xs font-bold mt-1.5 text-white">
              {contra.drugName} &amp; {contra.diseaseName || contra.diseaseIcd || "Klinik Profil"} Uyuşmazlığı
            </p>
            <p className="text-xs mt-1 leading-relaxed text-red-200/90 font-medium">
              {contra.message}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
