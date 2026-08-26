import { PatientContext, PolypharmacyReport } from "./types";
import { drugsMap, DRUG_ALIASES } from "./data";

const resolveCache = new Map<string, string>();
const MAX_CACHE_SIZE = 5000;

function resolveDrugIds(drugIds: string[]): Set<string> {
  const resolvedIds = new Set<string>();
  for (const idOrName of drugIds) {
    if (drugsMap.has(idOrName)) {
      resolvedIds.add(idOrName);
      continue;
    }

    let canonicalId = resolveCache.get(idOrName);
    if (canonicalId === undefined) {
      if (resolveCache.size >= MAX_CACHE_SIZE) {
        resolveCache.clear();
      }
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

export function checkPolypharmacyAndBeers(drugIds: string[], patientContext?: PatientContext): PolypharmacyReport {
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

  const resolvedIds = resolveDrugIds(drugIds);

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
