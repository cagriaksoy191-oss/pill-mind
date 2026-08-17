import React from 'react';

interface ClinicalModeProps {
  evidenceBadge: { label: string; desc: string; style: string };
  clinicalDetail?: string;
  source?: string;
}

export function ClinicalMode({ evidenceBadge, clinicalDetail, source }: ClinicalModeProps) {
  return (
    <div className="flex flex-col gap-3 py-1">
      <div className="flex items-center gap-2 flex-wrap mb-1">
        <span className="text-xs font-bold text-slate-400 dark:text-slate-500">Kanıt Seviyesi:</span>
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold tracking-wide uppercase border ${evidenceBadge.style}`}
          title={evidenceBadge.desc}
        >
          {evidenceBadge.label}
        </span>
      </div>

      <div className="bg-indigo-500/5 dark:bg-indigo-950/20 border border-indigo-500/10 rounded-xl p-4">
        <h5 className="text-xs font-bold uppercase tracking-wider text-indigo-500 dark:text-indigo-400 mb-1.5 flex items-center gap-1">
          <span>🧬</span> Farmakolojik Mekanizma Detayı
        </h5>
        <p className="text-sm text-slate-800 dark:text-slate-300 leading-relaxed font-semibold">
          {clinicalDetail || "Bu etkileşim için özel klinik mekanizma kaydı bulunmamaktadır. Lütfen kaynakları inceleyin."}
        </p>
      </div>

      {source && (
        <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">
          <span className="font-bold text-slate-600 dark:text-slate-500">Klinik Literatür &amp; Referans:</span>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {source.split(";").map((src, i) => {
              const trimSrc = src.trim();
              if (!trimSrc) return null;
              const isPubMed = trimSrc.toLowerCase().includes("pubmed");
              const url = isPubMed
                ? `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(trimSrc)}`
                : `https://www.google.com/search?q=${encodeURIComponent(trimSrc)}`;
              return (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500/40 text-slate-600 dark:text-slate-400 hover:text-indigo-400 transition-colors"
                >
                  <span>📖</span> {trimSrc}
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
