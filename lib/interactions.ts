// lib/interactions.ts
import drugsData from "@/data/drugs.json";
import interactionsData from "@/data/interactions.json";
import foodInteractionsData from "@/data/foodInteractions.json";
import contraindicationsData from "@/data/contraindications.json";


export async function resolveDrugsDB(drugIds: string[]) {
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes("[SIFRE]")) {
    return [];
  }
  try {
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
  } catch (error) {
    console.error("[PillMind CMIO Engine] resolveDrugsDB başarısız:", error);
    return [];
  }
}

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
  evidences?: any[];
  mechanisms?: any[];
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


const DRUG_ALIASES: Record<string, string> = {
  coraspin: "aspirin", ecopirin: "aspirin", aspirin: "aspirin",
  parol: "parasetamol", calpol: "parasetamol", tylol: "parasetamol", parasetamol: "parasetamol",
  nurofen: "ibuprofen", dolorex: "ibuprofen", advil: "ibuprofen", ibuprofen: "ibuprofen",
  coumadin: "warfarin", warfarin: "warfarin",
  metformin: "metformin", enalapril: "enalapril", amoksisilin: "amoksisilin",
  omeprazol: "omeprazol", diklofenak: "diklofenak", metoprolol: "metoprolol"
};

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
  const ingredientMap = new Map<string, { count: number; names: string[]; activeIngredient: string }>();
  for (let i = 0; i < selectedDrugs.length; i++) {
    const drug = selectedDrugs[i];
    const ingredientKey = drug.activeIngredient.toLowerCase().trim();
    let data = ingredientMap.get(ingredientKey);
    if (data === undefined) {
      data = { count: 1, names: [drug.name], activeIngredient: drug.activeIngredient };
      ingredientMap.set(ingredientKey, data);
    } else {
      data.count++;
      data.names.push(drug.name);
    }
  }

  for (const data of ingredientMap.values()) {
    if (data.count > 1) {
      warnings.push({
        type: "active_ingredient",
        severity: "high",
        message: `Dikkat: Aynı etkin maddeyi (${data.activeIngredient}) içeren birden fazla ilaç eklediniz. Aşırı doz riski!`,
        triggerDrugs: data.names,
        detail: `${data.names.join(" ve ")} ilaçlarının ikisi de ${data.activeIngredient} içermektedir.`
      });
    }
  }

  // 2. Aynı Farmakolojik Grup
  const groupMap = new Map<string, { count: number; names: string[]; groupName: string; uniqueIngredients: Set<string> }>();
  for (let i = 0; i < selectedDrugs.length; i++) {
    const drug = selectedDrugs[i];
    if (drug.pharmacologicalGroup) {
      const groupKey = drug.pharmacologicalGroup.toUpperCase().trim();
      const ingredientKey = drug.activeIngredient.toLowerCase().trim();
      let data = groupMap.get(groupKey);
      if (data === undefined) {
        data = {
          count: 1,
          names: [drug.name],
          groupName: drug.pharmacologicalGroup,
          uniqueIngredients: new Set([ingredientKey])
        };
        groupMap.set(groupKey, data);
      } else {
        data.count++;
        data.names.push(drug.name);
        data.uniqueIngredients.add(ingredientKey);
      }
    }
  }

  for (const data of groupMap.values()) {
    if (data.count > 1 && data.uniqueIngredients.size > 1) {
      warnings.push({
        type: "pharmacological_group",
        severity: "medium",
        message: `Dikkat: Aynı farmakolojik sınıftan (${data.groupName}) birden fazla ilaç eklediniz. Yan etki riski artabilir.`,
        triggerDrugs: data.names,
        detail: `${data.names.join(" ve ")} ilaçları ${data.groupName} sınıfına aittir.`
      });
    }
  }

  return warnings;
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
    const resolvedDrugs = (resolvedDrugsCache as Drug[]) ?? await prisma.drug.findMany({
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

/**
 * Asynchronous drug accumulation and overdose warning algorithm using database.
 */
export async function checkAccumulationDB(drugIds: string[], resolvedDrugsCache?: unknown[]): Promise<AccumulationWarning[]> {
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes("[SIFRE]")) {
    return checkAccumulation(drugIds);
  }

  try {
    const { prisma } = await import("@/lib/prisma");

    const resolvedDrugs = (resolvedDrugsCache as Drug[]) ?? await prisma.drug.findMany({
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
    const ingredientMap = new Map<string, { count: number; names: string[]; activeIngredient: string }>();
    for (let i = 0; i < resolvedDrugs.length; i++) {
      const drug = resolvedDrugs[i] as Drug;
      const ingredientKey = drug.activeIngredient.toLowerCase().trim();
      let data = ingredientMap.get(ingredientKey);
      if (data === undefined) {
        data = { count: 1, names: [drug.name], activeIngredient: drug.activeIngredient };
        ingredientMap.set(ingredientKey, data);
      } else {
        data.count++;
        data.names.push(drug.name);
      }
    }

    for (const data of ingredientMap.values()) {
      if (data.count > 1) {
        warnings.push({
          type: "active_ingredient",
          severity: "high",
          message: `Dikkat: Aynı etkin maddeyi (${data.activeIngredient}) içeren birden fazla ilaç eklediniz. Aşırı doz riski!`,
          triggerDrugs: data.names,
          detail: `${data.names.join(" ve ")} ilaçlarının ikisi de ${data.activeIngredient} içermektedir.`
        });
      }
    }

    // 2. Aynı Farmakolojik Grup Birikimi
    const groupMap = new Map<string, { count: number; names: string[]; groupName: string; uniqueIngredients: Set<string> }>();
    for (let i = 0; i < resolvedDrugs.length; i++) {
      const drug = resolvedDrugs[i] as Drug;
      if (drug.pharmacologicalGroup) {
        const groupKey = drug.pharmacologicalGroup.toUpperCase().trim();
        const ingredientKey = drug.activeIngredient.toLowerCase().trim();
        let data = groupMap.get(groupKey);
        if (data === undefined) {
          data = {
            count: 1,
            names: [drug.name],
            groupName: drug.pharmacologicalGroup,
            uniqueIngredients: new Set([ingredientKey])
          };
          groupMap.set(groupKey, data);
        } else {
          data.count++;
          data.names.push(drug.name);
          data.uniqueIngredients.add(ingredientKey);
        }
      }
    }

    for (const data of groupMap.values()) {
      if (data.count > 1 && data.uniqueIngredients.size > 1) {
        warnings.push({
          type: "pharmacological_group",
          severity: "medium",
          message: `Dikkat: Aynı farmakolojik sınıftan (${data.groupName}) birden fazla ilaç eklediniz. Yan etki riski artabilir.`,
          triggerDrugs: data.names,
          detail: `${data.names.join(" ve ")} ilaçları ${data.groupName} sınıfına aittir.`
        });
      }
    }

    return warnings;
  } catch (error) {
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

export interface DrugClinicalMetadata {
  pregnancyCategory: string;
  pregnancyNote: string;
  breastfeedingNote: string;
  renalNote: string;
  hepaticNote: string;
}

export function getDrugClinicalMetadata(drugId: string): DrugClinicalMetadata {
  const defaultMeta: DrugClinicalMetadata = {
    pregnancyCategory: "C",
    pregnancyNote: "Yeterli insan çalışması yoktur, potansiyel yarar risklerden fazlaysa kullanılabilir.",
    breastfeedingNote: "Emzirme döneminde kullanırken dikkatli olunmalı, bebek izlenmelidir.",
    renalNote: "Böbrek yetmezliğinde doz ayarlaması veya takip önerilebilir.",
    hepaticNote: "Karaciğer yetmezliğinde dikkatli kullanılmalı, fonksiyonlar izlenmelidir."
  };

  switch (drugId.toLowerCase().trim()) {
    case "aspirin":
      return {
        pregnancyCategory: "D",
        pregnancyNote: "3. trimesterde kontrendikedir (Kategori D/X). Kanama riskini artırır ve duktus arteriozusun erken kapanmasına yol açabilir.",
        breastfeedingNote: "Salisilatlar süte geçer. Emziren annelerde kullanımı önerilmez.",
        renalNote: "Ciddi böbrek yetmezliğinde kontrendikedir. Böbrek fonksiyonlarını bozabilir.",
        hepaticNote: "Karaciğer yetmezliğinde kanama riski nedeniyle dikkatli kullanılmalıdır."
      };
    case "warfarin":
      return {
        pregnancyCategory: "X",
        pregnancyNote: "Gebelikte kesinlikle kontrendikedir (Kategori X). Teratojenik etki ve fetal kanama riski vardır.",
        breastfeedingNote: "Çok az miktarda süte geçer, genellikle güvenli kabul edilse de bebek izlenmelidir.",
        renalNote: "Renal eliminasyonu düşüktür ancak renal hasarda kanama riski takibi gerektirir.",
        hepaticNote: "Karaciğer yetmezliğinde pıhtılaşma faktörleri azaldığı için kanama riski aşırı artar."
      };
    case "metformin":
      return {
        pregnancyCategory: "B",
        pregnancyNote: "Gebelikte genellikle güvenli kabul edilir (Kategori B). Ancak insülin tercih edilebilir.",
        breastfeedingNote: "Az miktarda süte geçer, emzirme döneminde kullanılabilir.",
        renalNote: "GFR < 30 mL/dk olan şiddetli renal yetmezlikte kesinlikle kontrendikedir (Laktik asidoz riski).",
        hepaticNote: "Karaciğer yetmezliğinde laktik asidoz riski nedeniyle kullanımı önerilmez."
      };
    case "enalapril":
      return {
        pregnancyCategory: "D",
        pregnancyNote: "Gebelikte kesinlikle kontrendikedir (Kategori D). Fetal böbrek hasarı, oligohidramniyos ve kafatası kemik anomalilerine yol açabilir.",
        breastfeedingNote: "Az miktarda süte geçer, dikkatle kullanılabilir.",
        renalNote: "Böbrek yetmezliğinde doz azaltımı gerekir. Hiperkalemi riskini artırır.",
        hepaticNote: "Karaciğer yetmezliğinde ön ilaç olan enalaprilin aktif forma dönüşümü azalabilir."
      };
    case "amoksisilin":
      return {
        pregnancyCategory: "B",
        pregnancyNote: "Gebelikte güvenlidir (Kategori B). Yaygın olarak kullanılır.",
        breastfeedingNote: "Süte geçer, bebekte ishal veya mantar riski takip edilerek kullanılabilir.",
        renalNote: "GFR < 30 mL/dk ise doz aralığı uzatılmalıdır.",
        hepaticNote: "Karaciğer yetmezliğinde doz ayarlamasına gerek yoktur."
      };
    case "omeprazol":
      return {
        pregnancyCategory: "C",
        pregnancyNote: "Potansiyel yarar risklerden fazlaysa kullanılabilir (Kategori C).",
        breastfeedingNote: "Süte geçer, dikkatle kullanılmalıdır.",
        renalNote: "Doz ayarlamasına gerek yoktur.",
        hepaticNote: "Şiddetli karaciğer yetmezliğinde doz kısıtlaması (günlük maks 20mg) önerilir."
      };
    case "ibuprofen":
      return {
        pregnancyCategory: "C",
        pregnancyNote: "3. trimesterde kesinlikle kontrendikedir (Kategori D/X). Doğum sancısını geciktirebilir ve fetal kanamaya yol açabilir.",
        breastfeedingNote: "Çok az miktarda süte geçer, emzirme döneminde kısa süreli kullanılabilir.",
        renalNote: "Ciddi böbrek yetmezliğinde kontrendikedir. Akut böbrek hasarını tetikleyebilir.",
        hepaticNote: "Karaciğer yetmezliğinde dikkatle kullanılmalıdır."
      };
    case "diklofenak":
      return {
        pregnancyCategory: "C",
        pregnancyNote: "3. trimesterde kesinlikle kontrendikedir (Kategori D/X). Fetal duktus arteriozusun erken kapanmasına neden olur.",
        breastfeedingNote: "Süte çok az miktarda geçer, kısa süreli kullanılabilir.",
        renalNote: "Ciddi renal yetmezlikte kontrendikedir. Böbrek yetmezliğini kötüleştirebilir.",
        hepaticNote: "Hepatotoksisite riski vardır, karaciğer fonksiyonları izlenmelidir."
      };
    case "metoprolol":
      return {
        pregnancyCategory: "C",
        pregnancyNote: "Fetal perfüzyonu azaltabilir. Yeni doğanda bradikardi ve hipoglisemi riski nedeniyle takip gerektirir.",
        breastfeedingNote: "Süte geçer, bebek bradikardi açısından izlenmelidir.",
        renalNote: "Doz ayarlamasına gerek yoktur.",
        hepaticNote: "Karaciğerde yoğun metabolize olur, hepatik yetmezlikte doz azaltılmalıdır."
      };
    case "parasetamol":
      return {
        pregnancyCategory: "B",
        pregnancyNote: "Gebelikte en güvenli ağrı kesicidir (Kategori B).",
        breastfeedingNote: "Süte geçer, terapötik dozlarda güvenli kabul edilir.",
        renalNote: "Şiddetli renal yetmezlikte (GFR < 10 mL/dk) doz aralığı uzatılmalıdır (en az 6-8 saat).",
        hepaticNote: "Şiddetli karaciğer yetmezliğinde veya aktif alkolizmde günlük doz sınırlandırılmalıdır (maks 2g); hepatotoksisite riski vardır."
      };
    default:
      return defaultMeta;
  }
}


export interface FoodInteraction {
  id: string;
  drugId: string;
  substance: string;
  effect: string;
  severity: string;
}

export interface FoodInteractionResult {
  id: string;
  drugId: string;
  drugName: string;
  substance: string;
  effect: string;
  severity: "high" | "medium" | "low";
}

export function findFoodInteractions(drugIds: string[]): FoodInteractionResult[] {
  const resolvedIds = new Set<string>();
  for (const idOrName of drugIds) {
    if (drugsMap.has(idOrName)) {
      resolvedIds.add(idOrName);
      continue;
    }
    const lower = idOrName.toLowerCase().trim();
    const canonicalId = DRUG_ALIASES[lower];
    if (canonicalId) {
      resolvedIds.add(canonicalId);
    }
  }

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
    const resolvedDrugs = (resolvedDrugsCache as Drug[]) ?? await prisma.drug.findMany({
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

export interface ContraindicationResult {
  id: string;
  drugId: string;
  drugName: string;
  type: "disease" | "pregnancy" | "breastfeeding" | "renal" | "hepatic";
  severity: "high" | "medium" | "low";
  message: string;
  diseaseIcd?: string;
  diseaseName?: string;
}

export function findContraindications(drugIds: string[], patientContext?: PatientContext): ContraindicationResult[] {
  if (!patientContext) return [];
  
  const results: ContraindicationResult[] = [];
  
  const resolvedIds = new Set<string>();
  for (const idOrName of drugIds) {
    if (drugsMap.has(idOrName)) {
      resolvedIds.add(idOrName);
      continue;
    }
    const lower = idOrName.toLowerCase().trim();
    const canonicalId = DRUG_ALIASES[lower];
    if (canonicalId) {
      resolvedIds.add(canonicalId);
    }
  }
  
  if (patientContext && patientContext.diseases && Array.isArray(patientContext.diseases) && patientContext.diseases.length > 0) {
    for (const contra of (contraindicationsData as any[])) {
      if (resolvedIds.has(contra.drugId) && (patientContext as any).diseases.includes(contra.diseaseIcd)) {
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
  
  for (const drugId of Array.from(resolvedIds)) {
    const drug = drugsMap.get(drugId);
    if (!drug) continue;
    
    const meta = getDrugClinicalMetadata(drugId);
    
    if (patientContext.isPregnant) {
      if (meta.pregnancyCategory === "X") {
        results.push({
          id: `preg-contra-${drugId}`,
          drugId,
          drugName: drug.name,
          type: "pregnancy",
          severity: "high",
          message: `Gebelik Durumu Uyarısı: ${drug.name} gebelikte kesinlikle kontrendikedir (Kategori X). ${meta.pregnancyNote}`
        });
      } else if (meta.pregnancyCategory === "D") {
        results.push({
          id: `preg-contra-${drugId}`,
          drugId,
          drugName: drug.name,
          type: "pregnancy",
          severity: "high",
          message: `Gebelik Durumu Uyarısı: ${drug.name} gebelikte yüksek risklidir (Kategori D). ${meta.pregnancyNote}`
        });
      }
    }
    
    if (patientContext.isBreastfeeding) {
      if (drugId === "warfarin" || drugId === "aspirin" || drugId === "enalapril") {
        results.push({
          id: `lact-contra-${drugId}`,
          drugId,
          drugName: drug.name,
          type: "breastfeeding",
          severity: "medium",
          message: `Emzirme Uyarısı: ${drug.name} emzirme döneminde dikkatle kullanılmalıdır. ${meta.breastfeedingNote}`
        });
      }
    }
    
    if (patientContext.renalRisk) {
      if (drugId === "metformin") {
        results.push({
          id: `renal-contra-${drugId}`,
          drugId,
          drugName: drug.name,
          type: "renal",
          severity: "high",
          message: `Böbrek Yetmezliği Kontrendikasyonu: GFR < 30 ml/dk olan hastalarda Metformin birikimi laktik asidoza yol açabileceğinden kullanımı kesinlikle kontrendikedir.`
        });
      } else if (drugId === "ibuprofen" || drugId === "diklofenak" || drugId === "aspirin") {
        results.push({
          id: `renal-contra-${drugId}`,
          drugId,
          drugName: drug.name,
          type: "renal",
          severity: "high",
          message: `Böbrek Yetmezliği Kontrendikasyonu: ${drug.name} (NSAID) böbrek kan akımını azaltarak akut renal yetmezliği tetikleyebilir.`
        });
      }
    }
    
    if (patientContext.hepaticRisk) {
      if (drugId === "parasetamol") {
        results.push({
          id: `hepatic-contra-${drugId}`,
          drugId,
          drugName: drug.name,
          type: "hepatic",
          severity: "high",
          message: `Karaciğer Yetmezliği Uyarısı: Karaciğer yetmezliği olan hastalarda Parasetamol metabolizması yavaşlar; günlük doz 2 gramı aşmamalıdır.`
        });
      } else if (drugId === "warfarin") {
        results.push({
          id: `hepatic-contra-${drugId}`,
          drugId,
          drugName: drug.name,
          type: "hepatic",
          severity: "high",
          message: `Karaciğer Yetmezliği Kontrendikasyonu: Karaciğer yetmezliğinde pıhtılaşma faktörleri azaldığından Coumadin (Warfarin) kullanımı kanama riskini ölümcül düzeyde artırır.`
        });
      }
    }
  }
  
  return results;
}

export interface PatientContext {
  diseases?: string[];
  isPregnant?: boolean;
  isBreastfeeding?: boolean;
  renalRisk?: boolean;
  hepaticRisk?: boolean;
  ageGroup?: string;
  [key: string]: any;
}

export async function findContraindicationsDB(drugIds: string[], patientContext?: PatientContext, resolvedDrugsCache?: unknown[]): Promise<ContraindicationResult[]> {
  if (!patientContext) return [];
  
  const results: ContraindicationResult[] = [];
  
  try {
    const { prisma } = await import("@/lib/prisma");
    const resolvedDrugs = (resolvedDrugsCache as Drug[]) ?? await prisma.drug.findMany({
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
    
    const resolvedDrugIds = resolvedDrugs.map(d => d.id);
    const resolvedDrugsMap = new Map(resolvedDrugs.map(d => [d.id, d]));
    
    if (patientContext.diseases && Array.isArray(patientContext.diseases) && patientContext.diseases.length > 0) {
      const dbContras = await prisma.contraindication.findMany({
        where: {
          drugId: { in: resolvedDrugIds },
          diseaseIcd: { in: patientContext.diseases }
        }
      });
      
      if (dbContras.length > 0) {
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
    }
    
    for (const drug of resolvedDrugs) {
      const meta = getDrugClinicalMetadata(drug.id);
      
      if (patientContext.isPregnant) {
        if (meta.pregnancyCategory === "X") {
          results.push({
            id: `preg-contra-${drug.id}`,
            drugId: drug.id,
            drugName: drug.name,
            type: "pregnancy",
            severity: "high",
            message: `Gebelik Durumu Uyarısı: ${drug.name} gebelikte kesinlikle kontrendikedir (Kategori X). ${meta.pregnancyNote}`
          });
        } else if (meta.pregnancyCategory === "D") {
          results.push({
            id: `preg-contra-${drug.id}`,
            drugId: drug.id,
            drugName: drug.name,
            type: "pregnancy",
            severity: "high",
            message: `Gebelik Durumu Uyarısı: ${drug.name} gebelikte yüksek risklidir (Kategori D). ${meta.pregnancyNote}`
          });
        }
      }
      
      if (patientContext.isBreastfeeding) {
        if (drug.id === "warfarin" || drug.id === "aspirin" || drug.id === "enalapril") {
          results.push({
            id: `lact-contra-${drug.id}`,
            drugId: drug.id,
            drugName: drug.name,
            type: "breastfeeding",
            severity: "medium",
            message: `Emzirme Uyarısı: ${drug.name} emzirme döneminde dikkatle kullanılmalıdır. ${meta.breastfeedingNote}`
          });
        }
      }
      
      if (patientContext.renalRisk) {
        if (drug.id === "metformin") {
          results.push({
            id: `renal-contra-${drug.id}`,
            drugId: drug.id,
            drugName: drug.name,
            type: "renal",
            severity: "high",
            message: `Böbrek Yetmezliği Kontrendikasyonu: GFR < 30 ml/dk olan hastalarda Metformin birikimi laktik asidoza yol açabileceğinden kullanımı kesinlikle kontrendikedir.`
          });
        } else if (drug.id === "ibuprofen" || drug.id === "diklofenak" || drug.id === "aspirin") {
          results.push({
            id: `renal-contra-${drug.id}`,
            drugId: drug.id,
            drugName: drug.name,
            type: "renal",
            severity: "high",
            message: `Böbrek Yetmezliği Kontrendikasyonu: ${drug.name} (NSAID) böbrek kan akımını azaltarak akut renal yetmezliği tetikleyebilir.`
          });
        }
      }
      
      if (patientContext.hepaticRisk) {
        if (drug.id === "parasetamol") {
          results.push({
            id: `hepatic-contra-${drug.id}`,
            drugId: drug.id,
            drugName: drug.name,
            type: "hepatic",
            severity: "high",
            message: `Karaciğer Yetmezliği Uyarısı: Karaciğer yetmezliği olan hastalarda Parasetamol metabolizması yavaşlar; günlük doz 2 gramı aşmamalıdır.`
          });
        } else if (drug.id === "warfarin") {
          results.push({
            id: `hepatic-contra-${drug.id}`,
            drugId: drug.id,
            drugName: drug.name,
            type: "hepatic",
            severity: "high",
            message: `Karaciğer Yetmezliği Kontrendikasyonu: Karaciğer yetmezliğinde pıhtılaşma faktörleri azaldığından Coumadin (Warfarin) kullanımı kanama riskini ölümcül düzeyde artırır.`
          });
        }
      }
    }
    
    return results;
  } catch (error) {
    console.error("[PillMind CMIO Engine] Contraindications DB failed, falling back to local:", error);
    return findContraindications(drugIds, patientContext);
  }
}

export interface PolypharmacyReport {
  score: number;
  level: "low" | "medium" | "high";
  message: string;
  beersWarnings: string[];
}

export function checkPolypharmacyAndBeers(drugIds: string[], patientContext?: any): PolypharmacyReport {
  const score = drugIds.length;
  let level: "low" | "medium" | "high" = "low";
  let message = "Güvenli ilaç yükü. İlaç kombinasyonunuz polifarmasi sınırının altındadır.";
  
  if (score >= 4 && score < 6) {
    level = "medium";
    message = `Hafif Polifarmasi: Kutunuzda ${score} farklı ilaç bulunmaktadır. İlaç yükünüz artmış durumdadır, yan etki olasılığı yükselebilir.`;
  } else if (score >= 6) {
    level = "high";
    message = `Ciddi Polifarmasi: Kutunuzda ${score} farklı ilaç bulunmaktadır. Çoklu ilaç kullanımı nedeniyle ilaç-ilaç ve ilaç-besin etkileşim riski kritik düzeydedir. Tedavinizi hekiminizle gözden geçirin.`;
  }
  
  const beersWarnings: string[] = [];
  
  const resolvedIds = new Set<string>();
  for (const idOrName of drugIds) {
    if (drugsMap.has(idOrName)) {
      resolvedIds.add(idOrName);
      continue;
    }
    const lower = idOrName.toLowerCase().trim();
    const canonicalId = DRUG_ALIASES[lower];
    if (canonicalId) {
      resolvedIds.add(canonicalId);
    }
  }
  
  if (patientContext?.ageGroup === "elderly") {
    if (resolvedIds.has("aspirin") || resolvedIds.has("ibuprofen") || resolvedIds.has("diklofenak")) {
      beersWarnings.push("Beers Kriteri Uyarısı: NSAİİ grubu ağrı kesiciler (Aspirin, İbuprofen, Diklofenak) 65 yaş üstü hastalarda gastrointestinal kanama ve akut böbrek hasarı riskini ciddi derecede artırdığı için Beers Kriterleri kapsamında kaçınılması gereken ilaçlar sınıfındadır.");
    }
    if (resolvedIds.has("metformin") && patientContext.renalRisk) {
      beersWarnings.push("Beers Kriteri Uyarısı: Böbrek yetmezliği riski taşıyan 65 yaş üstü yaşlı hastalarda Metformin, laktik asidoz riskini artırdığı için çok dikkatli kullanılmalıdır.");
    }
  }
  
  return {
    score,
    level,
    message,
    beersWarnings
  };
}
