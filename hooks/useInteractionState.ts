import { useState, useCallback } from "react";
import { CheckResult, AccumulationWarning, FoodInteractionResult, ContraindicationResult, PolypharmacyReport } from "@/lib/interactions";

export function useInteractionState() {
  const [interactions, setInteractions] = useState<CheckResult[]>([]);
  const [accumulationWarnings, setAccumulationWarnings] = useState<AccumulationWarning[]>([]);
  const [foodInteractions, setFoodInteractions] = useState<FoodInteractionResult[]>([]);
  const [contraindications, setContraindications] = useState<ContraindicationResult[]>([]);
  const [polypharmacyReport, setPolypharmacyReport] = useState<PolypharmacyReport | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [checkingError, setCheckingError] = useState<string | null>(null);

  const resetState = useCallback(() => {
    setInteractions([]);
    setAccumulationWarnings([]);
    setFoodInteractions([]);
    setContraindications([]);
    setPolypharmacyReport(null);
    setCheckingError(null);
  }, []);

  const applyResults = useCallback((data: { interactions?: CheckResult[], accumulationWarnings?: AccumulationWarning[], foodInteractions?: FoodInteractionResult[], contraindications?: ContraindicationResult[], polypharmacyReport?: PolypharmacyReport | null }) => {
    setInteractions(data.interactions || []);
    setAccumulationWarnings(data.accumulationWarnings || []);
    setFoodInteractions(data.foodInteractions || []);
    setContraindications(data.contraindications || []);
    setPolypharmacyReport(data.polypharmacyReport || null);
  }, []);

  return {
    interactions, setInteractions,
    accumulationWarnings, setAccumulationWarnings,
    foodInteractions, setFoodInteractions,
    contraindications, setContraindications,
    polypharmacyReport, setPolypharmacyReport,
    isChecking, setIsChecking,
    checkingError, setCheckingError,
    resetState, applyResults
  };
}
