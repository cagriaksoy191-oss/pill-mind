import { useEffect } from "react";
import { useInteractionState } from "./useInteractionState";
import { useOfflineStatus } from "./useOfflineStatus";
import { useInteractionExplanations } from "./useInteractionExplanations";
import { useCoverageExplanation } from "./useCoverageExplanation";
import { PatientContext } from "@/lib/interactions";


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
  const state = useInteractionState();

  const { explanations, loadingExplanations, handleExplainRequested } = useInteractionExplanations();
  const {
    coverageExplanation,
    setCoverageExplanation,
    isCoverageLoading,
    showCoveragePanel,
    setShowCoveragePanel,
    handleRequestCoverageExplanation,
  } = useCoverageExplanation(selectedDrugIds);


  const isOffline = useOfflineStatus();

  const serializedContext = JSON.stringify(patientContext);



  // Automatically check interactions when selected drugs change
  useEffect(() => {
    const checkInteractions = async () => {
      if (selectedDrugIds.length < 2) {
        state.resetState();
        setCoverageExplanation(null);
        setShowCoveragePanel(false);
        return;
      }

      state.setIsChecking(true);
      state.setCheckingError(null);
      try {
        const data = await fetchApiInteractions(selectedDrugIds, patientContext);
        state.applyResults(data);
      } catch (err) {
        console.warn("[PillMind Check Engine] Sunucu API hatası veya ağ kaybı, çevrimdışı yerel tarama çekirdeği devreye alınıyor:", err);
        try {
          const localData = await fetchLocalInteractions(selectedDrugIds, patientContext);
          state.applyResults(localData);
          state.setCheckingError(null);
        } catch (localErr) {
          console.error("Local fallback failed:", localErr);
          state.setCheckingError("Bağlantı hatası: Yerel çevrimdışı tarama motoru yüklenemedi.");
        }
      } finally {
        state.setIsChecking(false);
      }
    };

    checkInteractions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDrugIds, serializedContext]); // Omitting complex object dependencies to prevent infinite loop


  return {
    interactions: state.interactions,
    setInteractions: state.setInteractions,
    accumulationWarnings: state.accumulationWarnings,
    foodInteractions: state.foodInteractions,
    setFoodInteractions: state.setFoodInteractions,
    contraindications: state.contraindications,
    setContraindications: state.setContraindications,
    polypharmacyReport: state.polypharmacyReport,
    setPolypharmacyReport: state.setPolypharmacyReport,
    isChecking: state.isChecking,
    checkingError: state.checkingError,
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
