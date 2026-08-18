import {
  findFoodInteractions,
  findContraindications,
  checkPolypharmacyAndBeers,
  getDrugClinicalMetadata,
} from "@/lib/interactions";

describe("PillMind 3.0 Clinical Depth & Data Extension Tests", () => {
  describe("Gıda ve Alkol Etkileşimleri (Adım 1)", () => {
    test("Warfarin eklendiğinde Greyfurt ve K Vitamini etkileşimlerini bulmalı", () => {
      const foodInts = findFoodInteractions(["warfarin"]);
      expect(foodInts.length).toBeGreaterThanOrEqual(2);
      
      const grapefruit = foodInts.find(f => f.substance === "Greyfurt Suyu");
      expect(grapefruit).toBeDefined();
      expect(grapefruit?.severity).toBe("high");
      
      const kVitamin = foodInts.find(f => f.substance.includes("K Vitamini"));
      expect(kVitamin).toBeDefined();
      expect(kVitamin?.severity).toBe("medium");
    });

    test("Metformin eklendiğinde Alkol etkileşimini bulmalı", () => {
      const foodInts = findFoodInteractions(["metformin"]);
      const alcohol = foodInts.find(f => f.substance === "Alkol");
      expect(alcohol).toBeDefined();
      expect(alcohol?.severity).toBe("high");
    });
  });

  describe("Kontrendikasyon Denetimleri (Adım 3)", () => {
    test("Peptik ülser ICD-10 (K25) kodu olan bir hastada Aspirin kontrendike olmalı", () => {
      const contras = findContraindications(["aspirin"], { diseases: ["K25"] });
      expect(contras.length).toBe(1);
      expect(contras[0].type).toBe("disease");
      expect(contras[0].diseaseIcd).toBe("K25");
      expect(contras[0].severity).toBe("high");
    });

    test("Gebelik durumunda Coumadin (Warfarin) kesinlikle kontrendike olmalı (Kategori X)", () => {
      const contras = findContraindications(["warfarin"], { isPregnant: true });
      const pregContra = contras.find(c => c.type === "pregnancy");
      expect(pregContra).toBeDefined();
      expect(pregContra?.severity).toBe("high");
      expect(pregContra?.message).toContain("Kategori X");
    });

    test("Böbrek yetmezliği durumunda Metformin ve İbuprofen kontrendike olmalı", () => {
      const contras = findContraindications(["metformin", "ibuprofen"], { renalRisk: true });
      expect(contras.length).toBe(2);
      expect(contras.every(c => c.type === "renal" && c.severity === "high")).toBe(true);
    });

    test("Karaciğer yetmezliği durumunda Parasetamol uyarısı tetiklenmeli", () => {
      const contras = findContraindications(["parasetamol"], { hepaticRisk: true });
      const hepaticContra = contras.find(c => c.type === "hepatic");
      expect(hepaticContra).toBeDefined();
      expect(hepaticContra?.severity).toBe("high");
      expect(hepaticContra?.message).toContain("2 gramı aşmamalıdır");
    });
  });

  describe("Polifarmasi ve Beers Kriterleri (Adım 4)", () => {
    test.each([
      {
        drugs: ["aspirin"],
        expectedScore: 1,
        expectedLevel: "low",
        expectedMsgSubstr: "Güvenli ilaç yükü",
      },
      {
        drugs: ["aspirin", "metformin", "enalapril"],
        expectedScore: 3,
        expectedLevel: "low",
        expectedMsgSubstr: "Güvenli ilaç yükü",
      },
      {
        drugs: ["aspirin", "metformin", "enalapril", "omeprazol"],
        expectedScore: 4,
        expectedLevel: "medium",
        expectedMsgSubstr: "Hafif Polifarmasi",
      },
      {
        drugs: ["aspirin", "metformin", "enalapril", "omeprazol", "metoprolol"],
        expectedScore: 5,
        expectedLevel: "medium",
        expectedMsgSubstr: "Hafif Polifarmasi",
      },
      {
        drugs: ["aspirin", "metformin", "enalapril", "omeprazol", "metoprolol", "amoksisilin"],
        expectedScore: 6,
        expectedLevel: "high",
        expectedMsgSubstr: "Ciddi Polifarmasi",
      },
    ])(
      "farklı ilaç yüklerinde ($expectedScore ilaç) $expectedLevel polifarmasi seviyesi dönmeli",
      ({ drugs, expectedScore, expectedLevel, expectedMsgSubstr }) => {
        const report = checkPolypharmacyAndBeers(drugs);
        expect(report.score).toBe(expectedScore);
        expect(report.level).toBe(expectedLevel);
        expect(report.message).toContain(expectedMsgSubstr);
      }
    );

    test.each([
      { drug: "aspirin", desc: "NSAID (Aspirin)" },
      { drug: "ibuprofen", desc: "NSAID (İbuprofen)" },
      { drug: "diklofenak", desc: "NSAID (Diklofenak)" },
    ])("65 yaş üstü yaşlı hastada $desc Beers uyarısı tetiklemeli", ({ drug }) => {
      const report = checkPolypharmacyAndBeers([drug], { ageGroup: "elderly" });
      expect(report.beersWarnings).toHaveLength(1);
      expect(report.beersWarnings[0]).toContain("Beers Kriteri Uyarısı");
      expect(report.beersWarnings[0]).toContain("gastrointestinal kanama");
    });

    test("65 yaş üstü ve böbrek yetmezliği riski olan hastada Metformin Beers uyarısı tetiklemeli", () => {
      const report = checkPolypharmacyAndBeers(["metformin"], { ageGroup: "elderly", renalRisk: true });
      expect(report.beersWarnings).toHaveLength(1);
      expect(report.beersWarnings[0]).toContain("laktik asidoz riskini artırdığı için");
    });

    test("65 yaş üstü olmayan veya böbrek riski taşımayan hastada Beers uyarısı vermemeli", () => {
      expect(checkPolypharmacyAndBeers(["ibuprofen"]).beersWarnings).toHaveLength(0);
      expect(checkPolypharmacyAndBeers(["ibuprofen"], { ageGroup: "adult" }).beersWarnings).toHaveLength(0);
      expect(checkPolypharmacyAndBeers(["metformin"], { ageGroup: "elderly", renalRisk: false }).beersWarnings).toHaveLength(0);
    });

    test("65 yaş üstü böbrek riski olan hastada hem NSAID hem Metformin kullanıldığında birden fazla Beers uyarısı dönmeli", () => {
      const report = checkPolypharmacyAndBeers(["aspirin", "metformin"], { ageGroup: "elderly", renalRisk: true });
      expect(report.beersWarnings).toHaveLength(2);
    });
  });

  describe("Klinik Metal Veriler (Adım 5)", () => {
    test("En temel ilaçların gebelik kategorileri doğru çözülmeli", () => {
      const warfarinMeta = getDrugClinicalMetadata("warfarin");
      expect(warfarinMeta.pregnancyCategory).toBe("X");

      const aspirinMeta = getDrugClinicalMetadata("aspirin");
      expect(aspirinMeta.pregnancyCategory).toBe("D");

      const parasetamolMeta = getDrugClinicalMetadata("parasetamol");
      expect(parasetamolMeta.pregnancyCategory).toBe("B");
    });
  });
});
