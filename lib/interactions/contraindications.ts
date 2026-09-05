import {
  Drug,
  PatientContext,
  ContraindicationResult,
  DrugClinicalMetadata
} from "./types";
import { drugsMap, contraindicationsMap, DRUG_ALIASES } from "./data";
import { getDrugClinicalMetadata, getBatchDrugClinicalMetadata } from "./metadata";
import { resolveDrugsDB } from "./interactions";
import { LRUCache } from "../lruCache";

const MAX_CACHE_SIZE = 5000;
const resolveCache = new LRUCache<string, string>(MAX_CACHE_SIZE);

function resolveDrugIds(drugIds: string[]): Set<string> {
  const resolvedIds = new Set<string>();
  for (const idOrName of drugIds) {
    if (drugsMap.has(idOrName)) {
      resolvedIds.add(idOrName);
      continue;
    }

    let canonicalId = resolveCache.get(idOrName);
    if (canonicalId === undefined) {
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

function checkDiseaseContraindications(
  resolvedIds: Set<string>,
  patientContext: PatientContext,
  results: ContraindicationResult[]
) {
  if (
    patientContext &&
    patientContext.diseases &&
    Array.isArray(patientContext.diseases) &&
    patientContext.diseases.length > 0
  ) {
    for (const drugId of resolvedIds) {
      const diseaseMap = contraindicationsMap.get(drugId);
      if (diseaseMap) {
        for (const diseaseIcd of patientContext.diseases) {
          const contras = diseaseMap.get(diseaseIcd);
          if (contras) {
            for (const contra of contras) {
              const drug = drugsMap.get(contra.drugId);
              results.push({
                id: contra.id,
                drugId: contra.drugId,
                drugName: drug?.name ?? contra.drugId,
                type: "disease",
                severity: contra.severity.toLowerCase() as "high" | "medium" | "low",
                message: contra.effect,
                diseaseIcd: contra.diseaseIcd,
                diseaseName: contra.diseaseName
              });
            }
          }
        }
      }
    }
  }
}

function checkPregnancyContraindications(
  drugId: string,
  drugName: string,
  meta: DrugClinicalMetadata,
  patientContext: PatientContext,
  results: ContraindicationResult[]
) {
  if (patientContext.isPregnant) {
    if (meta.pregnancyCategory === "X") {
      results.push({
        id: `preg-contra-${drugId}`,
        drugId,
        drugName: drugName,
        type: "pregnancy",
        severity: "high",
        message: `Gebelik Durumu Uyarısı: ${drugName} gebelikte kesinlikle kontrendikedir (Kategori X). ${meta.pregnancyNote}`
      });
    } else if (meta.pregnancyCategory === "D") {
      results.push({
        id: `preg-contra-${drugId}`,
        drugId,
        drugName: drugName,
        type: "pregnancy",
        severity: "high",
        message: `Gebelik Durumu Uyarısı: ${drugName} gebelikte yüksek risklidir (Kategori D). ${meta.pregnancyNote}`
      });
    }
  }
}

function checkBreastfeedingContraindications(
  drugId: string,
  drugName: string,
  meta: DrugClinicalMetadata,
  patientContext: PatientContext,
  results: ContraindicationResult[]
) {
  if (patientContext.isBreastfeeding) {
    if (drugId === "warfarin" || drugId === "aspirin" || drugId === "enalapril") {
      results.push({
        id: `lact-contra-${drugId}`,
        drugId,
        drugName: drugName,
        type: "breastfeeding",
        severity: "medium",
        message: `Emzirme Uyarısı: ${drugName} emzirme döneminde dikkatle kullanılmalıdır. ${meta.breastfeedingNote}`
      });
    }
  }
}

function checkRenalContraindications(
  drugId: string,
  drugName: string,
  meta: DrugClinicalMetadata,
  patientContext: PatientContext,
  results: ContraindicationResult[]
) {
  if (patientContext.renalRisk) {
    if (drugId === "metformin") {
      results.push({
        id: `renal-contra-${drugId}`,
        drugId,
        drugName: drugName,
        type: "renal",
        severity: "high",
        message: `Böbrek Yetmezliği Kontrendikasyonu: GFR < 30 ml/dk olan hastalarda Metformin birikimi laktik asidoza yol açabileceğinden kullanımı kesinlikle kontrendikedir.`
      });
    } else if (drugId === "ibuprofen" || drugId === "diklofenak" || drugId === "aspirin") {
      results.push({
        id: `renal-contra-${drugId}`,
        drugId,
        drugName: drugName,
        type: "renal",
        severity: "high",
        message: `Böbrek Yetmezliği Kontrendikasyonu: ${drugName} (NSAID) böbrek kan akımını azaltarak akut renal yetmezliği tetikleyebilir.`
      });
    }
  }
}

function checkHepaticContraindications(
  drugId: string,
  drugName: string,
  meta: DrugClinicalMetadata,
  patientContext: PatientContext,
  results: ContraindicationResult[]
) {
  if (patientContext.hepaticRisk) {
    if (drugId === "parasetamol") {
      results.push({
        id: `hepatic-contra-${drugId}`,
        drugId,
        drugName: drugName,
        type: "hepatic",
        severity: "high",
        message: `Karaciğer Yetmezliği Uyarısı: Karaciğer yetmezliği olan hastalarda Parasetamol metabolizması yavaşlar; günlük doz 2 gramı aşmamalıdır.`
      });
    } else if (drugId === "warfarin") {
      results.push({
        id: `hepatic-contra-${drugId}`,
        drugId,
        drugName: drugName,
        type: "hepatic",
        severity: "high",
        message: `Karaciğer Yetmezliği Kontrendikasyonu: Karaciğer yetmezliğinde pıhtılaşma faktörleri azaldığından Coumadin (Warfarin) kullanımı kanama riskini ölümcül düzeyde artırır.`
      });
    }
  }
}

function checkClinicalContraindications(
  drugs: { id: string; name: string }[],
  patientContext: PatientContext,
  results: ContraindicationResult[]
) {
  if (drugs.length === 0) return;

  const drugIds: string[] = new Array(drugs.length);
  for (let i = 0; i < drugs.length; i++) {
    drugIds[i] = drugs[i].id;
  }

  const metadataBatchMap = getBatchDrugClinicalMetadata(drugIds);

  for (let i = 0; i < drugs.length; i++) {
    const drug = drugs[i];
    const drugId = drug.id;
    const meta = metadataBatchMap.get(drugId) ?? getDrugClinicalMetadata(drugId);

    checkPregnancyContraindications(drugId, drug.name, meta, patientContext, results);
    checkBreastfeedingContraindications(drugId, drug.name, meta, patientContext, results);
    checkRenalContraindications(drugId, drug.name, meta, patientContext, results);
    checkHepaticContraindications(drugId, drug.name, meta, patientContext, results);
  }
}

function processDbContraindications({
  dbContras,
  resolvedDrugsMap,
  results
}: {
  dbContras: {
    id: string;
    drugId: string;
    diseaseIcd: string;
    diseaseName: string;
    effect: string;
    severity: string;
  }[];
  resolvedDrugsMap: Map<string, Drug>;
  results: ContraindicationResult[];
}) {
  if (dbContras.length === 0) return;
  const baseLen = results.length;
  results.length = baseLen + dbContras.length;
  for (let i = 0, len = dbContras.length; i < len; i++) {
    const c = dbContras[i];
    const drug = resolvedDrugsMap.get(c.drugId);
    results[baseLen + i] = {
      id: c.id,
      drugId: c.drugId,
      drugName: drug?.name ?? c.drugId,
      type: "disease",
      severity: c.severity.toLowerCase() as "high" | "medium" | "low",
      message: c.effect,
      diseaseIcd: c.diseaseIcd,
      diseaseName: c.diseaseName
    };
  }
}

export function findContraindications(
  drugIds: string[],
  patientContext?: PatientContext
): ContraindicationResult[] {
  if (!Array.isArray(drugIds) || drugIds.length === 0) {
    return [];
  }

  const results: ContraindicationResult[] = [];
  const resolvedIds = resolveDrugIds(drugIds);

  if (patientContext) {
    checkDiseaseContraindications(resolvedIds, patientContext, results);

    const drugsToCheck: { id: string; name: string }[] = [];
    for (const drugId of resolvedIds) {
      const d = drugsMap.get(drugId);
      drugsToCheck.push({ id: drugId, name: d?.name ?? drugId });
    }

    checkClinicalContraindications(drugsToCheck, patientContext, results);
  }

  return results;
}

export async function findContraindicationsDB(
  drugIds: string[],
  patientContext?: PatientContext,
  resolvedDrugsCache?: unknown[]
): Promise<ContraindicationResult[]> {
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes("[SIFRE]")) {
    return findContraindications(drugIds, patientContext);
  }

  try {
    const results: ContraindicationResult[] = [];
    if (!patientContext) {
      return results;
    }

    const { prisma } = await import("@/lib/prisma");
    let resolvedDrugs = resolvedDrugsCache as Drug[];
    if (!resolvedDrugsCache || !Array.isArray(resolvedDrugsCache) || resolvedDrugsCache.length === 0) {
      resolvedDrugs = await resolveDrugsDB(drugIds);
    }

    const resolvedDrugIds: string[] = new Array(resolvedDrugs.length);
    const resolvedDrugsMap = new Map<string, Drug>();
    for (let i = 0; i < resolvedDrugs.length; i++) {
      const d = resolvedDrugs[i];
      resolvedDrugIds[i] = d.id;
      resolvedDrugsMap.set(d.id, d);
    }

    if (patientContext.diseases && Array.isArray(patientContext.diseases) && patientContext.diseases.length > 0) {
      const dbContras = await prisma.contraindication.findMany({
        where: {
          drugId: { in: resolvedDrugIds },
          diseaseIcd: { in: patientContext.diseases }
        }
      });

      processDbContraindications({
        dbContras,
        resolvedDrugsMap,
        results
      });
    }

    checkClinicalContraindications(resolvedDrugs, patientContext, results);

    return results;
  } catch (error) {
    console.error("[PillMind CMIO Engine] Contraindications DB failed, falling back to local:", error);
    return findContraindications(drugIds, patientContext);
  }
}
