import drugsData from "@/data/drugs.json";
import interactionsData from "@/data/interactions.json";

export interface Drug {
  id: string;
  name: string;
  activeIngredient: string;
  category: string;
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
}

export interface CheckResult {
  interaction: Interaction;
  drug1Name: string;
  drug2Name: string;
}

const SEVERITY_LABELS: Record<string, string> = {
  high: "Potansiyel Önemli Etkileşim",
  medium: "Dikkat Edilmesi Gereken Etkileşim",
  low: "Olası Hafif Etkileşim / İzlem Önerisi",
};

const SEVERITY_COLORS: Record<
  string,
  {
    bg: string;
    border: string;
    badge: string;
    text: string;
  }
> = {
  high: {
    bg: "bg-red-50",
    border: "border-red-300",
    badge: "bg-red-600 text-white",
    text: "text-red-800",
  },
  medium: {
    bg: "bg-amber-50",
    border: "border-amber-300",
    badge: "bg-amber-500 text-white",
    text: "text-amber-800",
  },
  low: {
    bg: "bg-green-50",
    border: "border-green-300",
    badge: "bg-green-600 text-white",
    text: "text-green-800",
  },
};

// ---------------------------------------------------------------------------
// Indexed Data for O(1) Lookups
// ---------------------------------------------------------------------------

const DRUGS_MAP: Record<string, Drug> = Object.fromEntries(
  (drugsData as Drug[]).map((d) => [d.id, d])
);

/**
 * Interactions indexed by both possible ID pairings in a nested object.
 * This allows O(1) lookups without string concatenation or Map overhead.
 */
const INTERACTIONS_BY_DRUGS: Record<string, Record<string, Interaction>> = {};
(interactionsData as Interaction[]).forEach((int) => {
  if (!INTERACTIONS_BY_DRUGS[int.drug1]) INTERACTIONS_BY_DRUGS[int.drug1] = {};
  if (!INTERACTIONS_BY_DRUGS[int.drug2]) INTERACTIONS_BY_DRUGS[int.drug2] = {};
  INTERACTIONS_BY_DRUGS[int.drug1][int.drug2] = int;
  INTERACTIONS_BY_DRUGS[int.drug2][int.drug1] = int;
});

/**
 * Returns all drugs from the curated dataset.
 */
export function getAllDrugs(): Drug[] {
  return drugsData as Drug[];
}

/**
 * Given a list of drug IDs, finds all known interactions between them.
 * Decision comes from curated data — NOT from an LLM.
 */
export function findInteractions(drugIds: string[]): CheckResult[] {
  const results: CheckResult[] = [];

  for (let i = 0; i < drugIds.length; i++) {
    const a = drugIds[i];
    const interactionsForA = INTERACTIONS_BY_DRUGS[a];
    if (!interactionsForA) continue;

    for (let j = i + 1; j < drugIds.length; j++) {
      const b = drugIds[j];
      const match = interactionsForA[b];

      if (match) {
        const drug1 = DRUGS_MAP[match.drug1];
        const drug2 = DRUGS_MAP[match.drug2];
        results.push({
          interaction: match,
          drug1Name: drug1?.name ?? match.drug1,
          drug2Name: drug2?.name ?? match.drug2,
        });
      }
    }
  }

  return results;
}

/**
 * Severity label mapping for UI display (safe language)
 */
export function getSeverityLabel(severity: string): string {
  return SEVERITY_LABELS[severity] || "Bilgi mevcut değil";
}

export function getSeverityColor(severity: string): {
  bg: string;
  border: string;
  badge: string;
  text: string;
} {
  return (
    SEVERITY_COLORS[severity] || {
      bg: "bg-gray-50",
      border: "border-gray-300",
      badge: "bg-gray-500 text-white",
      text: "text-gray-700",
    }
  );
}
