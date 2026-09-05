import { DrugClinicalMetadata } from "./types";

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

const DEFAULT_CLINICAL_METADATA: DrugClinicalMetadata = Object.freeze({
  pregnancyCategory: "C",
  pregnancyNote: "Yeterli insan çalışması yoktur, potansiyel yarar risklerden fazlaysa kullanılabilir.",
  breastfeedingNote: "Emzirme döneminde kullanırken dikkatli olunmalı, bebek izlenmelidir.",
  renalNote: "Böbrek yetmezliğinde doz ayarlaması veya takip önerilebilir.",
  hepaticNote: "Karaciğer yetmezliğinde dikkatli kullanılmalı, fonksiyonlar izlenmelidir."
});

const CLINICAL_METADATA_MAP: Map<string, DrugClinicalMetadata> = new Map<string, DrugClinicalMetadata>([
  [
    "aspirin",
    Object.freeze({
      pregnancyCategory: "D",
      pregnancyNote: "3. trimesterde kontrendikedir (Kategori D/X). Kanama riskini artırır ve duktus arteriozusun erken kapanmasına yol açabilir.",
      breastfeedingNote: "Salisilatlar süte geçer. Emziren annelerde kullanımı önerilmez.",
      renalNote: "Ciddi böbrek yetmezliğinde kontrendikedir. Böbrek fonksiyonlarını bozabilir.",
      hepaticNote: "Karaciğer yetmezliğinde kanama riski nedeniyle dikkatli kullanılmalıdır."
    })
  ],
  [
    "warfarin",
    Object.freeze({
      pregnancyCategory: "X",
      pregnancyNote: "Gebelikte kesinlikle kontrendikedir (Kategori X). Teratojenik etki ve fetal kanama riski vardır.",
      breastfeedingNote: "Çok az miktarda süte geçer, genellikle güvenli kabul edilse de bebek izlenmelidir.",
      renalNote: "Renal eliminasyonu düşüktür ancak renal hasarda kanama riski takibi gerektirir.",
      hepaticNote: "Karaciğer yetmezliğinde pıhtılaşma faktörleri azaldığı için kanama riski aşırı artar."
    })
  ],
  [
    "metformin",
    Object.freeze({
      pregnancyCategory: "B",
      pregnancyNote: "Gebelikte genellikle güvenli kabul edilir (Kategori B). Ancak insülin tercih edilebilir.",
      breastfeedingNote: "Az miktarda süte geçer, emzirme döneminde kullanılabilir.",
      renalNote: "GFR < 30 mL/dk olan şiddetli renal yetmezlikte kesinlikle kontrendikedir (Laktik asidoz riski).",
      hepaticNote: "Karaciğer yetmezliğinde laktik asidoz riski nedeniyle kullanımı önerilmez."
    })
  ],
  [
    "enalapril",
    Object.freeze({
      pregnancyCategory: "D",
      pregnancyNote: "Gebelikte kesinlikle kontrendikedir (Kategori D). Fetal böbrek hasarı, oligohidramniyos ve kafatası kemik anomalilerine yol açabilir.",
      breastfeedingNote: "Az miktarda süte geçer, dikkatle kullanılabilir.",
      renalNote: "Böbrek yetmezliğinde doz azaltımı gerekir. Hiperkalemi riskini artırır.",
      hepaticNote: "Karaciğer yetmezliğinde ön ilaç olan enalaprilin aktif forma dönüşümü azalabilir."
    })
  ],
  [
    "amoksisilin",
    Object.freeze({
      pregnancyCategory: "B",
      pregnancyNote: "Gebelikte güvenlidir (Kategori B). Yaygın olarak kullanılır.",
      breastfeedingNote: "Süte geçer, bebekte ishal veya mantar riski takip edilerek kullanılabilir.",
      renalNote: "GFR < 30 mL/dk ise doz aralığı uzatılmalıdır.",
      hepaticNote: "Karaciğer yetmezliğinde doz ayarlamasına gerek yoktur."
    })
  ],
  [
    "omeprazol",
    Object.freeze({
      pregnancyCategory: "C",
      pregnancyNote: "Potansiyel yarar risklerden fazlaysa kullanılabilir (Kategori C).",
      breastfeedingNote: "Süte geçer, dikkatle kullanılmalıdır.",
      renalNote: "Doz ayarlamasına gerek yoktur.",
      hepaticNote: "Şiddetli karaciğer yetmezliğinde doz kısıtlaması (günlük maks 20mg) önerilir."
    })
  ],
  [
    "ibuprofen",
    Object.freeze({
      pregnancyCategory: "C",
      pregnancyNote: "3. trimesterde kesinlikle kontrendikedir (Kategori D/X). Doğum sancısını geciktirebilir ve fetal kanamaya yol açabilir.",
      breastfeedingNote: "Çok az miktarda süte geçer, emzirme döneminde kısa süreli kullanılabilir.",
      renalNote: "Ciddi böbrek yetmezliğinde kontrendikedir. Akut böbrek hasarını tetikleyebilir.",
      hepaticNote: "Karaciğer yetmezliğinde dikkatle kullanılmalıdır."
    })
  ],
  [
    "diklofenak",
    Object.freeze({
      pregnancyCategory: "C",
      pregnancyNote: "3. trimesterde kesinlikle kontrendikedir (Kategori D/X). Fetal duktus arteriozusun erken kapanmasına neden olur.",
      breastfeedingNote: "Süte çok az miktarda geçer, kısa süreli kullanılabilir.",
      renalNote: "Ciddi renal yetmezlikte kontrendikedir. Böbrek yetmezliğini kötüleştirebilir.",
      hepaticNote: "Hepatotoksisite riski vardır, karaciğer fonksiyonları izlenmelidir."
    })
  ],
  [
    "metoprolol",
    Object.freeze({
      pregnancyCategory: "C",
      pregnancyNote: "Fetal perfüzyonu azaltabilir. Yeni doğanda bradikardi ve hipoglisemi riski nedeniyle takip gerektirir.",
      breastfeedingNote: "Süte geçer, bebek bradikardi açısından izlenmelidir.",
      renalNote: "Doz ayarlamasına gerek yoktur.",
      hepaticNote: "Karaciğerde yoğun metabolize olur, hepatik yetmezlikte doz azaltılmalıdır."
    })
  ],
  [
    "parasetamol",
    Object.freeze({
      pregnancyCategory: "B",
      pregnancyNote: "Gebelikte en güvenli ağrı kesicidir (Kategori B).",
      breastfeedingNote: "Süte geçer, terapötik dozlarda güvenli kabul edilir.",
      renalNote: "Şiddetli renal yetmezlikte (GFR < 10 mL/dk) doz aralığı uzatılmalıdır (en az 6-8 saat).",
      hepaticNote: "Şiddetli karaciğer yetmezliğinde veya aktif alkolizmde günlük doz sınırlandırılmalıdır (maks 2g); hepatotoksisite riski vardır."
    })
  ]
]);

export function getDrugClinicalMetadata(drugId: string): DrugClinicalMetadata {
  if (!drugId) {
    return DEFAULT_CLINICAL_METADATA;
  }
  const key = drugId.toLowerCase().trim();
  return CLINICAL_METADATA_MAP.get(key) ?? DEFAULT_CLINICAL_METADATA;
}

export function getBatchDrugClinicalMetadata(drugIds: string[]): Map<string, DrugClinicalMetadata> {
  const metadataBatchMap: Map<string, DrugClinicalMetadata> = new Map<string, DrugClinicalMetadata>();
  for (let i = 0; i < drugIds.length; i++) {
    const id = drugIds[i];
    if (!metadataBatchMap.has(id)) {
      metadataBatchMap.set(id, getDrugClinicalMetadata(id));
    }
  }
  return metadataBatchMap;
}
