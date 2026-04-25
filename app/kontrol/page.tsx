"use client";

import { useState } from "react";
import Link from "next/link";
import DrugSelector from "@/components/DrugSelector";
import ResultCard from "@/components/ResultCard";
import Disclaimer from "@/components/Disclaimer";
import { getAllDrugs } from "@/lib/interactions";

interface InteractionResult {
  interaction: {
    id: string;
    drug1: string;
    drug2: string;
    severity: string;
    summary: string;
    sourceLabel?: string;
    verificationStatus?: string;
    source?: string;
  };
  drug1Name: string;
  drug2Name: string;
}

interface ExplainResponse {
  explanation: string;
  source?: string;
  generatedAt?: string;
  disclaimer?: string;
  fallbackReason?: string;
}

export default function KontrolPage() {
  const drugs = getAllDrugs();
  const [selectedDrugs, setSelectedDrugs] = useState<string[]>([]);
  const [results, setResults] = useState<InteractionResult[] | null>(null);
  const [explanations, setExplanations] = useState<Record<string, ExplainResponse>>({});
  const [loadingExplanations, setLoadingExplanations] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [noInteraction, setNoInteraction] = useState(false);
  const [hasError, setHasError] = useState(false);

  async function handleCheck() {
    if (selectedDrugs.length < 2) return;

    setLoading(true);
    setResults(null);
    setExplanations({});
    setNoInteraction(false);
    setHasError(false);

    try {
      // Step 1: Check interactions from curated data
      const checkRes = await fetch("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ drugIds: selectedDrugs }),
      });
      
      if (!checkRes.ok) throw new Error("Check failed");
      
      const checkData = await checkRes.json();
      const interactions: InteractionResult[] = checkData.interactions ?? [];

      if (interactions.length === 0) {
        setNoInteraction(true);
        setResults([]);
        setLoading(false);
        return;
      }

      setResults(interactions);
    } catch {
      setHasError(true);
      setResults(null);
    } finally {
      setLoading(false);
    }
  }

  async function fetchExplanation(interactionId: string, force = false) {
    // Force istenmiyorsa ve daha önce alınmış geçerli bir açıklama varsa yeniden atma
    if (!force && explanations[interactionId]) {
      return; 
    }

    setLoadingExplanations((prev) => ({ ...prev, [interactionId]: true }));
    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interactionId }),
      });
      const data: ExplainResponse = await res.json();
      setExplanations((prev) => ({ ...prev, [interactionId]: data }));
    } catch {
      setExplanations((prev) => ({ ...prev, [interactionId]: { explanation: "Bir hata oluştu.", source: "fallback", fallbackReason: "timeout" } }));
    } finally {
      setLoadingExplanations((prev) => ({ ...prev, [interactionId]: false }));
    }
  }

  function handleReset() {
    setSelectedDrugs([]);
    setResults(null);
    setExplanations({});
    setNoInteraction(false);
    setHasError(false);
  }

  const selectedSet = new Set(selectedDrugs);
  const selectedDrugNames = drugs
    .filter((d) => selectedSet.has(d.id))
    .map((d) => d.name);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href="/"
            className="text-lg font-bold text-slate-800 hover:text-indigo-600 transition-colors"
          >
            💊 Pill<span className="text-indigo-600">Mind</span>
          </Link>
          {results !== null && (
            <button
              onClick={handleReset}
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
            >
              ← Yeni Kontrol
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
        {/* Drug Selection Section */}
        {results === null && (
          <section>
            <h1 className="text-2xl font-bold text-slate-800 mb-2">
              İlaç Etkileşim Kontrolü
            </h1>
            <p className="text-slate-500 mb-6 relative">
              Kontrol etmek istediğiniz ilaçları seçin. En az 2 ilaç
              gereklidir.
              <span className="block mt-3 text-xs bg-slate-50 text-slate-500 p-2.5 rounded-lg border border-slate-200">
                 <strong>Bilgi:</strong> Bu demo sürümü 10 temel ilacı ve aralarındaki doğrulanmış seçili etkileşimleri kapsar.
              </span>
            </p>

            <DrugSelector
              drugs={drugs}
              selected={selectedDrugs}
              onSelect={setSelectedDrugs}
            />

            <button
              onClick={handleCheck}
              disabled={selectedDrugs.length < 2 || loading}
              className={`mt-6 w-full py-3.5 rounded-xl font-semibold text-base transition-all duration-200 cursor-pointer ${
                selectedDrugs.length >= 2
                  ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              }`}
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <svg
                    className="animate-spin h-5 w-5"
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
                  Kontrol ediliyor...
                </span>
              ) : (
                `Kontrol Et (${selectedDrugs.length} ilaç seçildi)`
              )}
            </button>

            {selectedDrugs.length > 0 && selectedDrugs.length < 2 && (
              <p className="text-sm text-amber-600 mt-2 text-center">
                Kontrol için en az 2 ilaç seçmelisiniz.
              </p>
            )}
          </section>
        )}

        {/* Error State */}
        {hasError && (
          <section className="mt-8 text-center bg-red-50 border border-red-200 rounded-xl p-6">
            <span className="text-3xl block mb-2">⚠️</span>
            <h3 className="font-semibold text-red-800 mb-2">
              Sistem Yanıt Veremedi
            </h3>
            <p className="text-sm text-red-700 leading-relaxed mb-6">
              Şu anda açıklama oluşturulamadı. Lütfen tekrar deneyin veya sağlık profesyonelinize danışın.
            </p>
            <button
              onClick={handleReset}
              className="px-6 py-2 bg-white text-red-700 border border-red-300 rounded-lg hover:bg-red-50 transition-colors cursor-pointer text-sm font-medium"
            >
              Yeniden Seç
            </button>
          </section>
        )}

        {/* Results Section */}
        {results !== null && !hasError && (
          <section>
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-slate-800 mb-2">
                Kontrol Sonuçları
              </h1>
              <p className="text-sm text-slate-500">
                Kontrol edilen ilaçlar:{" "}
                <span className="font-medium text-slate-700">
                  {selectedDrugNames.join(", ")}
                </span>
              </p>
            </div>

            {/* No interactions found (in our dataset) */}
            {noInteraction && (
              <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-6 text-center">
                <span className="text-3xl block mb-3">📋</span>
                <h3 className="font-semibold text-slate-800 mb-2">
                  Bilinen Etkileşim Kaydı Bulunmadı
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed max-w-lg mx-auto">
                  Sistemimizde mevcut olan ilaç etkileşim veri setinde, seçtiğiniz ilaçlar arasında kritik bir eşleşme bulunmadı.
                  <strong className="block mt-3 font-medium bg-amber-50 rounded-lg px-3 py-2.5 border border-amber-200 text-amber-800 mb-3 text-left shadow-sm">
                    <span className="block text-amber-900 font-bold mb-0.5 text-xs uppercase tracking-wide">Demo Kapsam Sınırı</span>
                    Bu demo sürümü sadece 10 ilaç ve doğrulanmış seçili etkileşim kayıtlarını kapsamaktadır. Etkileşim kaydı bulunmaması, gerçekte bir risk olmadığı anlamına gelmez.
                  </strong>
                  Herhangi bir ilacı kullanmadan veya tedavi planınıza eklemeden önce daima sağlık profesyonelinize danışın.
                </p>
              </div>
            )}

            {/* Interaction cards */}
            {results.length > 0 && (
              <div className="space-y-4">
                {results.map((item) => (
                  <ResultCard
                    key={item.interaction.id}
                    interactionId={item.interaction.id}
                    drug1Name={item.drug1Name}
                    drug2Name={item.drug2Name}
                    severity={item.interaction.severity}
                    summary={item.interaction.summary}
                    sourceLabel={item.interaction.sourceLabel}
                    verificationStatus={item.interaction.verificationStatus}
                    source={item.interaction.source}
                    explanationData={explanations[item.interaction.id]}
                    isExplanationLoading={!!loadingExplanations[item.interaction.id]}
                    onExplainRequested={fetchExplanation}
                  />
                ))}
              </div>
            )}

            {/* Doctor reminder */}
            <div className="mt-8 bg-indigo-50 border border-indigo-200 rounded-xl p-5 text-center">
              <p className="text-indigo-800 font-medium">
                👨‍⚕️ Bu bilgileri doktorunuza veya eczacınıza gösterin
              </p>
              <p className="text-sm text-indigo-600 mt-1">
                Sonuçlar hakkında mutlaka bir sağlık profesyoneline danışın.
              </p>
            </div>

            {/* Reset button */}
            <button
              onClick={handleReset}
              className="mt-6 w-full py-3 rounded-xl font-semibold bg-white border-2 border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Yeni Kontrol Yap
            </button>
          </section>
        )}
      </main>

      {/* Disclaimer */}
      <Disclaimer />
    </div>
  );
}
