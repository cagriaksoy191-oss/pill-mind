// app/api/fhir/medicationrequest/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSession, verifyCSRF } from "@/lib/auth";
import { createOperationOutcomeResponse } from "@/lib/utils/fhir";
import { findInteractionsDB, checkAccumulationDB, findFoodInteractionsDB, findContraindicationsDB, resolveDrugsDB, PatientContext } from "@/lib/interactions";

export const dynamic = "force-dynamic";

export interface FhirRequestBody {
  resourceType?: string;
  parameter?: Array<{
    name?: string;
    valueString?: string;
  }>;
  entry?: Array<{
    resource?: {
      resourceType?: string;
      medicationReference?: {
        reference?: string;
      };
      medicationCodeableConcept?: {
        text?: string;
      };
    };
  }>;
  medicationReference?: {
    reference?: string;
  };
}

function parseFhirRequest(body: FhirRequestBody): { drugIds: string[], patientContext: PatientContext | undefined } {
  let drugIds: string[] = [];
  let patientContext: PatientContext | undefined = undefined;

  // 1. Parse FHIR Parameters
  if (body.resourceType === "Parameters" && Array.isArray(body.parameter)) {
    let medsParam;
    let ctxParam;
    for (const p of body.parameter) {
      if (p.name === "medications") medsParam = p;
      else if (p.name === "patientContext") ctxParam = p;

      if (medsParam && ctxParam) break;
    }

    if (medsParam && medsParam.valueString) {
      const parts = medsParam.valueString.split(",");
      const len = parts.length;
      drugIds = new Array(len);
      for (let i = 0; i < len; i++) {
        drugIds[i] = parts[i].trim();
      }
    }
    if (ctxParam && ctxParam.valueString) {
      try {
        const raw = JSON.parse(ctxParam.valueString);
        if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
          patientContext = {
            diseases: Array.isArray(raw.diseases) ? raw.diseases.map(String) : undefined,
            isPregnant: typeof raw.isPregnant === 'boolean' ? raw.isPregnant : undefined,
            isBreastfeeding: typeof raw.isBreastfeeding === 'boolean' ? raw.isBreastfeeding : undefined,
            renalRisk: typeof raw.renalRisk === 'boolean' ? raw.renalRisk : undefined,
            hepaticRisk: typeof raw.hepaticRisk === 'boolean' ? raw.hepaticRisk : undefined,
            ageGroup: typeof raw.ageGroup === 'string' ? raw.ageGroup : undefined,
          };
        } else {
          patientContext = undefined;
        }
      } catch {
        patientContext = undefined;
      }
    }
  }
  // 2. Parse FHIR Bundle of MedicationRequests
  else if (body.resourceType === "Bundle" && Array.isArray(body.entry)) {
    const entries = body.entry;
    const len = entries.length;
    for (let i = 0; i < len; i++) {
      const resource = entries[i].resource;
      if (resource && resource.resourceType === "MedicationRequest") {
        const medRef = resource.medicationReference;
        const ref = medRef && medRef.reference;
        if (ref && ref.startsWith("Medication/")) {
          drugIds.push(ref.slice(11));
        } else {
          const text = resource.medicationCodeableConcept && resource.medicationCodeableConcept.text;
          if (text) {
            drugIds.push(text.toLowerCase());
          }
        }
      }
    }
  }
  // 3. Parse single MedicationRequest
  else if (body.resourceType === "MedicationRequest") {
    const ref = body.medicationReference?.reference;
    if (ref && ref.startsWith("Medication/")) {
      drugIds.push(ref.slice(11));
    }
  }

  return { drugIds, patientContext };
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { drugIds, patientContext } = parseFhirRequest(body);

    if (drugIds.length < 2) {
      return createOperationOutcomeResponse("warning", "value", "FHIR: En az 2 MedicationRequest veya medications parametresi gereklidir.", 400);
    }

    // Run clinical checking engine
    const resolvedDrugsCache = await resolveDrugsDB(drugIds);
    const [interactions, accumulation, food, contra] = await Promise.all([
      findInteractionsDB(drugIds, resolvedDrugsCache),
      checkAccumulationDB(drugIds, resolvedDrugsCache),
      findFoodInteractionsDB(drugIds, resolvedDrugsCache),
      findContraindicationsDB(drugIds, patientContext, resolvedDrugsCache)
    ]);

    // Return results in FHIR Parameters format
    return NextResponse.json({
      resourceType: "Parameters",
      parameter: [
        {
          name: "interactionsCount",
          valueInteger: interactions.length
        },
        {
          name: "interactions",
          valueString: JSON.stringify(interactions)
        },
        {
          name: "accumulationWarnings",
          valueString: JSON.stringify(accumulation)
        },
        {
          name: "foodInteractions",
          valueString: JSON.stringify(food)
        },
        {
          name: "contraindications",
          valueString: JSON.stringify(contra)
        }
      ]
    });
  } catch (error) {
    return createOperationOutcomeResponse("error", "exception", error instanceof Error ? error.message : "FHIR processing failed.", 500);
  }
}
