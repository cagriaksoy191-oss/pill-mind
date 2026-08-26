import interactionsData from "@/data/interactions.json";
import drugsData from "@/data/drugs.json";
import {
  DrugRecord,
  InteractionRecord,
  InteractionContext,
  CoverageContext,
} from "./types";
import { getGeminiApiKey, isDemoMode } from "./config";

// Pre-compute O(1) lookups at module initialization
const drugsMap = new Map<string, DrugRecord>();
for (const d of drugsData as DrugRecord[]) {
  drugsMap.set(d.id, d);
}

const interactionsMap = new Map<string, InteractionRecord>();
for (const int of interactionsData as InteractionRecord[]) {
  interactionsMap.set(int.id, int);
}

export async function getInteractionContext(
  interactionId: string
): Promise<InteractionContext | null> {
  // 1. Validasyon
  if (!interactionId || typeof interactionId !== "string" || interactionId.length > 100) {
    return null;
  }

  let interaction: InteractionRecord | null = null;

  const staticInt = interactionsMap.get(interactionId);
  if (staticInt) {
    interaction = staticInt;
  } else {
    // If not in static JSON, look up the database UUID
    if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("[SIFRE]")) {
      try {
        const { prisma } = await import("@/lib/prisma");
        const dbMatch = await prisma.drugInteraction.findUnique({
          where: { id: interactionId },
          include: {
            evidences: {
              include: {
                source: true,
              },
            },
            mechanisms: true,
          },
        });
        if (dbMatch) {
          interaction = {
            id: dbMatch.id,
            drug1: dbMatch.drug1Id,
            drug2: dbMatch.drug2Id,
            severity: dbMatch.severity.toLowerCase(),
            summary: dbMatch.summary,
            source: dbMatch.source,
            evidences: dbMatch.evidences,
            mechanisms: dbMatch.mechanisms,
          };
        }
      } catch (err) {
        console.warn("[getInteractionContext] Database lookup failed:", err);
      }
    }
  }

  if (!interaction) return null;

  const drug1 = drugsMap.get(interaction.drug1);
  const drug2 = drugsMap.get(interaction.drug2);

  return {
    interaction,
    drug1Name: drug1?.name ?? interaction.drug1,
    drug2Name: drug2?.name ?? interaction.drug2,
    drug1Ingredient: drug1?.activeIngredient ?? "",
    drug2Ingredient: drug2?.activeIngredient ?? "",
  };
}

export function getCoverageContext(drugIds: string[]): CoverageContext | null {
  const selected = drugIds
    .map((id) => drugsMap.get(id))
    .filter((drug): drug is DrugRecord => Boolean(drug));

  if (selected.length < 2) {
    return null;
  }

  return {
    drugNames: selected.map((d) => d.name),
    drugIngredients: selected.map((d) => d.activeIngredient),
  };
}

export function shouldUseFallback(): boolean {
  return isDemoMode() || !getGeminiApiKey();
}
