import drugsData from "@/data/drugs.json";
import interactionsData from "@/data/interactions.json";
import foodInteractionsData from "@/data/foodInteractions.json";
import contraindicationsData from "@/data/contraindications.json";

import {
  Drug,
  RawInteraction,
  Interaction,
  RawContraindication,
  FoodInteraction,
} from "./types";

/**
 * Returns all drugs from the curated dataset (Synchronous - for UI rendering and search).
 */
export function getAllDrugs(): Drug[] {
  return drugsData as Drug[];
}

export const DRUG_ALIASES: Record<string, string> = {
  coraspin: "aspirin", ecopirin: "aspirin", aspirin: "aspirin",
  parol: "parasetamol", calpol: "parasetamol", tylol: "parasetamol", parasetamol: "parasetamol",
  nurofen: "ibuprofen", dolorex: "ibuprofen", advil: "ibuprofen", ibuprofen: "ibuprofen",
  coumadin: "warfarin", warfarin: "warfarin",
  metformin: "metformin", enalapril: "enalapril", amoksisilin: "amoksisilin",
  omeprazol: "omeprazol", diklofenak: "diklofenak", metoprolol: "metoprolol"
};

// Pre-compute O(1) lookups at module initialization
export const drugsMap = new Map<string, Drug>();
for (const d of drugsData as Drug[]) {
  drugsMap.set(d.id, d);
}

export const contraindicationsMap = new Map<string, Map<string, RawContraindication[]>>();
for (const contra of (contraindicationsData as RawContraindication[])) {
  let diseaseMap = contraindicationsMap.get(contra.drugId);
  if (!diseaseMap) {
    diseaseMap = new Map<string, RawContraindication[]>();
    contraindicationsMap.set(contra.drugId, diseaseMap);
  }
  let contras = diseaseMap.get(contra.diseaseIcd);
  if (!contras) {
    contras = [];
    diseaseMap.set(contra.diseaseIcd, contras);
  }
  contras.push(contra);
}

export const interactionsMap = new Map<string, Map<string, Interaction>>();
for (const int of (interactionsData as RawInteraction[])) {
  const mappedInt: Interaction = {
    ...int,
    severity: int.severity.toLowerCase() as "high" | "medium" | "low",
    evidenceLevel: int.evidenceLevel ? int.evidenceLevel.toLowerCase() : "fda_approved",
    clinicalDetail: int.clinicalDetail || `${int.drug1} ve ${int.drug2} kombinasyonu yan etkilere yol açabilir. Kaynak: ${int.source}`
  };
  if (!interactionsMap.has(mappedInt.drug1)) interactionsMap.set(mappedInt.drug1, new Map<string, Interaction>());
  interactionsMap.get(mappedInt.drug1)!.set(mappedInt.drug2, mappedInt);

  if (!interactionsMap.has(mappedInt.drug2)) interactionsMap.set(mappedInt.drug2, new Map<string, Interaction>());
  interactionsMap.get(mappedInt.drug2)!.set(mappedInt.drug1, mappedInt);
}

export const foodInteractionsMap = new Map<string, FoodInteraction[]>();
for (const foodInt of (foodInteractionsData as FoodInteraction[])) {
  let list = foodInteractionsMap.get(foodInt.drugId);
  if (!list) {
    list = [];
    foodInteractionsMap.set(foodInt.drugId, list);
  }
  list.push(foodInt);
}

export function getDrugsByIds(ids: string[]): Drug[] {
  const result: Drug[] = [];
  for (const id of ids) {
    const drug = drugsMap.get(id);
    if (drug) {
      result.push(drug);
    }
  }
  return result;
}
