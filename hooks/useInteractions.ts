import { useState, useEffect } from "react";
import { useInteractionExplanations } from "./useInteractionExplanations";
import { useCoverageExplanation } from "./useCoverageExplanation";
import { CheckResult, AccumulationWarning, FoodInteractionResult, ContraindicationResult, PolypharmacyReport, PatientContext } from "@/lib/interactions";


const fetchApiInteractions = async (drugIds: string[], patientContext: PatientContext | undefined) => {
  const res = await fetch("/api/check", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ drugIds, patientContext }),
  });

  if (!res.ok) {
    throw new Error("Etkileşim taraması yapılırken sunucu hatası oluştu.");
  }

  return await res.json();
};

const fetchLocalInteractions = async (drugIds: string[], patientContext: PatientContext | undefined) => {
  const { findInteractions, checkAccumulation, findFoodInteractions, findContraindications, checkPolypharmacyAndBeers } = await import("@/lib/interactions");
  return {
    interactions: findInteractions(drugIds),
    accumulationWarnings: checkAccumulation(drugIds),
    foodInteractions: findFoodInteractions(drugIds),
    contraindications: findContraindications(drugIds, patientContext),
    polypharmacyReport: checkPolypharmacyAndBeers(drugIds, patientContext),
  };
};

export function useInteractions(selectedDrugIds: string[], patientContext?: PatientContext) {
  const [interactions, setInteractions] = useState<CheckResult[]>([]);
  const [accumulationWarnings, setAccumulationWarnings] = useState<AccumulationWarning[]>([]);
  const [foodInteractions, setFoodInteractions] = useState<FoodInteractionResult[]>([]);
  const [contraindications, setContraindications] = useState<ContraindicationResult[]>([]);
  const [polypharmacyReport, setPolypharmacyReport] = useState<PolypharmacyReport | null>(null);
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

  const resetState = () => {
    setInteractions([]);
    setAccumulationWarnings([]);
    setFoodInteractions([]);
    setContraindications([]);
    setPolypharmacyReport(null);
    setCoverageExplanation(null);
    setShowCoveragePanel(false);
    setCheckingError(null);
  };

  const applyResults = (data: { interactions?: CheckResult[], accumulationWarnings?: AccumulationWarning[], foodInteractions?: FoodInteractionResult[], contraindications?: ContraindicationResult[], polypharmacyReport?: PolypharmacyReport | null }) => {
    setInteractions(data.interactions || []);
    setAccumulationWarnings(data.accumulationWarnings || []);
    setFoodInteractions(data.foodInteractions || []);
    setContraindications(data.contraindications || []);
    setPolypharmacyReport(data.polypharmacyReport || null);
  };

  // Automatically check interactions when selected drugs change
  useEffect(() => {
    const checkInteractions = async () => {
      if (selectedDrugIds.length < 2) {
        resetState();
        return;
      }

      setIsChecking(true);
      setCheckingError(null);
      try {
        const data = await fetchApiInteractions(selectedDrugIds, patientContext);
        applyResults(data);
      } catch (err) {
        console.warn("[PillMind Check Engine] Sunucu API hatası veya ağ kaybı, çevrimdışı yerel tarama çekirdeği devreye alınıyor:", err);
        try {
          const localData = await fetchLocalInteractions(selectedDrugIds, patientContext);
          applyResults(localData);
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
