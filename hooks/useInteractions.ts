import { useState, useEffect, useCallback } from "react";
import { CheckResult, AccumulationWarning, ExplanationData } from "@/lib/interactions";

export function useInteractions(selectedDrugIds: string[], patientContext?: any) {
  const [interactions, setInteractions] = useState<CheckResult[]>([]);
  const [accumulationWarnings, setAccumulationWarnings] = useState<AccumulationWarning[]>([]);
  const [foodInteractions, setFoodInteractions] = useState<any[]>([]);
  const [contraindications, setContraindications] = useState<any[]>([]);
  const [polypharmacyReport, setPolypharmacyReport] = useState<any | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [checkingError, setCheckingError] = useState<string | null>(null);

  // Individual interaction explanation states
  const [explanations, setExplanations] = useState<Record<string, ExplanationData>>({});
  const [loadingExplanations, setLoadingExplanations] = useState<Record<string, boolean>>({});

  // Global combination analysis states (Coverage)
  const [coverageExplanation, setCoverageExplanation] = useState<{
    explanation?: string;
    source?: string;
    generatedAt?: string;
    error?: string;
    reason?: string;
  } | null>(null);
  const [isCoverageLoading, setIsCoverageLoading] = useState(false);
  const [showCoveragePanel, setShowCoveragePanel] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  // Load drugs list on mount (only offline handling)
  useEffect(() => {
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

  const serializedContext = JSON.stringify(patientContext);

  // Automatically check interactions when selected drugs change
  useEffect(() => {
    const checkInteractions = async () => {
      if (selectedDrugIds.length < 2) {
        setInteractions([]);
        setAccumulationWarnings([]);
        setFoodInteractions([]);
        setContraindications([]);
        setPolypharmacyReport(null);
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
          body: JSON.stringify({ drugIds: selectedDrugIds, patientContext }),
        });

        if (!res.ok) {
          throw new Error("Etkileşim taraması yapılırken sunucu hatası oluştu.");
        }

        const data = await res.json();
        setInteractions(data.interactions || []);
        setAccumulationWarnings(data.accumulationWarnings || []);
        setFoodInteractions(data.foodInteractions || []);
        setContraindications(data.contraindications || []);
        setPolypharmacyReport(data.polypharmacyReport || null);
      } catch (err) {
        console.warn("[PillMind Check Engine] Sunucu API hatası veya ağ kaybı, çevrimdışı yerel tarama çekirdeği devreye alınıyor:", err);
        try {
          const { findInteractions, checkAccumulation, findFoodInteractions, findContraindications, checkPolypharmacyAndBeers } = await import("@/lib/interactions");
          const localResults = findInteractions(selectedDrugIds);
          const localAccumulation = checkAccumulation(selectedDrugIds);
          const localFood = findFoodInteractions(selectedDrugIds);
          const localContra = findContraindications(selectedDrugIds, patientContext);
          const localPoly = checkPolypharmacyAndBeers(selectedDrugIds, patientContext);

          setInteractions(localResults);
          setAccumulationWarnings(localAccumulation);
          setFoodInteractions(localFood);
          setContraindications(localContra);
          setPolypharmacyReport(localPoly);
          setCheckingError(null);
        } catch (localErr) {
          console.error("Local fallback failed:", localErr);
          setCheckingError("Bağlantı hatası: Yerel çevrimdışı tarama motoru yüklenemedi.");
        }
      } finally {
        setIsChecking(false);
      }
    };

    checkInteractions();
  }, [selectedDrugIds, serializedContext]);

  // Request detailed explanation for a single interaction card using SSE stream
  const handleExplainRequested = useCallback(async (interactionId: string, _force: boolean) => {
    if (loadingExplanations[interactionId]) return;

    if (_force) {
      console.info(`[PillMind Explain Engine] Force explanation requested for: ${interactionId}`);
    }

    setLoadingExplanations((prev) => ({ ...prev, [interactionId]: true }));
    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ interactionId, stream: true }),
      });

      if (!res.ok) {
        throw new Error("Canlı AI açıklaması şu anda üretilemedi.");
      }

      const contentType = res.headers.get("Content-Type") || "";
      if (contentType.includes("text/event-stream")) {
        const reader = res.body?.getReader();
        const decoder = new TextDecoder("utf-8");
        let explanationText = "";

        setExplanations((prev) => ({
          ...prev,
          [interactionId]: { source: "gemini_live", explanation: "" },
        }));

        while (reader) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const dataStr = line.slice(6).trim();
              if (dataStr === "[DONE]") {
                break;
              }
              try {
                const dataObj = JSON.parse(dataStr);
                if (dataObj.error) {
                  setExplanations((prev) => ({
                    ...prev,
                    [interactionId]: {
                      source: "error",
                      error: dataObj.error,
                      reason: dataObj.code === "UNSAFE_ALERT" || dataObj.code === "REJECTED" ? "safety_block" : "api_error",
                    },
                  }));
                  return;
                }

                if (dataObj.chunk) {
                  explanationText += dataObj.chunk;
                  setExplanations((prev) => ({
                    ...prev,
                    [interactionId]: {
                      source: "gemini_live",
                      explanation: explanationText,
                      generatedAt: dataObj.generatedAt,
                    },
                  }));
                }

                if (dataObj.done) {
                  setExplanations((prev) => ({
                    ...prev,
                    [interactionId]: {
                      source: "gemini_live",
                      explanation: explanationText,
                      generatedAt: dataObj.generatedAt,
                    },
                  }));
                }
              } catch {
                // Ignore parsing errors on split chunks
              }
            }
          }
        }
      } else {
        const data = await res.json();
        setExplanations((prev) => ({ ...prev, [interactionId]: data }));
      }
    } catch (err) {
      console.error("[PillMind Explain Engine] Error:", err);
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

  // Request comprehensive combination analysis (Coverage) using SSE stream
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
        body: JSON.stringify({ drugIds: selectedDrugIds, stream: true }),
      });

      if (!res.ok) {
        throw new Error("Canlı AI kombinasyon analizi şu anda oluşturulamadı.");
      }

      const contentType = res.headers.get("Content-Type") || "";
      if (contentType.includes("text/event-stream")) {
        const reader = res.body?.getReader();
        const decoder = new TextDecoder("utf-8");
        let explanationText = "";

        setCoverageExplanation({ source: "gemini_live", explanation: "" });

        while (reader) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const dataStr = line.slice(6).trim();
              if (dataStr === "[DONE]") {
                break;
              }
              try {
                const dataObj = JSON.parse(dataStr);
                if (dataObj.error) {
                  setCoverageExplanation({
                    source: "error",
                    error: dataObj.error,
                    reason: dataObj.code === "UNSAFE_ALERT" || dataObj.code === "REJECTED" ? "safety_block" : "api_error",
                  });
                  return;
                }

                if (dataObj.chunk) {
                  explanationText += dataObj.chunk;
                  setCoverageExplanation({
                    source: "gemini_live",
                    explanation: explanationText,
                    generatedAt: dataObj.generatedAt,
                  });
                }

                if (dataObj.done) {
                  setCoverageExplanation({
                    source: "gemini_live",
                    explanation: explanationText,
                    generatedAt: dataObj.generatedAt,
                  });
                }
              } catch {
                // Ignore parsing errors on split chunks
              }
            }
          }
        }
      } else {
        const data = await res.json();
        setCoverageExplanation(data);
      }
    } catch (err) {
      console.error("[PillMind Coverage Engine] Error:", err);
      setCoverageExplanation({
        source: "error",
        error: "Canlı AI kombinasyon analizi şu anda oluşturulamadı. Lütfen daha sonra tekrar deneyin.",
        reason: "api_error",
      });
    } finally {
      setIsCoverageLoading(false);
    }
  };

  return {
    interactions,
    setInteractions,
    accumulationWarnings,
    foodInteractions,
    setFoodInteractions,
    contraindications,
    setContraindications,
    polypharmacyReport,
    setPolypharmacyReport,
    isChecking,
    checkingError,
    explanations,
    loadingExplanations,
    coverageExplanation,
    setCoverageExplanation,
    isCoverageLoading,
    showCoveragePanel,
    setShowCoveragePanel,
    isOffline,
    handleExplainRequested,
    handleRequestCoverageExplanation,
  };
}
