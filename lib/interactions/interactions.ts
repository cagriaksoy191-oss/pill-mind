import { Drug, Interaction, CheckResult } from "./types";
import { drugsMap, interactionsMap } from "./data";

const inFlightResolveMap = new Map<string, Promise<Drug[]>>();

export async function resolveDrugsDB(drugIds: string[]): Promise<Drug[]> {
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes("[SIFRE]")) {
    return [];
  }

  const cacheKey = [...drugIds].sort().join(",");

  if (inFlightResolveMap.has(cacheKey)) {
    return inFlightResolveMap.get(cacheKey)!;
  }

  const resolvePromise = (async () => {
    const { prisma } = await import("@/lib/prisma");
    return await prisma.drug.findMany({
      where: {
        OR: [
          { id: { in: drugIds } },
          { name: { in: drugIds } },
          { brandNames: { some: { name: { in: drugIds } } } },
          { aliases: { some: { alias: { in: drugIds } } } },
          { aliases: { some: { normalizedAlias: { in: drugIds } } } }
        ]
      }
    });
  })();

  inFlightResolveMap.set(cacheKey, resolvePromise);

  try {
    const result = await resolvePromise;
    setTimeout(() => {
      inFlightResolveMap.delete(cacheKey);
    }, 50);
    return result;
  } catch (error) {
    inFlightResolveMap.delete(cacheKey);
    throw error;
  }
}

function formatInteractionResult(match: Interaction): CheckResult {
  const drug1 = drugsMap.get(match.drug1);
  const drug2 = drugsMap.get(match.drug2);
  return {
    interaction: match,
    drug1Name: drug1?.name ?? match.drug1,
    drug2Name: drug2?.name ?? match.drug2,
  };
}

export function findInteractions(drugIds: string[]): CheckResult[] {
  if (!Array.isArray(drugIds) || drugIds.length < 2) {
    return [];
  }

  const results: CheckResult[] = [];
  const len = drugIds.length;

  for (let i = 0; i < len; i++) {
    const mapA = interactionsMap.get(drugIds[i]);
    if (mapA) {
      for (let j = i + 1; j < len; j++) {
        const match = mapA.get(drugIds[j]);
        if (match) {
          results.push(formatInteractionResult(match));
        }
      }
    }
  }

  return results;
}

/**
 * Production-ready asynchronous N-Drug check using PostgreSQL database via Prisma.
 * Falls back to local JSON if the database URL is not configured or fails.
 */
export async function findInteractionsDB(drugIds: string[], resolvedDrugsCache?: unknown[]): Promise<CheckResult[]> {
  // Eğer veritabanı bağlantısı yoksa doğrudan lokal kontrole yönlendir
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes("[SIFRE]")) {
    console.info("[PillMind CMIO Engine] DATABASE_URL tanımlı değil veya şablon halinde. Lokal JSON kontrolü yapılıyor.");
    return findInteractions(drugIds);
  }

  try {
    const { prisma } = await import("@/lib/prisma");

    // 1. İlaçları ve Marka/Alias adlarını çöz
    let resolvedDrugs = resolvedDrugsCache as Drug[];
    if (!resolvedDrugsCache || !Array.isArray(resolvedDrugsCache) || resolvedDrugsCache.length === 0) {
      resolvedDrugs = await resolveDrugsDB(drugIds);
    }

    const resolvedDrugIds = resolvedDrugs.map((d) => d.id);

    // 2. Tek bir veritabanı sorgusuyla seçilen ilaçlar arasındaki tüm olası etkileşimleri çek
    const dbInteractions = await prisma.drugInteraction.findMany({
      where: {
        drug1Id: { in: resolvedDrugIds },
        drug2Id: { in: resolvedDrugIds }
      },
      include: {
        evidences: {
          include: {
            source: true
          }
        },
        mechanisms: true
      }
    });

    const results: CheckResult[] = [];

    // Create a Map for O(1) lookups
    const resolvedDrugsMap = new Map<string, Drug>();
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
            clinicalDetail: match.clinicalDetail ?? undefined,
            source: match.source,
            sourceLabel: match.sourceLabel,
            verificationStatus: match.verificationStatus.toLowerCase(),
            evidenceLevel: match.evidenceLevel ? match.evidenceLevel.toLowerCase() : "fda_approved",
            evidences: match.evidences,
            mechanisms: match.mechanisms
          },
          drug1Name: drugA.name,
          drug2Name: drugB.name
        });
      }
    }

    console.info(`[PillMind CMIO Engine] Veritabanı sorgusu başarılı (1 roundtrip). ${results.length} etkileşim bulundu.`);
    return results;
  } catch (error) {
    console.error("[PillMind CMIO Engine] Veritabanı sorgusu başarısız oldu! Lokal yedek kontrol devreye alınıyor:", error);
    // Güvenlik fallback katmanı: Hata durumunda sistem çökmez, lokal mock veriye döner
    return findInteractions(drugIds);
  }
}
