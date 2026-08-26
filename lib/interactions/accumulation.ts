import { Drug, AccumulationWarning } from "./types";
import { drugsMap } from "./data";
import { resolveDrugsDB } from "./interactions";

/**
 * Local drug accumulation and overdose warning algorithm.
 */
export function checkAccumulation(drugIds: string[]): AccumulationWarning[] {
  if (!Array.isArray(drugIds) || drugIds.length < 2) {
    return [];
  }

  const warnings: AccumulationWarning[] = [];

  const ingredientMap = new Map<string, { count: number; names: string[]; activeIngredient: string }>();
  const groupMap = new Map<string, { count: number; names: string[]; groupName: string; uniqueIngredients: Set<string> }>();

  for (const id of drugIds) {
    const drug = drugsMap.get(id);
    if (!drug) continue;

    const ingredientKey = drug.activeIngredient.toLowerCase().trim();

    // 1. Aynı Etken Madde Çakışması
    let ingData = ingredientMap.get(ingredientKey);
    if (ingData === undefined) {
      ingData = { count: 1, names: [drug.name], activeIngredient: drug.activeIngredient };
      ingredientMap.set(ingredientKey, ingData);
    } else {
      ingData.count++;
      ingData.names.push(drug.name);
    }

    // 2. Aynı Farmakolojik Grup
    if (drug.pharmacologicalGroup) {
      const groupKey = drug.pharmacologicalGroup.toUpperCase().trim();
      let groupData = groupMap.get(groupKey);
      if (groupData === undefined) {
        groupData = {
          count: 1,
          names: [drug.name],
          groupName: drug.pharmacologicalGroup,
          uniqueIngredients: new Set([ingredientKey])
        };
        groupMap.set(groupKey, groupData);
      } else {
        groupData.count++;
        groupData.names.push(drug.name);
        groupData.uniqueIngredients.add(ingredientKey);
      }
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
 * Asynchronous drug accumulation and overdose warning algorithm using database.
 */
export async function checkAccumulationDB(drugIds: string[], resolvedDrugsCache?: unknown[]): Promise<AccumulationWarning[]> {
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes("[SIFRE]")) {
    return checkAccumulation(drugIds);
  }

  try {
    let resolvedDrugs = resolvedDrugsCache as Drug[];
    if (!resolvedDrugsCache || !Array.isArray(resolvedDrugsCache) || resolvedDrugsCache.length === 0) {
      resolvedDrugs = await resolveDrugsDB(drugIds);
    }

    const warnings: AccumulationWarning[] = [];

    const ingredientMap = new Map<string, { count: number; names: string[]; activeIngredient: string }>();
    const groupMap = new Map<string, { count: number; names: string[]; groupName: string; uniqueIngredients: Set<string> }>();

    for (let i = 0; i < resolvedDrugs.length; i++) {
      const drug = resolvedDrugs[i] as Drug;
      const ingredientKey = drug.activeIngredient.toLowerCase().trim();

      // 1. Aynı Etken Madde Çakışması
      let ingData = ingredientMap.get(ingredientKey);
      if (ingData === undefined) {
        ingData = { count: 1, names: [drug.name], activeIngredient: drug.activeIngredient };
        ingredientMap.set(ingredientKey, ingData);
      } else {
        ingData.count++;
        ingData.names.push(drug.name);
      }

      // 2. Aynı Farmakolojik Grup Birikimi
      if (drug.pharmacologicalGroup) {
        const groupKey = drug.pharmacologicalGroup.toUpperCase().trim();
        let groupData = groupMap.get(groupKey);
        if (groupData === undefined) {
          groupData = {
            count: 1,
            names: [drug.name],
            groupName: drug.pharmacologicalGroup,
            uniqueIngredients: new Set([ingredientKey])
          };
          groupMap.set(groupKey, groupData);
        } else {
          groupData.count++;
          groupData.names.push(drug.name);
          groupData.uniqueIngredients.add(ingredientKey);
        }
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
    console.error("[Accumulation DB] Hata, lokale düşülüyor:", error);
    return checkAccumulation(drugIds);
  }
}
