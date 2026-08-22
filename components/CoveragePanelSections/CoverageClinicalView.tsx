import { getEvidenceLevelBadge } from "@/lib/utils/badges";
import { CheckResult } from "@/lib/interactions";

interface CoverageClinicalViewProps {
  interactions?: CheckResult[];
}

export default function CoverageClinicalView({ interactions = [] }: CoverageClinicalViewProps) {
  return (
    <div className="flex flex-col gap-4 py-2">
      <h5 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-2 flex items-center gap-1">
        <span>🔬</span> Deterministik Klinik Kanıt Verileri
      </h5>
      {interactions && interactions.length > 0 ? (
        <div className="flex flex-col gap-3">
          {interactions.map((res) => {
            const level = res.interaction.evidenceLevel;
            const evidenceBadge = getEvidenceLevelBadge(level);
            return (
              <div key={res.interaction.id} className="bg-indigo-950/30 border border-indigo-500/15 rounded-2xl p-4">
                <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                  <span className="text-xs font-extrabold text-white">
                    {res.drug1Name} &amp; {res.drug2Name}
                  </span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${evidenceBadge.style}`}>
                    {evidenceBadge.label}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-semibold">
                  {res.interaction.clinicalDetail || res.interaction.summary}
                </p>
                {res.interaction.source && (
                  <div className="text-[10px] text-slate-400 mt-2">
                    <span className="font-bold">Referanslar:</span>{" "}
                    {res.interaction.source.split(";").map((s, idx) => {
                      const trimSrc = s.trim();
                      if (!trimSrc) return null;
                      const isPubMed = trimSrc.toLowerCase().includes("pubmed");
                      const url = isPubMed
                        ? `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(trimSrc)}`
                        : `https://www.google.com/search?q=${encodeURIComponent(trimSrc)}`;
                      return (
                        <a
                          key={idx}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block mx-1 hover:text-indigo-400 underline"
                        >
                          {trimSrc}
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white/5 border border-white/5 rounded-2xl p-5 text-center text-xs text-slate-400">
          Kombinasyon içinde bilinen ikili klinik etkileşim kaydı bulunmamaktadır.
        </div>
      )}
    </div>
  );
}
