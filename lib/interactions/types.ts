export interface Drug {
  id: string;
  name: string;
  activeIngredient: string;
  category: string;
  pharmacologicalGroup?: string | null;
}

export interface RawInteraction {
  id: string;
  drug1: string;
  drug2: string;
  severity: string;
  summary: string;
  source: string;
  sourceLabel?: string;
  verificationStatus?: string;
  evidenceLevel?: string;
  clinicalDetail?: string;
}

export interface RawContraindication {
  id: string;
  drugId: string;
  diseaseIcd: string;
  diseaseName: string;
  severity: string;
  effect: string;
}

export interface Evidence {
  source: {
    id?: string;
    title: string;
    url?: string;
  };
  evidenceLevel?: string;
  summary: string;
}

export interface InteractionMechanism {
  type: string;
  mechanism: string;
  pharmacokinetic?: boolean;
  pharmacodynamic?: boolean;
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
  mechanisms?: InteractionMechanism[];
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

export interface ExplanationData {
  explanation?: string;
  source?: string;
  generatedAt?: string;
  reason?: string;
  error?: string;
}

export interface DrugClinicalMetadata {
  pregnancyCategory: string;
  pregnancyNote: string;
  breastfeedingNote: string;
  renalNote: string;
  hepaticNote: string;
}

export interface FoodInteraction {
  id: string;
  drugId: string;
  substance: string;
  effect: string;
  severity: string;
}

export interface FoodInteractionResult {
  id: string;
  drugId: string;
  drugName: string;
  substance: string;
  effect: string;
  severity: "high" | "medium" | "low";
}

export interface PatientContext {
  ageGroup?: "adult" | "elderly" | "child";
  isPregnant?: boolean;
  isBreastfeeding?: boolean;
  renalRisk?: boolean;
  hepaticRisk?: boolean;
  diseases?: string[];
}

export interface ContraindicationResult {
  id: string;
  drugId: string;
  drugName: string;
  type: "disease" | "pregnancy" | "breastfeeding" | "renal" | "hepatic";
  severity: "high" | "medium" | "low";
  message: string;
  diseaseIcd?: string;
  diseaseName?: string;
}

export interface PolypharmacyReport {
  score: number;
  level: "low" | "medium" | "high";
  message: string;
  beersWarnings: string[];
}
