import { NextRequest, NextResponse } from "next/server";
import { getSession, verifyCSRF } from "@/lib/auth";
import { createOperationOutcomeResponse } from "@/lib/utils/fhir";
import { getAllDrugs } from "@/lib/interactions";

export const dynamic = "force-dynamic";

export type PrismaDrugWithIngredient = {
  id: string;
  name: string;
  activeIngredient: string;
  category: string;
  pharmacologicalGroup: string | null;
  rxcui: string | null;
  ingredient: { id: string; name: string; normalizedName: string; rxcui: string | null; atcCode: string | null } | null;
};

const inMemoryCache = new Map<string, { data: PrismaDrugWithIngredient[]; expiresAt: number }>();
const IN_MEMORY_TTL_MS = 60 * 60 * 1000; // 1 hour
const REDIS_TTL_SEC = 60 * 60 * 24; // 24 hours

export function clearDrugsListCache(): void {
  inMemoryCache.clear();
}

function parsePaginationParams(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  let take = 50;
  let skip = 0;

  if (searchParams.has("_count")) {
    const countParam = parseInt(searchParams.get("_count") as string, 10);
    if (!isNaN(countParam) && countParam > 0) {
      take = Math.min(countParam, 500);
    }
  }

  if (searchParams.has("_offset")) {
    const offsetParam = parseInt(searchParams.get("_offset") as string, 10);
    if (!isNaN(offsetParam) && offsetParam >= 0) {
      skip = offsetParam;
    }
  }

  return { take, skip };
}

export async function fetchDrugsList(take: number, skip: number): Promise<PrismaDrugWithIngredient[]> {
  const cacheKey = `fhir:medication:${take}:${skip}`;
  const now = Date.now();

  // 1. Check in-memory cache
  const cachedMemory = inMemoryCache.get(cacheKey);
  if (cachedMemory && cachedMemory.expiresAt > now) {
    return cachedMemory.data;
  }

  // 2. Check Redis cache if available
  try {
    const { redis } = await import("@/lib/redis");
    if (redis) {
      const cachedRedis = await redis.get<PrismaDrugWithIngredient[]>(cacheKey);
      if (cachedRedis) {
        inMemoryCache.set(cacheKey, { data: cachedRedis, expiresAt: now + IN_MEMORY_TTL_MS });
        return cachedRedis;
      }
    }
  } catch (err) {
    console.warn("[Redis] Medication cache read error:", err);
  }

  // 3. Query Prisma Database
  try {
    const { prisma } = await import("@/lib/prisma");
    const drugs = await prisma.drug.findMany({
      take,
      skip,
      include: {
        ingredient: true
      }
    });

    // Populate in-memory cache if result is valid
    if (drugs) {
      inMemoryCache.set(cacheKey, { data: drugs, expiresAt: now + IN_MEMORY_TTL_MS });

      // Populate Redis cache asynchronously / safely
      try {
        const { redis } = await import("@/lib/redis");
        if (redis) {
          await redis.set(cacheKey, drugs, { ex: REDIS_TTL_SEC });
        }
      } catch (err) {
        console.warn("[Redis] Medication cache write error:", err);
      }
    }

    return drugs ?? [];
  } catch (dbError) {
    // Fallback logic
    const fallbackDrugs = getAllDrugs().slice(skip, skip + take).map(d => ({
      id: d.id,
      name: d.name,
      activeIngredient: d.activeIngredient,
      category: d.category,
      pharmacologicalGroup: d.pharmacologicalGroup ?? null,
      rxcui: null,
      ingredient: null
    }));

    return fallbackDrugs;
  }
}

function mapDrugToFHIREntry(drug: PrismaDrugWithIngredient) {
  const coding = [];
  if (drug.rxcui) {
    coding.push({
      system: "http://www.nlm.nih.gov/research/umls/rxnorm",
      code: drug.rxcui,
      display: drug.name
    });
  }
  const atc = drug.ingredient?.atcCode;
  if (atc) {
    coding.push({
      system: "http://www.whocc.no/atc",
      code: atc,
      display: drug.activeIngredient
    });
  }

  // Fallback display coding if empty
  if (coding.length === 0) {
    coding.push({
      system: "http://www.whocc.no/atc",
      code: `ATC-${drug.id.toUpperCase()}`,
      display: drug.activeIngredient
    });
  }

  return {
    resource: {
      resourceType: "Medication",
      id: drug.id,
      code: {
        coding,
        text: drug.name
      },
      status: "active",
      form: {
        text: drug.category
      }
    }
  };
}

export async function GET(request: NextRequest) {
  try {
    // CSRF check
    if (!verifyCSRF(request)) {
      return createOperationOutcomeResponse("error", "security", "Güvenlik doğrulaması başarısız oldu (CSRF engellendi).", 403);
    }

    // Auth check
    const session = await getSession(request);
    if (!session) {
      return createOperationOutcomeResponse("error", "security", "Yetkisiz erişim. Lütfen giriş yapın.", 401);
    }

    const { take, skip } = parsePaginationParams(request);
    const drugsList = await fetchDrugsList(take, skip);
    const entries = (drugsList || []).map(mapDrugToFHIREntry);

    return NextResponse.json({
      resourceType: "Bundle",
      type: "searchset",
      total: entries.length,
      entry: entries
    });
  } catch (error) {
    return createOperationOutcomeResponse("error", "exception", error instanceof Error ? error.message : "FHIR endpoint failed.", 500);
  }
}
