// app/api/fhir/medication/route.ts
import { NextResponse } from "next/server";
import { getAllDrugs, Drug } from "@/lib/interactions";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    let drugsList: (Drug & { ingredient?: { atcCode?: string | null } | null })[] = [];
    try {
      const { prisma } = await import("@/lib/prisma");
      drugsList = await prisma.drug.findMany({
        include: {
          ingredient: true
        }
      });
    } catch {
      // Fallback
      drugsList = getAllDrugs() as (Drug & { ingredient?: { atcCode?: string | null } | null })[];
    }

    const entries = drugsList.map(drug => {
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
    });

    return NextResponse.json({
      resourceType: "Bundle",
      type: "searchset",
      total: entries.length,
      entry: entries
    });
  } catch (error) {
    return NextResponse.json({
      resourceType: "OperationOutcome",
      issue: [
        {
          severity: "error",
          code: "exception",
          diagnostics: error instanceof Error ? error.message : "FHIR endpoint failed."
        }
      ]
    }, { status: 500 });
  }
}
