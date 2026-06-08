interface CoveragePanelProps {
  showCoveragePanel: boolean;
  setShowCoveragePanel: (show: boolean) => void;
  isCoverageLoading: boolean;
  coverageExplanation: {
    source?: string;
    explanation?: string;
    generatedAt?: string;
    error?: string;
  } | null;
  handleRequestCoverageExplanation: () => Promise<void>;
}

export default function CoveragePanel({
  showCoveragePanel,
  setShowCoveragePanel,
  isCoverageLoading,
  coverageExplanation,
  handleRequestCoverageExplanation,
}: CoveragePanelProps) {
  if (!showCoveragePanel) return null;

  return (
    <div
      className="backdrop-blur-xl bg-slate-900/90 border border-indigo-500/20 rounded-3xl p-6 shadow-2xl mt-4 animate-fade-in relative overflow-hidden"
      style={{ boxShadow: "0 20px 40px -15px rgba(99, 102, 241, 0.25)" }}
    >
      <div className="absolute top-0 right-0 p-12 bg-linear-to-bl from-indigo-500/5 to-transparent rounded-full pointer-events-none" />

      <div className="flex justify-between items-center mb-4 pb-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="text-xl">🤖</span>
          <div>
            <h4 className="font-extrabold text-white text-sm tracking-tight">Kapsamlı AI İlaç Analizi</h4>
            <p className="text-[9px] text-slate-400 mt-0.5">Google Gemini Güvenlik Katmanı</p>
          </div>
        </div>
        <button
          onClick={() => setShowCoveragePanel(false)}
          className="w-6 h-6 rounded-md bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white text-xs cursor-pointer transition-colors"
        >
          ✕
        </button>
      </div>

      {isCoverageLoading ? (
        <div className="py-8 flex flex-col items-center justify-center gap-3">
          <svg className="animate-spin h-6 w-6 text-indigo-500" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-xs text-slate-400 font-semibold animate-pulse tracking-wide">
            Tüm Kombinasyon Canlı Yapay Zekayla Analiz Ediliyor...
          </p>
        </div>
      ) : coverageExplanation?.source === "gemini_live" || coverageExplanation?.source === "cache" ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {coverageExplanation.source === "cache" ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[9px] font-bold tracking-wide uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                Önbellek Yanıtı
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[9px] font-bold tracking-wide uppercase bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse"></span>
                Canlı Analiz
              </span>
            )}
            {coverageExplanation.generatedAt && (
              <span className="text-[9px] text-slate-400 font-semibold bg-white/5 border border-white/5 px-2 py-0.5 rounded">
                {coverageExplanation.generatedAt}
              </span>
            )}
          </div>

          <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-line font-medium pr-1">
            {coverageExplanation.explanation}
          </div>

          {/* Disclaimer specifically designed inside our clinical display panel */}
          <div className="mt-2 bg-white/5 p-3.5 rounded-xl border border-white/5">
            <p className="text-[10px] text-slate-400 italic leading-relaxed font-medium">
              <strong>Klinik Uyarı:</strong> Bu analiz tamamen bilgilendirme amaçlıdır. İlaç tedavilerinizi değiştirmeden, bırakmadan veya doz ayarlamadan önce her zaman hekiminize veya eczacınıza danışınız. Yapay zeka hiçbir koşulda profesyonel hekim kararının yerine geçemez.
            </p>
          </div>
        </div>
      ) : coverageExplanation?.source === "error" ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-center">
          <h5 className="text-xs font-bold text-red-200">Analiz Tamamlanamadı</h5>
          <p className="text-[10px] text-red-400/80 mt-1.5 leading-relaxed font-medium">
            {coverageExplanation.error || "Canlı kombinasyon açıklaması şu anda sunulamıyor."}
          </p>
          <button
            onClick={handleRequestCoverageExplanation}
            className="mt-3 px-3 py-1.5 bg-white/5 border border-red-500/20 text-red-300 hover:bg-red-500/10 text-xs font-bold rounded-lg transition-colors cursor-pointer"
          >
            Yeniden Dene
          </button>
        </div>
      ) : null}
    </div>
  );
}
