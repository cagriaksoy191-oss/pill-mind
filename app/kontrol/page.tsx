"use client";

import { useState, useEffect, useCallback } from "react";
import { getAllDrugs, Drug, CheckResult, ExplanationData } from "@/lib/interactions";
import DrugSelector from "@/components/DrugSelector";
import VirtualPillbox from "@/components/VirtualPillbox";
import Disclaimer from "@/components/Disclaimer";
import StatusHeader from "@/components/StatusHeader";
import InteractionList from "@/components/InteractionList";
import CoveragePanel from "@/components/CoveragePanel";


export default function KontrolPage() {
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [selectedDrugIds, setSelectedDrugIds] = useState<string[]>([]);
  const [interactions, setInteractions] = useState<CheckResult[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [checkingError, setCheckingError] = useState<string | null>(null);

  // Individual interaction explanation states

  const [explanations, setExplanations] = useState<Record<string, ExplanationData>>({});
  const [loadingExplanations, setLoadingExplanations] = useState<Record<string, boolean>>({});

  // Global combination analysis states (Coverage)
  const [coverageExplanation, setCoverageExplanation] = useState<ExplanationData | null>(null);
  const [isCoverageLoading, setIsCoverageLoading] = useState(false);
  const [showCoveragePanel, setShowCoveragePanel] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  // Load drugs list on mount
  useEffect(() => {
    setDrugs(getAllDrugs());

    if (typeof window !== "undefined") {
      setIsOffline(!navigator.onLine);
      const handleOnline = () => setIsOffline(false);
      const handleOffline = () => setIsOffline(true);
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      // Service Worker Kaydı (PWA Altyapısı)
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => console.info("[PillMind SW] Servis İşçisi kaydı başarılı:", reg.scope))
          .catch((err) => console.warn("[PillMind SW] Servis İşçisi kaydı başarısız:", err));
      }

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, []);

  // Automatically check interactions when selected drugs change
  useEffect(() => {
    const checkInteractions = async () => {
      if (selectedDrugIds.length < 2) {
        setInteractions([]);
        setCoverageExplanation(null);
        setShowCoveragePanel(false);
        setCheckingError(null);
        return;
      }

      setIsChecking(true);
      setCheckingError(null);
      try {
        const res = await fetch("/api/check", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ drugIds: selectedDrugIds }),
        });

        if (!res.ok) {
          throw new Error("Etkileşim taraması yapılırken sunucu hatası oluştu.");
        }

        const data = await res.json();
        setInteractions(data.interactions || []);
      // 🧹 Code Health: Catch clause binding type is typed as 'unknown' instead of 'any' to enforce runtime type safety and guard checks.
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.warn("[PillMind Check Engine] Sunucu API hatası veya ağ kaybı, çevrimdışı yerel tarama çekirdeği devreye alınıyor:", errorMessage);
        try {
          const { findInteractions } = await import("@/lib/interactions");
          const localResults = findInteractions(selectedDrugIds);
          setInteractions(localResults);
          setCheckingError(null);
        } catch {
          setCheckingError("Bağlantı hatası: Yerel çevrimdışı tarama motoru yüklenemedi.");
        }
      } finally {
        setIsChecking(false);
      }
    };

    checkInteractions();
  }, [selectedDrugIds]);

  // Request detailed explanation for a single interaction card
  const handleExplainRequested = useCallback(async (interactionId: string, _force: boolean) => {
    // Avoid double fetching
    if (loadingExplanations[interactionId]) return;

    setLoadingExplanations((prev) => ({ ...prev, [interactionId]: true }));
    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ interactionId }),
      });

      const data = await res.json();
      setExplanations((prev) => ({ ...prev, [interactionId]: data }));
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error("[PillMind Explain Engine] Error:", errorMessage);
      setExplanations((prev) => ({
        ...prev,
        [interactionId]: {
          source: "error",
          error: "Canlı AI açıklaması şu anda alınamadı. Lütfen tekrar deneyin.",
          reason: "api_error",
        },
      }));
    } finally {
      setLoadingExplanations((prev) => ({ ...prev, [interactionId]: false }));
    }
  }, [loadingExplanations]);

  // Request comprehensive combination analysis (Coverage)
  const handleRequestCoverageExplanation = async () => {
    if (selectedDrugIds.length < 2 || isCoverageLoading) return;

    setIsCoverageLoading(true);
    setShowCoveragePanel(true);
    setCoverageExplanation(null);

    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ drugIds: selectedDrugIds }),
      });

      const data = await res.json();
      setCoverageExplanation(data);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error("[PillMind Coverage Engine] Error:", errorMessage);
      setCoverageExplanation({
        source: "error",
        error: "Canlı AI kombinasyon analizi şu anda oluşturulamadı. Lütfen daha sonra tekrar deneyin.",
        reason: "api_error",
      });
    } finally {
      setIsCoverageLoading(false);
    }
  };

  // Convert selected drug IDs to complete Drug object array
  const selectedDrugs = drugs.filter((d) => selectedDrugIds.includes(d.id));





  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30 selection:text-indigo-200 relative overflow-hidden flex flex-col justify-between">
      {/* Background Ambient Glows */}
      <div className="absolute top-[10%] left-[10%] w-[30rem] h-[30rem] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none animate-pulse-slow"></div>
      <div className="absolute bottom-[20%] right-[10%] w-[35rem] h-[35rem] rounded-full bg-purple-500/10 blur-[130px] pointer-events-none animate-pulse-slow"></div>
      <div className="absolute top-[40%] right-[20%] w-[25rem] h-[25rem] rounded-full bg-emerald-500/5 blur-[100px] pointer-events-none"></div>

      <StatusHeader
        selectedDrugIds={selectedDrugIds}
        isChecking={isChecking}
        interactions={interactions}
        onLoadPillbox={setSelectedDrugIds}
        isOffline={isOffline}
      />

      {/* Main Workspace */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 pt-10 pb-16 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Left Side: Interaksiyon Arama ve Kutu Yönetimi */}
        <section className="lg:col-span-7 flex flex-col gap-6" aria-label="İlaç Seçim ve Ekleme Paneli">
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-20 group">
            <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
              <div className="absolute top-0 right-0 p-32 bg-gradient-to-bl from-indigo-500/10 to-transparent rounded-full -mr-20 -mt-20" />
            </div>

            <div className="relative z-10">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
                İlaç Etkileşim <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
                  Canlı Tarama Paneli
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed max-w-lg">
                Fuzzy Search teknolojisi ile Türkçe karakter veya yazım hatası fark etmeksizin ilaçlarınızı arayın, sanal kutunuza ekleyerek etkileşimleri anında denetleyin.
              </p>

              <div className="mt-8">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5">
                  🔍 İlaç Arama ve Giriş Alanı
                </label>
                <DrugSelector
                  drugs={drugs}
                  selected={selectedDrugIds}
                  onSelect={setSelectedDrugIds}
                />
              </div>
            </div>
          </div>

          {/* 3D Virtual Pillbox Container */}
          <div className="w-full relative z-10">
            <VirtualPillbox
              selectedDrugs={selectedDrugs}
              onRemove={(id) => setSelectedDrugIds((prev) => prev.filter((x) => x !== id))}
            />
          </div>
        </section>

        {/* Right Side: Raporlar ve Klinik Analiz Sonuçları */}
        <section className="lg:col-span-5 flex flex-col gap-6" aria-label="Klinik Tarama Raporları">

          {/* Header for Results */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              📊 Tarama Raporları
              {selectedDrugIds.length >= 2 && !isChecking && (
                <span className="text-xs px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-400">
                  {interactions.length} Etkileşim
                </span>
              )}
            </h3>

            {/* Clear All Button */}
            {selectedDrugIds.length > 0 && (
              <button
                onClick={() => {
                  setSelectedDrugIds([]);
                  setInteractions([]);
                  setCoverageExplanation(null);
                  setShowCoveragePanel(false);
                }}
                className="text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3 py-1.5 rounded-lg border border-transparent hover:border-red-500/20 transition-all cursor-pointer"
              >
                Kutuyu Sıfırla
              </button>
            )}
          </div>

          {/* Results State Machine */}
          <div className="flex-1 flex flex-col gap-4">
            {selectedDrugIds.length < 2 ? (
              // Welcome / Instruction State
              <div className="backdrop-blur-md bg-white/5 border border-white/5 rounded-3xl p-8 text-center flex flex-col items-center justify-center py-20 shadow-lg min-h-[350px]">
                <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-3xl mb-4 animate-pulse-slow">
                  🩺
                </div>
                <h4 className="font-bold text-white text-base">Tarama Başlatmak İçin İlaç Ekleyin</h4>
                <p className="text-xs text-slate-400 max-w-sm mt-2 leading-relaxed">
                  İlaç-ilaç etkileşim denetimini başlatmak için sol panelden en az iki ilaç aratıp Sanal İlaç Kutusu&apos;na eklemeniz gerekmektedir.
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
            ) : isChecking ? (
              // Loading Shimmer State
              <div className="flex flex-col gap-4">
                {[1, 2].map((i) => (
                  <div key={i} className="bg-white/5 border border-white/5 rounded-2xl p-5 animate-pulse flex flex-col gap-3">
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
            ) : checkingError ? (
              // API Error State
              <div className="backdrop-blur-md bg-red-500/5 border border-red-500/20 rounded-3xl p-6 text-center">
                <span className="text-3xl mb-3 inline-block">⚠️</span>
                <h4 className="font-bold text-red-200 text-sm">Klinik Servis Bağlantı Hatası</h4>
                <p className="text-xs text-red-400/80 mt-1 max-w-sm mx-auto leading-relaxed">
                  {checkingError}
                </p>
                <button
                  onClick={() => setSelectedDrugIds([...selectedDrugIds])}
                  className="mt-4 px-4 py-2 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Yeniden Dene
                </button>
              </div>
            ) : interactions.length === 0 ? (
              // Reassuring Emerald Green Safe State (Clean check, no interactions)
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
                      <h4 className="font-bold text-white text-base sm:text-lg">Bilinen Etkileşim Saptanmadı</h4>
                      <p className="text-xs text-emerald-300/80 mt-1.5 leading-relaxed font-medium">
                        Kürate edilmiş demo veri tabanımızda, eklediğiniz ilaçlar (<span className="text-white">{selectedDrugs.map(d => d.name).join(", ")}</span>) arasında eşleşen riskli bir etkileşim kaydı bulunamadı.
                      </p>
                    </div>
                  </div>
                </div>

                {/* AI general coverage deep-dive assistant button */}
                <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-3xl p-6 text-center">
                  <span className="text-2xl mb-2 inline-block">🤖</span>
                  <h4 className="font-bold text-white text-sm">Yapay Zeka ile Kombinasyon Analizi</h4>
                  <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed max-w-xs mx-auto">
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
            ) : (
              // Risky Interactions Listed State
              <InteractionList
                interactions={interactions}
                explanations={explanations}
                loadingExplanations={loadingExplanations}
                onExplainRequested={handleExplainRequested}
                handleRequestCoverageExplanation={handleRequestCoverageExplanation}
                isCoverageLoading={isCoverageLoading}
              />
            )}

            {/* Global Coverage AI Explanation Display Panel */}
            <CoveragePanel
              showCoveragePanel={showCoveragePanel}
              setShowCoveragePanel={setShowCoveragePanel}
              isCoverageLoading={isCoverageLoading}
              coverageExplanation={coverageExplanation}
              handleRequestCoverageExplanation={handleRequestCoverageExplanation}
            />

          </div>
        </section>
      </main>

      {/* Core Clinical Disclaimer Footer */}
      <footer className="relative z-10 w-full">
        <Disclaimer />
      </footer>

      {/* Global CSS Inject for Animations & Smooth Custom Transitions */}
      <style jsx global>{`
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.8; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.03); }
        }
        .animate-pulse-slow {
          animation: pulse-slow 8s infinite ease-in-out;
        }
        @keyframes slide-down {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-down {
          animation: slide-down 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}
