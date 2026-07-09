import { useState, useEffect } from "react";
import { useInteractionExplanations } from "./useInteractionExplanations";
import { useCoverageExplanation } from "./useCoverageExplanation";
import { CheckResult, AccumulationWarning, ExplanationData } from "@/lib/interactions";

export function useInteractions(selectedDrugIds: string[], patientContext?: any) {
  const [interactions, setInteractions] = useState<CheckResult[]>([]);
  const [accumulationWarnings, setAccumulationWarnings] = useState<AccumulationWarning[]>([]);
  const [foodInteractions, setFoodInteractions] = useState<any[]>([]);
  const [contraindications, setContraindications] = useState<any[]>([]);
  const [polypharmacyReport, setPolypharmacyReport] = useState<any | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [checkingError, setCheckingError] = useState<string | null>(null);

  const { explanations, loadingExplanations, handleExplainRequested } = useInteractionExplanations();
  const {
    coverageExplanation,
    setCoverageExplanation,
    isCoverageLoading,
    showCoveragePanel,
    setShowCoveragePanel,
    handleRequestCoverageExplanation,
  } = useCoverageExplanation(selectedDrugIds);


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
