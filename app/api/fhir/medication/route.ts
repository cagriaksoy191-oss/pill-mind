// app/api/fhir/medication/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSession, verifyCSRF } from "@/lib/auth";
import { createOperationOutcomeResponse } from "@/lib/utils/fhir";
import { getAllDrugs } from "@/lib/interactions";

export const dynamic = "force-dynamic";

type PrismaDrugWithIngredient = {
  id: string;
  name: string;
  activeIngredient: string;
  category: string;
  pharmacologicalGroup: string | null;
  rxcui: string | null;
  ingredient: { id: string; name: string; normalizedName: string; rxcui: string | null; atcCode: string | null } | null;
};

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

async function fetchDrugsList(take: number, skip: number): Promise<PrismaDrugWithIngredient[]> {
  try {
    const { prisma } = await import("@/lib/prisma");
    return await prisma.drug.findMany({
      take,
      skip,
      include: {
        ingredient: true
      }
    });
  } catch {
    // Fallback
    return getAllDrugs().slice(skip, skip + take).map(d => ({
      id: d.id,
      name: d.name,
      activeIngredient: d.activeIngredient,
      category: d.category,
      pharmacologicalGroup: d.pharmacologicalGroup ?? null,
      rxcui: null,
      ingredient: null
    }));
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
    const entries = drugsList.map(mapDrugToFHIREntry);

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
