import { Evidence, ContraindicationResult } from "@/lib/interactions";

export interface Drug {
  id: string;
  name: string;
  activeIngredient: string;
  category: string;
  pharmacologicalGroup?: string;
}

export interface Interaction {
  id: string;
  drug1: string;
  drug2: string;
  severity: "high" | "medium" | "low";
  summary: string;
  source: string;
  sourceLabel?: string;
  verificationStatus?: string;
  evidenceLevel?: string;
  clinicalDetail?: string;
  evidences?: Evidence[];
  mechanisms?: { type: string; mechanism: string; pharmacokinetic?: boolean; pharmacodynamic?: boolean; }[];
}

export interface CheckResult {
  interaction: Interaction;
  drug1Name: string;
  drug2Name: string;
}

export interface AccumulationWarning {
  type: "active_ingredient" | "pharmacological_group";
  severity: "high" | "medium";
  message: string;
  triggerDrugs: string[];
  detail?: string;
}

export interface FoodInteraction {
  id: string;
  drugId: string;
  drugName: string;
  substance: string;
  effect: string;
  severity: "high" | "medium" | "low";
}

export interface SharedData {
  success: boolean;
  token: string;
  drugIds: string[];
  drugs: Drug[];
  interactions: CheckResult[];
  accumulationWarnings: AccumulationWarning[];
  foodInteractions: FoodInteraction[];
  contraindications: ContraindicationResult[];
  createdAt: string;
  expiresAt: string;
}
