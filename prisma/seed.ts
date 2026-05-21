// prisma/seed.ts
import { PrismaClient, Severity, Status } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

interface DrugMock {
  id: string;
  name: string;
  activeIngredient: string;
  category: string;
  notes?: string;
}

interface InteractionMock {
  id: string;
  drug1: string;
  drug2: string;
  severity: "high" | "medium" | "low";
  summary: string;
  source: string;
  sourceLabel: string;
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
  const drugsData: DrugMock[] = JSON.parse(fs.readFileSync(drugsFilePath, "utf-8"));

  const drugIdMap: Record<string, string> = {};

  for (const item of drugsData) {
    const createdDrug = await prisma.drug.create({
      data: {
        id: item.id, // ID'leri sabit tutarak eşleştirmeleri kolaylaştırıyoruz
        name: item.name,
        activeIngredient: item.activeIngredient,
        category: item.category,
        description: item.notes || "",
        status: Status.VERIFIED,
      },
    });

    drugIdMap[item.id] = createdDrug.id;

    // Her ilacın kendi adını bir marka adı olarak da ekle (Kolay arama için)
    await prisma.brandName.create({
      data: {
        name: item.name,
        drugId: createdDrug.id,
      },
    });

    // Alternatif marka isimleri ekleyelim (Örnek zenginleştirme)
    if (item.id === "aspirin") {
      await prisma.brandName.create({ data: { name: "Coraspin", drugId: createdDrug.id } });
      await prisma.brandName.create({ data: { name: "Ecopirin", drugId: createdDrug.id } });
    } else if (item.id === "parasetamol") {
      await prisma.brandName.create({ data: { name: "Parol", drugId: createdDrug.id } });
      await prisma.brandName.create({ data: { name: "Calpol", drugId: createdDrug.id } });
      await prisma.brandName.create({ data: { name: "Tylol", drugId: createdDrug.id } });
    } else if (item.id === "ibuprofen") {
      await prisma.brandName.create({ data: { name: "Nurofen", drugId: createdDrug.id } });
      await prisma.brandName.create({ data: { name: "Dolorex", drugId: createdDrug.id } });
      await prisma.brandName.create({ data: { name: "Advil", drugId: createdDrug.id } });
    } else if (item.id === "warfarin") {
      await prisma.brandName.create({ data: { name: "Coumadin", drugId: createdDrug.id } });
    }
  }

  console.log(`📦 ${Object.keys(drugIdMap).length} adet temel ilaç ve alternatif marka isimleri yüklendi.`);

  // 3. Etkileşimleri Oku ve Ekle
  const interactionsFilePath = path.join(process.cwd(), "data", "interactions.json");
  const interactionsData: InteractionMock[] = JSON.parse(
    fs.readFileSync(interactionsFilePath, "utf-8")
  );

  let interactionCount = 0;
  for (const item of interactionsData) {
    const drug1Id = drugIdMap[item.drug1];
    const drug2Id = drugIdMap[item.drug2];

    if (!drug1Id || !drug2Id) {
      console.warn(`⚠️ İlaç bulunamadığı için etkileşim atlandı: ${item.drug1} - ${item.drug2}`);
      continue;
    }

    // Prisma enum dönüşümü
    let severityEnum: Severity = Severity.LOW;
    if (item.severity === "high") severityEnum = Severity.HIGH;
    else if (item.severity === "medium") severityEnum = Severity.MEDIUM;

    const drug1Name = drugsData.find((d) => d.id === item.drug1)?.name ?? item.drug1;
    const drug2Name = drugsData.find((d) => d.id === item.drug2)?.name ?? item.drug2;

    await prisma.drugInteraction.create({
      data: {
        drug1Id,
        drug2Id,
        severity: severityEnum,
        summary: item.summary,
        clinicalDetail: `${drug1Name} ve ${drug2Name} kombinasyonu ${item.severity === "high" ? "yüksek riskli" : "orta riskli"} yan etkilere yol açabilir. Kaynak: ${item.source}`,
        source: item.source,
        sourceLabel: item.sourceLabel,
        verificationStatus: Status.VERIFIED,
      },
    });
    interactionCount++;
  }

  console.log(`🔗 ${interactionCount} adet doğrulanmış ilaç-ilaç etkileşim kaydı yüklendi.`);

  // 4. Örnek Besin Etkileşimleri (Food Interactions) Ekle
  const warfarinId = drugIdMap["warfarin"];
  if (warfarinId) {
    await prisma.foodInteraction.createMany({
      data: [
        {
          drugId: warfarinId,
          substance: "Greyfurt Suyu",
          effect: "Warfarin metabolizmasını etkileyerek kanama riskini artırabilir.",
          severity: Severity.HIGH,
        },
        {
          drugId: warfarinId,
          substance: "K Vitamini Zengin Gıdalar (Ispanak, Brokoli)",
          effect: "İlacın kan sulandırıcı etkisini azaltarak pıhtılaşma riskini artırabilir.",
          severity: Severity.MEDIUM,
        },
      ],
    });
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
