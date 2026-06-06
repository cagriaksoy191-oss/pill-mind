// lib/interactions.ts
import drugsData from "@/data/drugs.json";
import interactionsData from "@/data/interactions.json";
import { redis } from "@/lib/redis";

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


export interface ExplanationData {
  explanation?: string;
  source?: string;
  generatedAt?: string;
  reason?: string;
  error?: string;
}

export interface CheckResult {
  interaction: Interaction;
  drug1Name: string;
  drug2Name: string;
}

/**
 * Returns all drugs from the curated dataset (Synchronous - for UI rendering and search).
 */
export function getAllDrugs(): Drug[] {
  return drugsData as Drug[];
}

// Pre-compute O(1) lookups at module initialization
const drugsMap = new Map<string, Drug>();
for (const d of drugsData as Drug[]) {
  drugsMap.set(d.id, d);
}

const interactionsMap = new Map<string, Map<string, Interaction>>();
for (const int of interactionsData as Interaction[]) {
  if (!interactionsMap.has(int.drug1))
    interactionsMap.set(int.drug1, new Map<string, Interaction>());
  interactionsMap.get(int.drug1)!.set(int.drug2, int);

  if (!interactionsMap.has(int.drug2))
    interactionsMap.set(int.drug2, new Map<string, Interaction>());
  interactionsMap.get(int.drug2)!.set(int.drug1, int);
}

/**
 * Deterministic N-Drug interaction check using local JSON files (Fallback layer).
 */
export function findInteractions(drugIds: string[]): CheckResult[] {
  if (!Array.isArray(drugIds) || drugIds.length < 2) {
    return [];
  }
  const results: CheckResult[] = [];

  for (let i = 0; i < drugIds.length; i++) {
    const a = drugIds[i];
    const mapA = interactionsMap.get(a);

    if (!mapA) continue;

    for (let j = i + 1; j < drugIds.length; j++) {
      const b = drugIds[j];

      const match = mapA.get(b);

      if (match) {
        const drug1 = drugsMap.get(match.drug1);
        const drug2 = drugsMap.get(match.drug2);
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
 * Production-ready asynchronous N-Drug check using PostgreSQL database via Prisma.
 * Falls back to local JSON if the database URL is not configured or fails.
 */
export async function findInteractionsDB(
  drugIds: string[],
): Promise<CheckResult[]> {
  // Eğer veritabanı bağlantısı yoksa doğrudan lokal kontrole yönlendir
  if (
    !process.env.DATABASE_URL ||
    process.env.DATABASE_URL.includes("[SIFRE]")
  ) {
    console.info(
      "[PillMind CMIO Engine] DATABASE_URL tanımlı değil veya şablon halinde. Lokal JSON kontrolü yapılıyor.",
    );
    return findInteractions(drugIds);
  }

  const cacheKey = `interactions_db:${[...drugIds].sort().join(",")}`;

  // Check Redis cache if available
  if (redis) {
    try {
      const cached = await redis.get<CheckResult[]>(cacheKey);
      if (cached) {
        return cached;
      }
    } catch (err) {
      console.warn("[PillMind CMIO Engine] Redis cache read error:", err);
    }
  }

  try {
    const { prisma } = await import("@/lib/prisma");

    // 1. İlaçları ve Marka adlarını çöz
    const resolvedDrugs = await prisma.drug.findMany({
      where: {
        OR: [
          { id: { in: drugIds } },
          { name: { in: drugIds } },
          { brandNames: { some: { name: { in: drugIds } } } },
        ],
      },
    });

    const resolvedDrugIds = resolvedDrugs.map((d) => d.id);

    // 2. Tek bir veritabanı sorgusuyla seçilen ilaçlar arasındaki tüm olası etkileşimleri çek
    const dbInteractions = await prisma.drugInteraction.findMany({
      where: {
        drug1Id: { in: resolvedDrugIds },
        drug2Id: { in: resolvedDrugIds },
      },
    });

    const results: CheckResult[] = [];

    // Create a Map for O(1) lookups
    const resolvedDrugsMap = new Map();
    for (const drug of resolvedDrugs) {
      resolvedDrugsMap.set(drug.id, drug);
    }

    // 3. Eşleşen etkileşimlerin detaylarını hastaya sunulmak üzere haritalandır
    for (const match of dbInteractions) {
      const drugA = resolvedDrugsMap.get(match.drug1Id);
      const drugB = resolvedDrugsMap.get(match.drug2Id);

      if (drugA && drugB) {
        results.push({
          interaction: {
            id: match.id,
            drug1: match.drug1Id,
            drug2: match.drug2Id,
            severity: match.severity.toLowerCase() as "high" | "medium" | "low",
            summary: match.summary,
            source: match.source,
            sourceLabel: match.sourceLabel,
            verificationStatus: match.verificationStatus.toLowerCase(),
          },
          drug1Name: drugA.name,
          drug2Name: drugB.name,
        });
      }
    }

    // Cache the results in Redis
    if (redis) {
      try {
        // Cache for 24 hours (86400 seconds)
        await redis.setex(cacheKey, 86400, results);
      } catch (err) {
        console.warn("[PillMind CMIO Engine] Redis cache write error:", err);
      }
    }

    console.info(
      `[PillMind CMIO Engine] Veritabanı sorgusu başarılı (1 roundtrip). ${results.length} etkileşim bulundu.`,
    );
    return results;
  } catch (error) {
    console.error(
      "[PillMind CMIO Engine] Veritabanı sorgusu başarısız oldu! Lokal yedek kontrol devreye alınıyor:",
      error,
    );
    // Güvenlik fallback katmanı: Hata durumunda sistem çökmez, lokal mock veriye döner
    return findInteractions(drugIds);
  }
}

/**
 * Severity label mapping for UI display (safe language in Turkish)
 */
export function getSeverityLabel(severity: string): string {
  switch (severity) {
    case "high":
      return "Potansiyel Önemli Etkileşim";
    case "medium":
      return "Dikkat Edilmesi Gereken Etkileşim";
    case "low":
      return "Olası Hafif Etkileşim / İzlem Önerisi";
    default:
      return "Bilgi mevcut değil";
  }
}

export function getSeverityColor(severity: string): {
  bg: string;
  border: string;
  badge: string;
  text: string;
} {
  switch (severity) {
    case "high":
      return {
        bg: "bg-red-50",
        border: "border-red-300",
        badge: "bg-red-600 text-white",
        text: "text-red-800",
      };
    case "medium":
      return {
        bg: "bg-amber-50",
        border: "border-amber-300",
        badge: "bg-amber-500 text-white",
        text: "text-amber-800",
      };
    case "low":
      return {
        bg: "bg-green-50",
        border: "border-green-300",
        badge: "bg-green-600 text-white",
        text: "text-green-800",
      };
    default:
      return {
        bg: "bg-gray-50",
        border: "border-gray-300",
        badge: "bg-gray-500 text-white",
        text: "text-gray-700",
      };
  }
}
