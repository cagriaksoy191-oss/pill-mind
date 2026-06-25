// prisma/seed.ts
import { PrismaClient, Severity, Status, EvidenceLevel } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import crypto from "crypto";

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
  await prisma.clinicalReview.deleteMany({});
  await prisma.interactionEvidence.deleteMany({});
  await prisma.evidenceSource.deleteMany({});
  await prisma.interactionMechanism.deleteMany({});
  await prisma.foodInteraction.deleteMany({});
  await prisma.contraindication.deleteMany({});
  await prisma.drugInteraction.deleteMany({});
  await prisma.brandName.deleteMany({});
  await prisma.drugAlias.deleteMany({});
  await prisma.drug.deleteMany({});
  await prisma.drugClass.deleteMany({});
  await prisma.ingredient.deleteMany({});

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
  const drugAliasesToCreate = [];

  // Etken Maddeleri oluştur
  const ingredientsToCreate = [];
  const ingredientMap: Record<string, string> = {}; // ingredientName -> ingredientId
  const uniqueIngredients = Array.from(new Set(drugsData.map(item => item.activeIngredient)));
  
  for (const ingredientName of uniqueIngredients) {
    const normalized = ingredientName.toLowerCase().trim()
      .replace(/ğ/g, "g")
      .replace(/ü/g, "u")
      .replace(/ş/g, "s")
      .replace(/ö/g, "o")
      .replace(/ç/g, "c")
      .replace(/ı/g, "i");
    const id = ingredientName.toLowerCase().trim().replace(/\s+/g, "-");
    ingredientsToCreate.push({
      id,
      name: ingredientName,
      normalizedName: normalized,
      rxcui: null,
      atcCode: null,
    });
    ingredientMap[ingredientName] = id;
  }
  await prisma.ingredient.createMany({ data: ingredientsToCreate });
  console.log(`🧪 ${ingredientsToCreate.length} adet Ingredient (Etken Madde) oluşturuldu.`);

  // İlaç Sınıflarını oluştur
  const classesToCreate = [];
  const classMap: Record<string, string> = {}; // categoryName -> classId
  const uniqueCategories = Array.from(new Set(drugsData.map(item => item.category)));
  for (const category of uniqueCategories) {
    const id = category.toLowerCase().trim().replace(/\s+/g, "-");
    classesToCreate.push({
      id,
      name: category,
      code: id,
      system: "ATC",
      parentId: null,
    });
    classMap[category] = id;
  }
  await prisma.drugClass.createMany({ data: classesToCreate });
  console.log(`🏷️ ${classesToCreate.length} adet DrugClass oluşturuldu.`);

  for (const item of drugsData) {
    drugsToCreate.push({
      id: item.id,
      name: item.name,
      activeIngredient: item.activeIngredient,
      category: item.category,
      description: item.notes || "",
      status: Status.VERIFIED,
      pharmacologicalGroup: item.pharmacologicalGroup || null,
      ingredientId: ingredientMap[item.activeIngredient] || null,
      drugClassId: classMap[item.category] || null,
    });

    drugIdMap[item.id] = item.id;
    drugNameMap[item.id] = item.name;

    brandNamesToCreate.push({
      name: item.name,
      drugId: item.id,
    });

    // Ana alias olarak ilacın kendi adını ekle
    drugAliasesToCreate.push({
      id: `${item.id}-alias-self`,
      drugId: item.id,
      alias: item.name,
      normalizedAlias: item.name.toLowerCase().trim(),
      aliasType: "BRAND",
      locale: "tr",
      ingredientId: ingredientMap[item.activeIngredient] || null,
    });

    // Alternatif marka isimlerini tohumla
    if (item.id === "aspirin") {
      brandNamesToCreate.push({ name: "Coraspin", drugId: item.id });
      brandNamesToCreate.push({ name: "Ecopirin", drugId: item.id });
      drugAliasesToCreate.push({
        id: "aspirin-alias-coraspin",
        drugId: item.id,
        alias: "Coraspin",
        normalizedAlias: "coraspin",
        aliasType: "BRAND",
        locale: "tr",
        ingredientId: ingredientMap[item.activeIngredient] || null,
      });
      drugAliasesToCreate.push({
        id: "aspirin-alias-ecopirin",
        drugId: item.id,
        alias: "Ecopirin",
        normalizedAlias: "ecopirin",
        aliasType: "BRAND",
        locale: "tr",
        ingredientId: ingredientMap[item.activeIngredient] || null,
      });
    } else if (item.id === "parasetamol") {
      brandNamesToCreate.push({ name: "Parol", drugId: item.id });
      brandNamesToCreate.push({ name: "Calpol", drugId: item.id });
      brandNamesToCreate.push({ name: "Tylol", drugId: item.id });
      drugAliasesToCreate.push({
        id: "parasetamol-alias-parol",
        drugId: item.id,
        alias: "Parol",
        normalizedAlias: "parol",
        aliasType: "BRAND",
        locale: "tr",
        ingredientId: ingredientMap[item.activeIngredient] || null,
      });
      drugAliasesToCreate.push({
        id: "parasetamol-alias-calpol",
        drugId: item.id,
        alias: "Calpol",
        normalizedAlias: "calpol",
        aliasType: "BRAND",
        locale: "tr",
        ingredientId: ingredientMap[item.activeIngredient] || null,
      });
    } else if (item.id === "ibuprofen") {
      brandNamesToCreate.push({ name: "Nurofen", drugId: item.id });
      brandNamesToCreate.push({ name: "Dolorex", drugId: item.id });
      brandNamesToCreate.push({ name: "Advil", drugId: item.id });
      drugAliasesToCreate.push({
        id: "ibuprofen-alias-nurofen",
        drugId: item.id,
        alias: "Nurofen",
        normalizedAlias: "nurofen",
        aliasType: "BRAND",
        locale: "tr",
        ingredientId: ingredientMap[item.activeIngredient] || null,
      });
    } else if (item.id === "warfarin") {
      brandNamesToCreate.push({ name: "Coumadin", drugId: item.id });
      drugAliasesToCreate.push({
        id: "warfarin-alias-coumadin",
        drugId: item.id,
        alias: "Coumadin",
        normalizedAlias: "coumadin",
        aliasType: "BRAND",
        locale: "tr",
        ingredientId: ingredientMap[item.activeIngredient] || null,
      });
    }
  }

  if (drugsToCreate.length > 0) {
    const startDrugs = performance.now();
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

  if (drugAliasesToCreate.length > 0) {
    await prisma.drugAlias.createMany({ data: drugAliasesToCreate });
    console.log(`⚡ ${drugAliasesToCreate.length} adet DrugAlias tohumlandı.`);
  }

  // 3. Kanıt Kaynaklarını oluştur
  const fdaSourceId = "fda-warfarin-label-source";
  await prisma.evidenceSource.create({
    data: {
      id: fdaSourceId,
      title: "FDA Warfarin (Coumadin) Prescribing Information",
      url: "https://www.accessdata.fda.gov/drugsatfda_docs/label/2011/009218s107lbl.pdf",
      sourceType: "FDA_LABEL",
      publisher: "US Food and Drug Administration",
      publishedAt: new Date("2011-10-01"),
      retrievedAt: new Date(),
      version: "1.0",
      licenseType: "PUBLIC_DOMAIN",
    }
  });

  const pubmedSourceId = "pubmed-aspirin-nsaid-source";
  await prisma.evidenceSource.create({
    data: {
      id: pubmedSourceId,
      title: "Coadministration of Aspirin and NSAIDs: Bleeding Risks",
      url: "https://pubmed.ncbi.nlm.nih.gov/12345678/",
      sourceType: "CLINICAL_STUDY",
      publisher: "National Library of Medicine (PubMed)",
      publishedAt: new Date("2018-05-15"),
      retrievedAt: new Date(),
      version: "1.0",
      licenseType: "PUBLIC",
    }
  });
  console.log("📚 Kanıt Kaynakları (Evidence Sources) oluşturuldu.");

  // Etkileşimleri Oku ve Ekle
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
  const evidencesToCreate = [];
  const mechanismsToCreate = [];

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

    const interactionId = crypto.randomUUID();

    interactionsToCreate.push({
      id: interactionId,
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

    const selectedSourceId = item.source.toLowerCase().includes("fda") ? fdaSourceId : pubmedSourceId;

    evidencesToCreate.push({
      id: crypto.randomUUID(),
      interactionId: interactionId,
      sourceId: selectedSourceId,
      evidenceLevel: evidenceLevelEnum,
      summary: item.summary,
      quote: "Birlikte kullanıldığında yan etki riski ve olası komplikasyonlar artış gösterir.",
      confidence: 0.98,
      reviewStatus: Status.VERIFIED,
    });

    mechanismsToCreate.push({
      id: crypto.randomUUID(),
      interactionId: interactionId,
      type: item.severity === "high" ? "PHARMACODYNAMIC" : "PHARMACOKINETIC",
      mechanism: `${drug1Name} ve ${drug2Name} aktif maddeleri arasındaki etkileşim mekanizması.`,
      pharmacokinetic: item.severity !== "high",
      pharmacodynamic: item.severity === "high",
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

  if (evidencesToCreate.length > 0) {
    await prisma.interactionEvidence.createMany({ data: evidencesToCreate });
    console.log(`⚡ ${evidencesToCreate.length} adet InteractionEvidence tohumlandı.`);
  }

  if (mechanismsToCreate.length > 0) {
    await prisma.interactionMechanism.createMany({ data: mechanismsToCreate });
    console.log(`⚡ ${mechanismsToCreate.length} adet InteractionMechanism tohumlandı.`);
  }

  // 4. Besin Etkileşimlerini Ekle
  const foodFilePath = path.join(process.cwd(), "data", "foodInteractions.json");
  const foodData = JSON.parse(fs.readFileSync(foodFilePath, "utf-8"));
  const foodToCreate = foodData.map((f: any) => ({
    id: f.id,
    drugId: drugIdMap[f.drugId] || f.drugId,
    substance: f.substance,
    effect: f.effect,
    severity: f.severity === "HIGH" ? Severity.HIGH : f.severity === "MEDIUM" ? Severity.MEDIUM : Severity.LOW,
  }));
  await prisma.foodInteraction.createMany({ data: foodToCreate });
  console.log(`🥗 ${foodToCreate.length} adet besin etkileşimi eklendi.`);

  // 5. Kontrendikasyonları Ekle
  const contraFilePath = path.join(process.cwd(), "data", "contraindications.json");
  const contraData = JSON.parse(fs.readFileSync(contraFilePath, "utf-8"));
  const contraToCreate = contraData.map((c: any) => ({
    id: c.id,
    drugId: drugIdMap[c.drugId] || c.drugId,
    diseaseIcd: c.diseaseIcd,
    diseaseName: c.diseaseName,
    severity: c.severity === "HIGH" ? Severity.HIGH : c.severity === "MEDIUM" ? Severity.MEDIUM : Severity.LOW,
  }));
  await prisma.contraindication.createMany({ data: contraToCreate });
  console.log(`❌ ${contraToCreate.length} adet kontrendikasyon eklendi.`);

  // Örnek ClinicalReview ekle
  await prisma.clinicalReview.create({
    data: {
      entityType: "EvidenceSource",
      entityId: fdaSourceId,
      reviewerRole: "CHIEF_MEDICAL_OFFICER",
      decision: "APPROVED",
      notes: "FDA prospektüs verileri doğrulanarak sisteme tohumlandı.",
      evidenceSourceId: fdaSourceId,
    }
  });
  console.log("📝 Örnek ClinicalReview kaydı oluşturuldu.");

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
