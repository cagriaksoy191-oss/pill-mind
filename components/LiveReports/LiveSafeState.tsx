import { Drug } from "@/lib/interactions";

interface LiveSafeStateProps {
  selectedDrugs: Drug[];
  handleRequestCoverageExplanation: () => void;
  isCoverageLoading: boolean;
}

export default function LiveSafeState({
  selectedDrugs,
  handleRequestCoverageExplanation,
  isCoverageLoading,
}: LiveSafeStateProps) {
  return (
    <div className="flex flex-col gap-6">
      <div
        className="backdrop-blur-xl bg-emerald-500/5 border border-emerald-500/20 dark:border-emerald-500/20 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden"
        style={{ boxShadow: "inset 0 1px 0 0 rgba(255, 255, 255, 0.05)" }}
      >
        <div className="absolute top-0 right-0 p-16 bg-gradient-to-bl from-emerald-500/10 to-transparent rounded-full pointer-events-none" />

        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-2xl shrink-0">
            💚
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 tracking-wider uppercase bg-emerald-500/10 border border-emerald-500/20 rounded px-2 py-0.5 inline-block mb-2.5">
              Kayıtlı Veri Setinde Bilinen Etkileşim Saptanmadı (Klinik Temiz Rapor)
            </div>
            <h4 className="font-bold text-slate-800 dark:text-white text-base sm:text-lg">Kayıtlı veri setinde bilinen etkileşim saptanmadı</h4>
            <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80 mt-1.5 leading-relaxed font-medium">
              Mevcut doğrulanmış veri setinde eklediğiniz ilaçlar (<span className="text-slate-900 dark:text-white">{selectedDrugs.map(d => d.name).join(", ")}</span>) arasında eşleşme bulunmamaktadır, tedavinizi değiştirmeden önce mutlaka hekiminize danışın.
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-3 font-semibold border-t border-emerald-500/10 pt-2">
              ⚠️ **Önemli Uyarı:** Hekime göstermek için rapor oluştururken veya raporu hekiminizle paylaşırken kesinlikle tedavinizi/dozunuzu değiştirmeyin.
            </p>
          </div>
        </div>
      </div>

      {/* AI general coverage deep-dive assistant button */}
      <div className="backdrop-blur-md bg-white/40 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 rounded-3xl p-6 text-center">
        <span className="text-2xl mb-2 inline-block">🤖</span>
        <h4 className="font-bold text-slate-800 dark:text-white text-sm">Yapay Zeka ile Kombinasyon Analizi</h4>
        <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed max-w-xs mx-auto">
          Kayıtlı veri tabanında bulunmasa dahi bu kombinasyonun olası etkilerini Google Gemini Canlı AI katmanından sorgulayın.
        </p>
        <button
          onClick={handleRequestCoverageExplanation}
          disabled={isCoverageLoading}
          className="mt-4 w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs rounded-xl shadow-lg hover:shadow-indigo-500/20 transition-all duration-200 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isCoverageLoading ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Analiz Hazırlanıyor...
            </>
          ) : (
            "Canlı AI Kombinasyon Analizini Başlat"
          )}
        </button>
      </div>
    </div>
  );
}
