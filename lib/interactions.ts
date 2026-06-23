// lib/interactions.ts
import drugsData from "@/data/drugs.json";
import interactionsData from "@/data/interactions.json";

export interface Drug {
  id: string;
  name: string;
  activeIngredient: string;
  category: string;
  pharmacologicalGroup?: string;
}

export interface RawInteraction {
  id: string;
  drug1: string;
  drug2: string;
  severity: string;
  summary: string;
  source: string;
  sourceLabel?: string;
  verificationStatus?: string;
  evidenceLevel?: string;
  clinicalDetail?: string;
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
  evidenceLevel?: string;
  clinicalDetail?: string;
}

export interface CheckResult {
  interaction: Interaction;
  drug1Name: string;
  drug2Name: string;
}

export interface AccumulationWarning {
  type: "active_ingredient" | "pharmacological_group";
  severity: "high" | "medium";
  message: string;
  triggerDrugs: string[];
  detail?: string;
}

export interface ExplanationData {
  explanation?: string;
  source?: string;
  generatedAt?: string;
  reason?: string;
  error?: string;
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
for (const int of (interactionsData as RawInteraction[])) {
  const mappedInt: Interaction = {
    ...int,
    severity: int.severity.toLowerCase() as "high" | "medium" | "low",
    evidenceLevel: int.evidenceLevel ? int.evidenceLevel.toLowerCase() : "fda_approved",
    clinicalDetail: int.clinicalDetail || `${int.drug1} ve ${int.drug2} kombinasyonu yan etkilere yol açabilir. Kaynak: ${int.source}`
  };
  if (!interactionsMap.has(mappedInt.drug1)) interactionsMap.set(mappedInt.drug1, new Map<string, Interaction>());
  interactionsMap.get(mappedInt.drug1)!.set(mappedInt.drug2, mappedInt);

  if (!interactionsMap.has(mappedInt.drug2)) interactionsMap.set(mappedInt.drug2, new Map<string, Interaction>());
  interactionsMap.get(mappedInt.drug2)!.set(mappedInt.drug1, mappedInt);
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
 * Local drug accumulation and overdose warning algorithm.
 */
export function checkAccumulation(drugIds: string[]): AccumulationWarning[] {
  if (!Array.isArray(drugIds) || drugIds.length < 2) {
    return [];
  }

  const warnings: AccumulationWarning[] = [];
  const selectedDrugs: Drug[] = [];

  for (const id of drugIds) {
    const drug = drugsMap.get(id);
    if (drug) {
      selectedDrugs.push(drug);
    }
  }

  // 1. Aynı Etken Madde Çakışması
  const ingredientMap = new Map<string, Drug[]>();
  for (const drug of selectedDrugs) {
    const ingredient = drug.activeIngredient.toLowerCase().trim();
    if (!ingredientMap.has(ingredient)) {
      ingredientMap.set(ingredient, []);
    }
    ingredientMap.get(ingredient)!.push(drug);
  }

  for (const drugs of ingredientMap.values()) {
    if (drugs.length > 1) {
      const names = drugs.map(d => d.name);
      warnings.push({
        type: "active_ingredient",
        severity: "high",
        message: `Dikkat: Aynı etkin maddeyi (${drugs[0].activeIngredient}) içeren birden fazla ilaç eklediniz. Aşırı doz riski!`,
        triggerDrugs: names,
        detail: `${names.join(" ve ")} ilaçlarının ikisi de ${drugs[0].activeIngredient} içermektedir.`
      });
    }
  }

  // 2. Aynı Farmakolojik Grup
  const groupMap = new Map<string, Drug[]>();
  for (const drug of selectedDrugs) {
    if (drug.pharmacologicalGroup) {
      const group = drug.pharmacologicalGroup.toUpperCase().trim();
      if (!groupMap.has(group)) {
        groupMap.set(group, []);
      }
      groupMap.get(group)!.push(drug);
    }
  }

  for (const drugs of groupMap.values()) {
    if (drugs.length > 1) {
      const names = drugs.map(d => d.name);
      const uniqueIngredients = new Set(drugs.map(d => d.activeIngredient.toLowerCase().trim()));
      if (uniqueIngredients.size > 1) {
        warnings.push({
          type: "pharmacological_group",
          severity: "medium",
          message: `Dikkat: Aynı farmakolojik sınıftan (${drugs[0].pharmacologicalGroup}) birden fazla ilaç eklediniz. Yan etki riski artabilir.`,
          triggerDrugs: names,
          detail: `${names.join(" ve ")} ilaçları ${drugs[0].pharmacologicalGroup} sınıfına aittir.`
        });
      }
    }
  }

  return warnings;
}

/**
 * Production-ready asynchronous N-Drug check using PostgreSQL database via Prisma.
 * Falls back to local JSON if the database URL is not configured or fails.
 */
export async function findInteractionsDB(drugIds: string[]): Promise<CheckResult[]> {
  // Eğer veritabanı bağlantısı yoksa doğrudan lokal kontrole yönlendir
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes("[SIFRE]")) {
    console.info("[PillMind CMIO Engine] DATABASE_URL tanımlı değil veya şablon halinde. Lokal JSON kontrolü yapılıyor.");
    return findInteractions(drugIds);
  }

  try {
    const { prisma } = await import("@/lib/prisma");

    // 1. İlaçları ve Marka adlarını çöz
    const resolvedDrugs = await prisma.drug.findMany({
      where: {
        OR: [
          { id: { in: drugIds } },
          { name: { in: drugIds } },
          { brandNames: { some: { name: { in: drugIds } } } }
        ]
      }
    });

    const resolvedDrugIds = resolvedDrugs.map((d) => d.id);

    // 2. Tek bir veritabanı sorgusuyla seçilen ilaçlar arasındaki tüm olası etkileşimleri çek
    const dbInteractions = await prisma.drugInteraction.findMany({
      where: {
        drug1Id: { in: resolvedDrugIds },
        drug2Id: { in: resolvedDrugIds }
      }
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
            clinicalDetail: match.clinicalDetail ?? undefined,
            source: match.source,
            sourceLabel: match.sourceLabel,
            verificationStatus: match.verificationStatus.toLowerCase(),
            evidenceLevel: match.evidenceLevel ? match.evidenceLevel.toLowerCase() : "fda_approved"
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

/**
 * Asynchronous drug accumulation and overdose warning algorithm using database.
 */
export async function checkAccumulationDB(drugIds: string[]): Promise<AccumulationWarning[]> {
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes("[SIFRE]")) {
    return checkAccumulation(drugIds);
  }

  try {
    const { prisma } = await import("@/lib/prisma");

    const resolvedDrugs = await prisma.drug.findMany({
      where: {
        OR: [
          { id: { in: drugIds } },
          { name: { in: drugIds } },
          { brandNames: { some: { name: { in: drugIds } } } }
        ]
      }
    });

    const warnings: AccumulationWarning[] = [];

    // 1. Aynı Etken Madde Çakışması
    const ingredientMap = new Map<string, Drug[]>();
    for (const drug of resolvedDrugs) {
      const ingredient = drug.activeIngredient.toLowerCase().trim();
      if (!ingredientMap.has(ingredient)) {
        ingredientMap.set(ingredient, []);
      }
      ingredientMap.get(ingredient)!.push(drug as Drug);
    }

    for (const drugs of ingredientMap.values()) {
      if (drugs.length > 1) {
        const names = drugs.map(d => d.name);
        warnings.push({
          type: "active_ingredient",
          severity: "high",
          message: `Dikkat: Aynı etkin maddeyi (${drugs[0].activeIngredient}) içeren birden fazla ilaç eklediniz. Aşırı doz riski!`,
          triggerDrugs: names,
          detail: `${names.join(" ve ")} ilaçlarının ikisi de ${drugs[0].activeIngredient} içermektedir.`
        });
      }
    }

    // 2. Aynı Farmakolojik Grup Birikimi
    const groupMap = new Map<string, Drug[]>();
    for (const drug of resolvedDrugs) {
      if (drug.pharmacologicalGroup) {
        const group = drug.pharmacologicalGroup.toUpperCase().trim();
        if (!groupMap.has(group)) {
          groupMap.set(group, []);
        }
        groupMap.get(group)!.push(drug as Drug);
      }
    }

    for (const drugs of groupMap.values()) {
      if (drugs.length > 1) {
        const names = drugs.map(d => d.name);
        const uniqueIngredients = new Set(drugs.map(d => d.activeIngredient.toLowerCase().trim()));
        if (uniqueIngredients.size > 1) {
          warnings.push({
            type: "pharmacological_group",
            severity: "medium",
            message: `Dikkat: Aynı farmakolojik sınıftan (${drugs[0].pharmacologicalGroup}) birden fazla ilaç eklediniz. Yan etki riski artabilir.`,
            triggerDrugs: names,
            detail: `${names.join(" ve ")} ilaçları ${drugs[0].pharmacologicalGroup} sınıfına aittir.`
          });
        }
      }
    }

    return warnings;
  } catch (error) {
    console.error("[PillMind CMIO Engine] Accumulation check DB failed, falling back to local JSON:", error);
    return checkAccumulation(drugIds);
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
