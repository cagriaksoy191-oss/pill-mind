import { useState, useEffect, useCallback } from "react";
import { CheckResult } from "@/lib/interactions";

export function useInteractions(selectedDrugIds: string[]) {
  const [interactions, setInteractions] = useState<CheckResult[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [checkingError, setCheckingError] = useState<string | null>(null);

  // Individual interaction explanation states
  const [explanations, setExplanations] = useState<Record<string, any>>({});
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
      } catch (err: any) {
        console.warn("[PillMind Check Engine] Sunucu API hatası veya ağ kaybı, çevrimdışı yerel tarama çekirdeği devreye alınıyor:", err);
        try {
          const { findInteractions } = await import("@/lib/interactions");
          const localResults = findInteractions(selectedDrugIds);
          setInteractions(localResults);
          setCheckingError(null);
        } catch (localErr) {
          setCheckingError("Bağlantı hatası: Yerel çevrimdışı tarama motoru yüklenemedi.");
        }
      } finally {
        setIsChecking(false);
      }
    };

    checkInteractions();
  }, [selectedDrugIds]);

  // Request detailed explanation for a single interaction card
  const handleExplainRequested = useCallback(async (interactionId: string, force: boolean) => {
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
    } catch (err: any) {
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
    } catch (err: any) {
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
