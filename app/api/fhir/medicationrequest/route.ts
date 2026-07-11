// app/api/fhir/medicationrequest/route.ts
import { NextResponse } from "next/server";
import { findInteractionsDB, checkAccumulationDB, findFoodInteractionsDB, findContraindicationsDB, resolveDrugsDB, PatientContext } from "@/lib/interactions";



export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseFhirRequest(body: any): { drugIds: string[], patientContext: PatientContext | undefined } {
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
      drugIds = medsParam.valueString.split(",").map((s: string) => s.trim());
    }
    if (ctxParam && ctxParam.valueString) {
      try {
        patientContext = JSON.parse(ctxParam.valueString);
      } catch {
        patientContext = undefined;
      }
    }
  }
  // 2. Parse FHIR Bundle of MedicationRequests
  else if (body.resourceType === "Bundle" && Array.isArray(body.entry)) {
    for (const entry of body.entry) {
      const resource = entry.resource;
      if (resource && resource.resourceType === "MedicationRequest") {
        const ref = resource.medicationReference?.reference;
        if (ref && ref.startsWith("Medication/")) {
          drugIds.push(ref.slice(11));
        } else if (resource.medicationCodeableConcept?.text) {
          drugIds.push(resource.medicationCodeableConcept.text.toLowerCase());
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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { drugIds, patientContext } = parseFhirRequest(body);

    if (drugIds.length < 2) {
      return NextResponse.json({
        resourceType: "OperationOutcome",
        issue: [
          {
            severity: "warning",
            code: "value",
            diagnostics: "FHIR: En az 2 MedicationRequest veya medications parametresi gereklidir."
          }
        ]
      }, { status: 400 });
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
    return NextResponse.json({
      resourceType: "OperationOutcome",
      issue: [
        {
          severity: "error",
          code: "exception",
          diagnostics: error instanceof Error ? error.message : "FHIR processing failed."
        }
      ]
    }, { status: 500 });
  }
}
