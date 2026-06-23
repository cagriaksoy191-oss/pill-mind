// prisma/seed.ts
import { PrismaClient, Severity, Status, EvidenceLevel } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

interface DrugMock {
  id: string;
  name: string;
  activeIngredient: string;
  category: string;
  notes?: string;
  pharmacologicalGroup?: string;
}

interface InteractionMock {
  id: string;
  drug1: string;
  drug2: string;
  severity: "high" | "medium" | "low";
  summary: string;
  source: string;
  sourceLabel: string;
  evidenceLevel?: string;
}

async function main() {
  console.log("🌱 Veritabanı tohumlama işlemi başladı...");

  // 1. Mevcut verileri temizle (Önce ilişkili tablolar)
  await prisma.foodInteraction.deleteMany({});
  await prisma.contraindication.deleteMany({});
  await prisma.drugInteraction.deleteMany({});
  await prisma.brandName.deleteMany({});
  await prisma.drug.deleteMany({});

  console.log("🧹 Eski veriler temizlendi.");

  // 2. İlaçları Oku ve Ekle
  const drugsFilePath = path.join(process.cwd(), "data", "drugs.json");
  const drugsData: DrugMock[] = JSON.parse(
    fs.readFileSync(drugsFilePath, "utf-8"),
  );

  const drugIdMap: Record<string, string> = {};
  const drugNameMap: Record<string, string> = {};

  const drugsToCreate = [];
  const brandNamesToCreate = [];

  for (const item of drugsData) {
    drugsToCreate.push({
      id: item.id,
      name: item.name,
      activeIngredient: item.activeIngredient,
      category: item.category,
      description: item.notes || "",
      status: Status.VERIFIED,
      pharmacologicalGroup: item.pharmacologicalGroup || null,
    });

    drugIdMap[item.id] = item.id;
    drugNameMap[item.id] = item.name;

    brandNamesToCreate.push({
      name: item.name,
      drugId: item.id,
    });

    if (item.id === "aspirin") {
      brandNamesToCreate.push({ name: "Coraspin", drugId: item.id });
      brandNamesToCreate.push({ name: "Ecopirin", drugId: item.id });
    } else if (item.id === "parasetamol") {
      brandNamesToCreate.push({ name: "Parol", drugId: item.id });
      brandNamesToCreate.push({ name: "Calpol", drugId: item.id });
      brandNamesToCreate.push({ name: "Tylol", drugId: item.id });
    } else if (item.id === "ibuprofen") {
      brandNamesToCreate.push({ name: "Nurofen", drugId: item.id });
      brandNamesToCreate.push({ name: "Dolorex", drugId: item.id });
      brandNamesToCreate.push({ name: "Advil", drugId: item.id });
    } else if (item.id === "warfarin") {
      brandNamesToCreate.push({ name: "Coumadin", drugId: item.id });
    }
  }

  if (drugsToCreate.length > 0) {
    const startDrugs = performance.now();
    // ⚡ Performance Note: Resolved N+1 query vulnerability by using bulk insert (createMany). This reduces database roundtrips from O(N) to O(1).
    await prisma.drug.createMany({ data: drugsToCreate });
    const endDrugs = performance.now();
    console.log(`⚡ Inserted drugs in ${(endDrugs - startDrugs).toFixed(2)}ms`);
  }

  if (brandNamesToCreate.length > 0) {
    const startBrandNames = performance.now();
    await prisma.brandName.createMany({ data: brandNamesToCreate });
    const endBrandNames = performance.now();
    console.log(`⚡ Inserted brand names in ${(endBrandNames - startBrandNames).toFixed(2)}ms`);
  }

  console.log(
    `📦 ${Object.keys(drugIdMap).length} adet temel ilaç ve alternatif marka isimleri yüklendi.`,
  );

  // 3. Etkileşimleri Oku ve Ekle
  const interactionsFilePath = path.join(
    process.cwd(),
    "data",
    "interactions.json",
  );
  const interactionsData: InteractionMock[] = JSON.parse(
    fs.readFileSync(interactionsFilePath, "utf-8"),
  );

  let interactionCount = 0;
  const interactionsToCreate = [];
  for (const item of interactionsData) {
    const drug1Id = drugIdMap[item.drug1];
    const drug2Id = drugIdMap[item.drug2];

    if (!drug1Id || !drug2Id) {
      console.warn(
        `⚠️ İlaç bulunamadığı için etkileşim atlandı: ${item.drug1} - ${item.drug2}`,
      );
      continue;
    }

    // Prisma enum dönüşümü
    let severityEnum: Severity = Severity.LOW;
    if (item.severity === "high") severityEnum = Severity.HIGH;
    else if (item.severity === "medium") severityEnum = Severity.MEDIUM;

    let evidenceLevelEnum: EvidenceLevel = EvidenceLevel.FDA_APPROVED;
    if (item.evidenceLevel === "CLINICAL_GUIDELINE") {
      evidenceLevelEnum = EvidenceLevel.CLINICAL_GUIDELINE;
    } else if (item.evidenceLevel === "PUBMED_CASE") {
      evidenceLevelEnum = EvidenceLevel.PUBMED_CASE;
    } else if (item.evidenceLevel === "OBSERVATIONAL") {
      evidenceLevelEnum = EvidenceLevel.OBSERVATIONAL;
    }

    const drug1Name = drugNameMap[item.drug1] ?? item.drug1;
    const drug2Name = drugNameMap[item.drug2] ?? item.drug2;

    interactionsToCreate.push({
      drug1Id,
      drug2Id,
      severity: severityEnum,
      summary: item.summary,
      clinicalDetail: `${drug1Name} ve ${drug2Name} kombinasyonu ${item.severity === "high" ? "yüksek riskli" : "orta riskli"} yan etkilere yol açabilir. Kaynak: ${item.source}`,
      source: item.source,
      sourceLabel: item.sourceLabel,
      verificationStatus: Status.VERIFIED,
      evidenceLevel: evidenceLevelEnum,
    });
  }

  if (interactionsToCreate.length > 0) {
    const startInteractions = performance.now();
    const result = await prisma.drugInteraction.createMany({
      data: interactionsToCreate,
    });
    const endInteractions = performance.now();
    console.log(`⚡ Inserted drug interactions in ${(endInteractions - startInteractions).toFixed(2)}ms`);
    interactionCount = result.count;
  }

  console.log(
    `🔗 ${interactionCount} adet doğrulanmış ilaç-ilaç etkileşim kaydı yüklendi.`,
  );

  // 4. Örnek Besin Etkileşimleri (Food Interactions) Ekle
  const warfarinId = drugIdMap["warfarin"];
  if (warfarinId) {
    const startFoodInteractions = performance.now();
    await prisma.foodInteraction.createMany({
      data: [
        {
          drugId: warfarinId,
          substance: "Greyfurt Suyu",
          effect:
            "Warfarin metabolizmasını etkileyerek kanama riskini artırabilir.",
          severity: Severity.HIGH,
        },
        {
          drugId: warfarinId,
          substance: "K Vitamini Zengin Gıdalar (Ispanak, Brokoli)",
          effect:
            "İlacın kan sulandırıcı etkisini azaltarak pıhtılaşma riskini artırabilir.",
          severity: Severity.MEDIUM,
        },
      ],
    });
    const endFoodInteractions = performance.now();
    console.log(`⚡ Inserted food interactions in ${(endFoodInteractions - startFoodInteractions).toFixed(2)}ms`);
    console.log("🥗 Warfarin için besin etkileşimleri eklendi.");
  }

  console.log("🏁 Tohumlama başarıyla tamamlandı!");
}

main()
  .catch((e) => {
    console.error("❌ Tohumlama sırasında bir hata oluştu:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
