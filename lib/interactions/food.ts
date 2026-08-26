import { Drug, FoodInteraction, FoodInteractionResult } from "./types";
import { drugsMap, DRUG_ALIASES } from "./data";
import { resolveDrugsDB } from "./interactions";
import foodInteractionsData from "@/data/foodInteractions.json";

const resolveCache = new Map<string, string>();
const MAX_CACHE_SIZE = 5000;

function resolveDrugIds(drugIds: string[]): Set<string> {
  const resolvedIds = new Set<string>();
  for (const idOrName of drugIds) {
    if (drugsMap.has(idOrName)) {
      resolvedIds.add(idOrName);
      continue;
    }

    let canonicalId = resolveCache.get(idOrName);
    if (canonicalId === undefined) {
      if (resolveCache.size >= MAX_CACHE_SIZE) {
        resolveCache.clear();
      }
      const lower = idOrName.toLowerCase().trim();
      canonicalId = DRUG_ALIASES[lower] || "";
      resolveCache.set(idOrName, canonicalId);
    }
    if (canonicalId !== "") {
      resolvedIds.add(canonicalId);
    }
  }
  return resolvedIds;
}

export function findFoodInteractions(drugIds: string[]): FoodInteractionResult[] {
  const resolvedIds = resolveDrugIds(drugIds);

  const results: FoodInteractionResult[] = [];
  for (const foodInt of (foodInteractionsData as FoodInteraction[])) {
    if (resolvedIds.has(foodInt.drugId)) {
      const drug = drugsMap.get(foodInt.drugId);
      results.push({
        id: foodInt.id,
        drugId: foodInt.drugId,
        drugName: drug?.name ?? foodInt.drugId,
        substance: foodInt.substance,
        effect: foodInt.effect,
        severity: foodInt.severity.toLowerCase() as "high" | "medium" | "low"
      });
    }
  }
  return results;
}

export async function findFoodInteractionsDB(drugIds: string[], resolvedDrugsCache?: unknown[]): Promise<FoodInteractionResult[]> {
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes("[SIFRE]")) {
    return findFoodInteractions(drugIds);
  }
  try {
    const { prisma } = await import("@/lib/prisma");
    let resolvedDrugs = resolvedDrugsCache as Drug[];
    if (!resolvedDrugsCache || !Array.isArray(resolvedDrugsCache) || resolvedDrugsCache.length === 0) {
      resolvedDrugs = await resolveDrugsDB(drugIds);
    }
    const resolvedDrugIds = resolvedDrugs.map(d => d.id);
    const foodInts = await prisma.foodInteraction.findMany({
      where: {
        drugId: { in: resolvedDrugIds }
      },
      include: {
        drug: true
      }
    });
    return foodInts.map(f => ({
      id: f.id,
      drugId: f.drugId,
      drugName: f.drug.name,
      substance: f.substance,
      effect: f.effect,
      severity: f.severity.toLowerCase() as "high" | "medium" | "low"
    }));
  } catch (error) {
    console.error("[PillMind CMIO Engine] Food interactions DB query failed, using local fallback:", error);
    return findFoodInteractions(drugIds);
  }
}
