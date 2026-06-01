import { Drug } from "@/lib/interactions";

export function WelcomeState() {
  return (
    <div className="backdrop-blur-md bg-white/5 border border-white/5 rounded-3xl p-8 text-center flex flex-col items-center justify-center py-20 shadow-lg min-h-[350px]">
      <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-3xl mb-4 animate-pulse-slow">
        🩺
      </div>
      <h4 className="font-bold text-white text-base">
        Tarama Başlatmak İçin İlaç Ekleyin
      </h4>
      <p className="text-xs text-slate-400 max-w-sm mt-2 leading-relaxed">
        İlaç-ilaç etkileşim denetimini başlatmak için sol panelden en az iki
        ilaç aratıp Sanal İlaç Kutusu&apos;na eklemeniz gerekmektedir.
      </p>
      <div className="mt-6 flex flex-wrap gap-2 justify-center">
        <span className="text-[10px] font-bold text-slate-500 bg-white/5 border border-white/5 px-2.5 py-1 rounded-md">
          Levenshtein Fuzzy Match
        </span>
        <span className="text-[10px] font-bold text-slate-500 bg-white/5 border border-white/5 px-2.5 py-1 rounded-md">
          Deterministik DB Sorgusu
        </span>
        <span className="text-[10px] font-bold text-slate-500 bg-white/5 border border-white/5 px-2.5 py-1 rounded-md">
          Gemini Canlı AI
        </span>
      </div>
    </div>
  );
}

export function LoadingState() {
  return (
    <div className="flex flex-col gap-4">
      {[1, 2].map((i) => (
        <div
          key={i}
          className="bg-white/5 border border-white/5 rounded-2xl p-5 animate-pulse flex flex-col gap-3"
        >
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-slate-800 rounded-full"></div>
            <div className="w-24 h-4 bg-slate-800 rounded"></div>
          </div>
          <div className="w-3/4 h-6 bg-slate-800 rounded mt-1"></div>
          <div className="w-full h-4 bg-slate-800 rounded mt-2"></div>
          <div className="w-5/6 h-4 bg-slate-800 rounded"></div>
        </div>
      ))}
    </div>
  );
}

interface ErrorStateProps {
  checkingError: string;
  onRetry: () => void;
}

export function ErrorState({ checkingError, onRetry }: ErrorStateProps) {
  return (
    <div className="backdrop-blur-md bg-red-500/5 border border-red-500/20 rounded-3xl p-6 text-center">
      <span className="text-3xl mb-3 inline-block">⚠️</span>
      <h4 className="font-bold text-red-200 text-sm">
        Klinik Servis Bağlantı Hatası
      </h4>
      <p className="text-xs text-red-400/80 mt-1 max-w-sm mx-auto leading-relaxed">
        {checkingError}
      </p>
      <button
        onClick={onRetry}
        className="mt-4 px-4 py-2 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
      >
        Yeniden Dene
      </button>
    </div>
  );
}

interface CleanStateProps {
  selectedDrugs: Drug[];
  handleRequestCoverageExplanation: () => void;
  isCoverageLoading: boolean;
}

export function CleanState({
  selectedDrugs,
  handleRequestCoverageExplanation,
  isCoverageLoading,
}: CleanStateProps) {
  return (
    <div className="flex flex-col gap-6">
      <div
        className="backdrop-blur-xl bg-emerald-500/5 border border-emerald-500/20 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden"
        style={{ boxShadow: "inset 0 1px 0 0 rgba(255, 255, 255, 0.05)" }}
      >
        <div className="absolute top-0 right-0 p-16 bg-gradient-to-bl from-emerald-500/10 to-transparent rounded-full pointer-events-none" />

        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-2xl shrink-0">
            💚
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-bold text-emerald-400 tracking-wider uppercase bg-emerald-500/10 border border-emerald-500/20 rounded px-2 py-0.5 inline-block mb-2.5">
              Klinik Temiz Rapor
            </div>
            <h4 className="font-bold text-white text-base sm:text-lg">
              Bilinen Etkileşim Saptanmadı
            </h4>
            <p className="text-xs text-emerald-300/80 mt-1.5 leading-relaxed font-medium">
              Kürate edilmiş demo veri tabanımızda, eklediğiniz ilaçlar (
              <span className="text-white">
                {selectedDrugs.map((d) => d.name).join(", ")}
              </span>
              ) arasında eşleşen riskli bir etkileşim kaydı bulunamadı.
            </p>
          </div>
        </div>
      </div>

      {/* AI general coverage deep-dive assistant button */}
      <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-3xl p-6 text-center">
        <span className="text-2xl mb-2 inline-block">🤖</span>
        <h4 className="font-bold text-white text-sm">
          Yapay Zeka ile Kombinasyon Analizi
        </h4>
        <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed max-w-xs mx-auto">
          Kayıtlı veri tabanında bulunmasa dahi bu kombinasyonun olası
          etkilerini Google Gemini Canlı AI katmanından sorgulayın.
        </p>
        <button
          onClick={handleRequestCoverageExplanation}
          disabled={isCoverageLoading}
          className="mt-4 w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs rounded-xl shadow-lg hover:shadow-indigo-500/20 transition-all duration-200 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isCoverageLoading ? (
            <>
              <svg
                className="animate-spin h-4 w-4 text-white"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
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
