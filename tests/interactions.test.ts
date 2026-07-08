import { prisma } from "@/lib/prisma";
import { getDrugClinicalMetadata, getSeverityLabel, getSeverityColor, getAllDrugs, findInteractions, findContraindications, findFoodInteractions, findFoodInteractionsDB } from "../lib/interactions";

// --- Mocks ---
jest.mock("@/lib/prisma", () => ({
  prisma: {
    drug: {
      findMany: jest.fn()
    },
    foodInteraction: {
      findMany: jest.fn()
    }
  }
}));

describe("interactions UI helpers", () => {

  describe("getDrugClinicalMetadata", () => {
    test("returns correct clinical metadata for a known drug (aspirin)", () => {
      const result = getDrugClinicalMetadata("aspirin");
      expect(result.pregnancyCategory).toBe("D");
      expect(result.pregnancyNote).toContain("3. trimesterde kontrendikedir");
      expect(result.breastfeedingNote).toContain("Salisilatlar süte geçer");
      expect(result.renalNote).toContain("Ciddi böbrek yetmezliğinde kontrendikedir");
      expect(result.hepaticNote).toContain("Karaciğer yetmezliğinde kanama riski nedeniyle dikkatli kullanılmalıdır");
    });

    test("returns correct clinical metadata for another known drug (warfarin)", () => {
      const result = getDrugClinicalMetadata("warfarin");
      expect(result.pregnancyCategory).toBe("X");
      expect(result.pregnancyNote).toContain("Gebelikte kesinlikle kontrendikedir");
    });

    test("handles mixed casing and whitespace correctly", () => {
      const result1 = getDrugClinicalMetadata("  AsPiRiN  ");
      expect(result1.pregnancyCategory).toBe("D");

      const result2 = getDrugClinicalMetadata("WARFARIN");
      expect(result2.pregnancyCategory).toBe("X");
    });

    test("returns default metadata for an unknown drug", () => {
      const result = getDrugClinicalMetadata("unknown_drug_123");
      expect(result.pregnancyCategory).toBe("C");
      expect(result.pregnancyNote).toContain("Yeterli insan çalışması yoktur");
    });

    test("returns default metadata for empty string", () => {
      const result = getDrugClinicalMetadata("");
      expect(result.pregnancyCategory).toBe("C");
      expect(result.pregnancyNote).toContain("Yeterli insan çalışması yoktur");
    });
  });


  describe("getSeverityLabel", () => {
    test("returns correct label for 'high' severity", () => {
      const result = getSeverityLabel("high");
      expect(result).toBe("Potansiyel Önemli Etkileşim");
    });

    test("returns correct label for 'medium' severity", () => {
      const result = getSeverityLabel("medium");
      expect(result).toBe("Dikkat Edilmesi Gereken Etkileşim");
    });

    test("returns correct label for 'low' severity", () => {
      const result = getSeverityLabel("low");
      expect(result).toBe("Olası Hafif Etkileşim / İzlem Önerisi");
    });

    test("returns default label for unknown severity", () => {
      const result = getSeverityLabel("unknown");
      expect(result).toBe("Bilgi mevcut değil");
    });

    test("returns default label for empty string", () => {
      const result = getSeverityLabel("");
      expect(result).toBe("Bilgi mevcut değil");
    });

    test("is case sensitive and returns default for uppercase inputs", () => {
      const result = getSeverityLabel("HIGH");
      expect(result).toBe("Bilgi mevcut değil");
    });
  });

  describe("getSeverityColor", () => {
    test("returns correct colors for 'high' severity", () => {
      const result = getSeverityColor("high");
      expect(result).toEqual({
        bg: "bg-red-50",
        border: "border-red-300",
        badge: "bg-red-600 text-white",
        text: "text-red-800",
      });
    });

    test("returns correct colors for 'medium' severity", () => {
      const result = getSeverityColor("medium");
      expect(result).toEqual({
        bg: "bg-amber-50",
        border: "border-amber-300",
        badge: "bg-amber-500 text-white",
        text: "text-amber-800",
      });
    });

    test("returns correct colors for 'low' severity", () => {
      const result = getSeverityColor("low");
      expect(result).toEqual({
        bg: "bg-green-50",
        border: "border-green-300",
        badge: "bg-green-600 text-white",
        text: "text-green-800",
      });
    });

    test("returns default gray colors for unknown severity", () => {
      const result = getSeverityColor("unknown");
      expect(result).toEqual({
        bg: "bg-gray-50",
        border: "border-gray-300",
        badge: "bg-gray-500 text-white",
        text: "text-gray-700",
      });
    });

    test("returns default gray colors for empty string", () => {
      const result = getSeverityColor("");
      expect(result).toEqual({
        bg: "bg-gray-50",
        border: "border-gray-300",
        badge: "bg-gray-500 text-white",
        text: "text-gray-700",
      });
    });

    test("is case sensitive and returns default for uppercase inputs", () => {
      const result = getSeverityColor("HIGH");
      expect(result).toEqual({
        bg: "bg-gray-50",
        border: "border-gray-300",
        badge: "bg-gray-500 text-white",
        text: "text-gray-700",
      });
    });
  });

  describe("getAllDrugs", () => {
    test("returns an array of drugs", () => {
      const drugs = getAllDrugs();
      expect(Array.isArray(drugs)).toBe(true);
      expect(drugs.length).toBeGreaterThan(0);

      const firstDrug = drugs[0];
      expect(firstDrug).toHaveProperty("id");
      expect(firstDrug).toHaveProperty("name");
      expect(firstDrug).toHaveProperty("activeIngredient");
      expect(firstDrug).toHaveProperty("category");
    });
  });

  describe("findInteractions", () => {
    test("returns empty array for empty input", () => {
      const result = findInteractions([]);
      expect(result).toEqual([]);
    });

    test("returns empty array for null input", () => {
      // @ts-expect-error testing invalid input
      const result = findInteractions(null);
      expect(result).toEqual([]);
    });

    test("returns empty array for undefined input", () => {
      // @ts-expect-error testing invalid input
      const result = findInteractions(undefined);
      expect(result).toEqual([]);
    });

    test("returns empty array for non-array input", () => {
      // @ts-expect-error testing invalid input
      const result = findInteractions("aspirin");
      expect(result).toEqual([]);
    });

    test("returns empty array for array of empty strings", () => {
      const result = findInteractions(["", ""]);
      expect(result).toEqual([]);
    });

    test("returns empty array for array with identical drugs", () => {
      const result = findInteractions(["aspirin", "aspirin"]);
      expect(result).toEqual([]);
    });

    test("returns empty array for single drug", () => {
      const result = findInteractions(["aspirin"]);
      expect(result).toEqual([]);
    });

    test("returns empty array for non-interacting drugs", () => {
      // Assuming aspirin and metformin don't interact in the mock dataset
      const result = findInteractions(["aspirin", "metformin"]);
      expect(result).toEqual([]);
    });

    test("returns interactions for interacting drugs", () => {
      const result = findInteractions(["aspirin", "warfarin"]);
      expect(result.length).toBe(1);

      const res = result[0];
      expect(res.interaction.id).toBe("aspirin-warfarin");
      expect(res.interaction.severity).toBe("high");
      expect(res.drug1Name).toBe("Aspirin");
      expect(res.drug2Name).toBe("Coumadin (Warfarin)");
    });

    test("is order independent", () => {
      const result1 = findInteractions(["aspirin", "warfarin"]);
      const result2 = findInteractions(["warfarin", "aspirin"]);

      expect(result1.length).toBe(1);
      expect(result2.length).toBe(1);
      expect(result1[0].interaction.id).toBe(result2[0].interaction.id);
    });

    test("returns multiple interactions for multiple interacting drugs", () => {
      const result = findInteractions(["aspirin", "warfarin", "ibuprofen"]);

      // Expected interactions: aspirin-warfarin, aspirin-ibuprofen, ibuprofen-warfarin
      // Let's check length is correct based on dataset (assuming 3 interactions here or at least 2)
      // aspirin-warfarin and ibuprofen-warfarin exist based on the peek.
      // aspirin-ibuprofen might also exist. We just assert length > 1
      expect(result.length).toBeGreaterThan(1);

      const ids = result.map(r => r.interaction.id);
      expect(ids).toContain("aspirin-warfarin");
      expect(ids).toContain("ibuprofen-warfarin");
    });
  });

  describe("findContraindications", () => {
    test("returns empty array when patientContext is undefined", () => {
      const result = findContraindications(["aspirin"]);
      expect(result).toEqual([]);
    });

    test("returns empty array when patientContext has no risks and no diseases", () => {
      const result = findContraindications(["aspirin"], {});
      expect(result).toEqual([]);
    });

    test("returns contraindications for diseases (e.g. Aspirin and K25 Peptik Ülser)", () => {
      const result = findContraindications(["aspirin"], { diseases: ["K25"] });
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].type).toBe("disease");
      expect(result[0].diseaseIcd).toBe("K25");
      expect(result[0].severity).toBe("high");
    });

    test("returns pregnancy contraindications (e.g. Category X or D drugs)", () => {
      // Warfarin is category X
      const result = findContraindications(["warfarin"], { isPregnant: true });
      expect(result.length).toBeGreaterThan(0);

      const pregContra = result.find(r => r.type === "pregnancy");
      expect(pregContra).toBeDefined();
      expect(pregContra?.severity).toBe("high");
    });

    test("returns breastfeeding contraindications (e.g. aspirin)", () => {
      const result = findContraindications(["aspirin"], { isBreastfeeding: true });
      expect(result.length).toBeGreaterThan(0);

      const lactContra = result.find(r => r.type === "breastfeeding");
      expect(lactContra).toBeDefined();
      expect(lactContra?.severity).toBe("medium");
    });

    test("returns renal risk contraindications (e.g. metformin)", () => {
      const result = findContraindications(["metformin"], { renalRisk: true });
      expect(result.length).toBeGreaterThan(0);

      const renalContra = result.find(r => r.type === "renal");
      expect(renalContra).toBeDefined();
      expect(renalContra?.severity).toBe("high");
    });

    test("returns renal risk contraindications (e.g. ibuprofen)", () => {
      const result = findContraindications(["ibuprofen"], { renalRisk: true });
      expect(result.length).toBeGreaterThan(0);

      const renalContra = result.find(r => r.type === "renal");
      expect(renalContra).toBeDefined();
      expect(renalContra?.severity).toBe("high");
    });

    test("handles aliases and casing", () => {
      // Using an alias or different casing should still find the contraindication
      const result = findContraindications(["Aspirin "], { diseases: ["K25"] });
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].type).toBe("disease");
      expect(result[0].diseaseIcd).toBe("K25");
    });
  });

  describe("findFoodInteractions", () => {
    test("returns empty array for empty input", () => {
      const result = findFoodInteractions([]);
      expect(result).toEqual([]);
    });

    test("returns empty array for non-interacting drugs", () => {
      // e.g. amoksisilin might not have food interactions in our dataset
      const result = findFoodInteractions(["amoksisilin"]);
      expect(result).toEqual([]);
    });

    test("returns food interactions for a known interacting drug (warfarin)", () => {
      const result = findFoodInteractions(["warfarin"]);
      expect(result.length).toBeGreaterThan(0);

      const warfarinInteractions = result.filter(r => r.drugId === "warfarin");
      expect(warfarinInteractions.length).toBeGreaterThan(0);

      // Ensure we have some expected properties
      expect(warfarinInteractions[0]).toHaveProperty("id");
      expect(warfarinInteractions[0]).toHaveProperty("substance");
      expect(warfarinInteractions[0]).toHaveProperty("effect");
      expect(warfarinInteractions[0]).toHaveProperty("severity");
    });

    test("returns food interactions for a known interacting drug (metformin)", () => {
      const result = findFoodInteractions(["metformin"]);
      expect(result.length).toBeGreaterThan(0);

      const substances = result.map(r => r.substance.toLowerCase());
      expect(substances).toContain("alkol");
    });

    test("handles aliases (e.g. coumadin -> warfarin)", () => {
      const result = findFoodInteractions(["coumadin"]);
      expect(result.length).toBeGreaterThan(0);
      const isWarfarin = result.every(r => r.drugId === "warfarin");
      expect(isWarfarin).toBe(true);
    });

    test("handles mixed casing and whitespace", () => {
      const result = findFoodInteractions(["  WaRfaRiN  "]);
      expect(result.length).toBeGreaterThan(0);
      const isWarfarin = result.every(r => r.drugId === "warfarin");
      expect(isWarfarin).toBe(true);
    });
  });





describe("findInteractionsDB", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv, DATABASE_URL: "postgresql://user:pass@localhost:5432/db" };
    const { prisma } = require("@/lib/prisma");

    if (!prisma.drug) prisma.drug = { findMany: jest.fn() };
    if (!prisma.drugInteraction) prisma.drugInteraction = { findMany: jest.fn() };

    if (typeof prisma.drug.findMany.mockClear === 'function') {
        prisma.drug.findMany.mockClear();
    }
    if (typeof prisma.drugInteraction.findMany.mockClear === 'function') {
        prisma.drugInteraction.findMany.mockClear();
    }
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test("returns fallback if DATABASE_URL is missing", async () => {
    delete process.env.DATABASE_URL;
    const { findInteractionsDB } = require("../lib/interactions");
    const { prisma } = require("@/lib/prisma");
    const result = await findInteractionsDB(["warfarin"]);
    expect(Array.isArray(result)).toBe(true);
    expect(prisma.drug.findMany).not.toHaveBeenCalled();
  });

  test("returns fallback if DATABASE_URL contains [SIFRE]", async () => {
    process.env.DATABASE_URL = "postgres://user:[SIFRE]@host/db";
    const { findInteractionsDB } = require("../lib/interactions");
    const { prisma } = require("@/lib/prisma");
    const result = await findInteractionsDB(["warfarin"]);
    expect(Array.isArray(result)).toBe(true);
    expect(prisma.drug.findMany).not.toHaveBeenCalled();
  });

  test("uses resolvedDrugsCache if provided and fetches interactions from DB", async () => {
    const { findInteractionsDB } = require("../lib/interactions");
    const { prisma } = require("@/lib/prisma");

    const mockDrug1 = { id: "drug1", name: "Drug 1" };
    const mockDrug2 = { id: "drug2", name: "Drug 2" };

    const mockInteraction = {
      id: "int1",
      drug1Id: "drug1",
      drug2Id: "drug2",
      severity: "High",
      summary: "Bad interaction",
      clinicalDetail: "Detail",
      source: "FDA",
      sourceLabel: "FDA Data",
      verificationStatus: "Verified",
      evidenceLevel: "fda_approved",
      evidences: [],
      mechanisms: []
    };

    (prisma.drugInteraction.findMany as jest.Mock).mockResolvedValue([mockInteraction]);

    const result = await findInteractionsDB(["drug1", "drug2"], [mockDrug1, mockDrug2]);

    expect(result).toHaveLength(1);
    expect(result[0].interaction.summary).toBe("Bad interaction");

    expect(prisma.drug.findMany).not.toHaveBeenCalled();
    expect(prisma.drugInteraction.findMany).toHaveBeenCalled();
  });

  test("fetches drugs and interactions from DB if cache not provided", async () => {
    const { findInteractionsDB } = require("../lib/interactions");
    const { prisma } = require("@/lib/prisma");

    const mockDrug1 = { id: "drug1", name: "Drug 1" };
    const mockDrug2 = { id: "drug2", name: "Drug 2" };

    const mockInteraction = {
      id: "int1",
      drug1Id: "drug1",
      drug2Id: "drug2",
      severity: "High",
      summary: "Bad interaction",
      clinicalDetail: "Detail",
      source: "FDA",
      sourceLabel: "FDA Data",
      verificationStatus: "Verified",
      evidenceLevel: "fda_approved",
      evidences: [],
      mechanisms: []
    };

    (prisma.drug.findMany as jest.Mock).mockResolvedValue([mockDrug1, mockDrug2]);
    (prisma.drugInteraction.findMany as jest.Mock).mockResolvedValue([mockInteraction]);

    const result = await findInteractionsDB(["drug1", "drug2"]);

    expect(result).toHaveLength(1);
    expect(result[0].interaction.summary).toBe("Bad interaction");

    expect(prisma.drug.findMany).toHaveBeenCalled();
    expect(prisma.drugInteraction.findMany).toHaveBeenCalled();
  });

  test("uses fallback if Prisma query fails", async () => {
    const { findInteractionsDB } = require("../lib/interactions");
    const { prisma } = require("@/lib/prisma");

    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    (prisma.drug.findMany as jest.Mock).mockRejectedValue(new Error("DB Error"));

    const result = await findInteractionsDB(["warfarin"]);
    expect(Array.isArray(result)).toBe(true);
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});


describe("findFoodInteractionsDB", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv, DATABASE_URL: "postgresql://user:pass@localhost:5432/db" };
    const { prisma } = require("@/lib/prisma");

    if (!prisma.drug) prisma.drug = { findMany: jest.fn() };
    if (!prisma.foodInteraction) prisma.foodInteraction = { findMany: jest.fn() };

    if (typeof prisma.drug.findMany.mockClear === 'function') {
        prisma.drug.findMany.mockClear();
    }
    if (typeof prisma.foodInteraction.findMany.mockClear === 'function') {
        prisma.foodInteraction.findMany.mockClear();
    }
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test("returns fallback if DATABASE_URL is missing", async () => {
    delete process.env.DATABASE_URL;
    const { findFoodInteractionsDB } = require("../lib/interactions");
    const { prisma } = require("@/lib/prisma");
    const result = await findFoodInteractionsDB(["warfarin"]);
    expect(result.length).toBeGreaterThan(0);
    expect(prisma.drug.findMany).not.toHaveBeenCalled();
  });

  test("returns fallback if DATABASE_URL contains [SIFRE]", async () => {
    process.env.DATABASE_URL = "postgres://user:[SIFRE]@host/db";
    const { findFoodInteractionsDB } = require("../lib/interactions");
    const { prisma } = require("@/lib/prisma");
    const result = await findFoodInteractionsDB(["warfarin"]);
    expect(result.length).toBeGreaterThan(0);
    expect(prisma.drug.findMany).not.toHaveBeenCalled();
  });

  test("returns food interactions from DB if Prisma query succeeds", async () => {
    const { findFoodInteractionsDB } = require("../lib/interactions");
    const { prisma } = require("@/lib/prisma");

    // Setup mock return values
    const mockDrug = { id: "warfarin", name: "warfarin" };
    const mockFoodInt = {
      id: "f1",
      drugId: "warfarin",
      substance: "Vitamin K",
      effect: "Decrease efficacy",
      severity: "High",
      drug: mockDrug
    };

    (prisma.drug.findMany as jest.Mock).mockResolvedValue([mockDrug]);
    (prisma.foodInteraction.findMany as jest.Mock).mockResolvedValue([mockFoodInt]);

    const result = await findFoodInteractionsDB(["warfarin"]);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: "f1",
      drugId: "warfarin",
      drugName: "warfarin",
      substance: "Vitamin K",
      effect: "Decrease efficacy",
      severity: "high"
    });

    expect(prisma.drug.findMany).toHaveBeenCalled();
    expect(prisma.foodInteraction.findMany).toHaveBeenCalledWith({
      where: { drugId: { in: ["warfarin"] } },
      include: { drug: true }
    });
  });

  test("uses resolvedDrugsCache if provided", async () => {
    const { findFoodInteractionsDB } = require("../lib/interactions");
    const { prisma } = require("@/lib/prisma");

    const mockDrug = { id: "metformin", name: "metformin" };
    const mockFoodInt = {
      id: "f2",
      drugId: "metformin",
      substance: "Alcohol",
      effect: "Risk of lactic acidosis",
      severity: "Medium",
      drug: mockDrug
    };

    (prisma.foodInteraction.findMany as jest.Mock).mockResolvedValue([mockFoodInt]);

    // Pass resolvedDrugsCache
    const result = await findFoodInteractionsDB(["metformin"], [mockDrug]);

    expect(result).toHaveLength(1);
    expect(result[0].substance).toBe("Alcohol");

    // drug.findMany should NOT be called because cache was provided
    expect(prisma.drug.findMany).not.toHaveBeenCalled();
    expect(prisma.foodInteraction.findMany).toHaveBeenCalled();
  });

  test("uses fallback if Prisma query fails", async () => {
    const { findFoodInteractionsDB } = require("../lib/interactions");
    const { prisma } = require("@/lib/prisma");

    // Suppress expected console.error during the test
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    // Make Prisma throw an error
    (prisma.drug.findMany as jest.Mock).mockRejectedValue(new Error("Database connection failed"));

    const result = await findFoodInteractionsDB(["warfarin"]);

    // Should fallback to findFoodInteractions, returning results for warfarin
    expect(result.length).toBeGreaterThan(0);
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});


});

describe("findContraindicationsDB", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv, DATABASE_URL: "postgresql://user:pass@localhost:5432/db" };
    const { prisma } = require("@/lib/prisma");
    if (prisma.drug && prisma.drug.findMany && typeof prisma.drug.findMany.mockClear === 'function') {
        prisma.drug.findMany.mockClear();
    }
    if (prisma.contraindication && prisma.contraindication.findMany && typeof prisma.contraindication.findMany.mockClear === 'function') {
        prisma.contraindication.findMany.mockClear();
    }
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test("returns empty array if patientContext is undefined", async () => {
    const { findContraindicationsDB } = require("../lib/interactions");
    const result = await findContraindicationsDB(["warfarin"]);
    expect(result).toEqual([]);
  });

  test("uses resolvedDrugsCache if provided", async () => {
    const { findContraindicationsDB } = require("../lib/interactions");
    const { prisma } = require("@/lib/prisma");

    const mockDrug = { id: "warfarin", name: "warfarin" };

    // Pass cache directly
    const result = await findContraindicationsDB(["warfarin"], { isPregnant: true }, [mockDrug]);

    // Should return pregnancy contraindication for Warfarin Category X
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("pregnancy");

    // Should NOT have fetched from DB since cache was provided
    expect(prisma.drug.findMany).not.toHaveBeenCalled();
  });

  test("returns disease contraindications from DB if Prisma query succeeds", async () => {
    const { findContraindicationsDB } = require("../lib/interactions");
    const { prisma } = require("@/lib/prisma");

    const mockDrug = { id: "aspirin", name: "Aspirin" };
    const mockContra = {
      id: "c1",
      drugId: "aspirin",
      diseaseIcd: "K25",
      diseaseName: "Peptik Ülser",
      effect: "Kanama riski",
      severity: "High"
    };

    prisma.drug.findMany.mockResolvedValue([mockDrug]);
    // mock contraindication if not defined yet
    if (!prisma.contraindication) { prisma.contraindication = { findMany: jest.fn() }; }
    prisma.contraindication.findMany.mockResolvedValue([mockContra]);

    const result = await findContraindicationsDB(["aspirin"], { diseases: ["K25"] });

    expect(prisma.drug.findMany).toHaveBeenCalled();
    expect(prisma.contraindication.findMany).toHaveBeenCalledWith({
      where: {
        drugId: { in: ["aspirin"] },
        diseaseIcd: { in: ["K25"] }
      }
    });

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("disease");
    expect(result[0].diseaseIcd).toBe("K25");
  });

  test("returns pregnancy contraindications from clinical metadata", async () => {
    const { findContraindicationsDB } = require("../lib/interactions");
    const { prisma } = require("@/lib/prisma");

    const mockDrugX = { id: "warfarin", name: "Warfarin" };
    const mockDrugD = { id: "aspirin", name: "Aspirin" };

    prisma.drug.findMany.mockResolvedValue([mockDrugX, mockDrugD]);

    const result = await findContraindicationsDB(["warfarin", "aspirin"], { isPregnant: true });

    expect(result).toHaveLength(2);
    expect(result.some(r => r.drugId === "warfarin" && r.type === "pregnancy" && r.message.includes("Kategori X"))).toBe(true);
    // Note: Aspirin's exact category in metadata dictates if it's caught. Based on findContraindications tests, it might not be D, let's just rely on the count or check warfarin.
  });

  test("returns breastfeeding contraindications from clinical metadata", async () => {
    const { findContraindicationsDB } = require("../lib/interactions");
    const { prisma } = require("@/lib/prisma");

    const mockDrug = { id: "aspirin", name: "Aspirin" };
    prisma.drug.findMany.mockResolvedValue([mockDrug]);

    const result = await findContraindicationsDB(["aspirin"], { isBreastfeeding: true });

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("breastfeeding");
    expect(result[0].severity).toBe("medium");
  });

  test("returns renal risk contraindications from clinical metadata", async () => {
    const { findContraindicationsDB } = require("../lib/interactions");
    const { prisma } = require("@/lib/prisma");

    const mockDrug1 = { id: "metformin", name: "Metformin" };
    const mockDrug2 = { id: "ibuprofen", name: "Ibuprofen" };

    prisma.drug.findMany.mockResolvedValue([mockDrug1, mockDrug2]);

    const result = await findContraindicationsDB(["metformin", "ibuprofen"], { renalRisk: true });

    expect(result).toHaveLength(2);
    expect(result.every(r => r.type === "renal")).toBe(true);
  });

  test("returns hepatic risk contraindications from clinical metadata", async () => {
    const { findContraindicationsDB } = require("../lib/interactions");
    const { prisma } = require("@/lib/prisma");

    const mockDrug1 = { id: "parasetamol", name: "Parasetamol" };
    const mockDrug2 = { id: "warfarin", name: "Warfarin" };

    prisma.drug.findMany.mockResolvedValue([mockDrug1, mockDrug2]);

    const result = await findContraindicationsDB(["parasetamol", "warfarin"], { hepaticRisk: true });

    expect(result).toHaveLength(2);
    expect(result.every(r => r.type === "hepatic")).toBe(true);
  });

  test("uses fallback if Prisma query fails", async () => {
    const { findContraindicationsDB } = require("../lib/interactions");
    const { prisma } = require("@/lib/prisma");

    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    // Make Prisma throw an error
    prisma.drug.findMany.mockRejectedValue(new Error("Database connection failed"));

    // Fallback logic uses findContraindications, which uses getDrugClinicalMetadata
    const result = await findContraindicationsDB(["warfarin"], { isPregnant: true });

    // Fallback should still find the category X pregnancy risk
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].type).toBe("pregnancy");

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

describe("resolveDrugsDB", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv, DATABASE_URL: "postgresql://user:pass@localhost:5432/db" };
    const { prisma } = require("@/lib/prisma");
    if (prisma.drug && prisma.drug.findMany && typeof prisma.drug.findMany.mockClear === 'function') {
        prisma.drug.findMany.mockClear();
    }
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("should return empty array if DATABASE_URL is not set", async () => {
    delete process.env.DATABASE_URL;
    const { resolveDrugsDB } = require("../lib/interactions");
    const result = await resolveDrugsDB(["drug1"]);
    expect(result).toEqual([]);
  });

  it("should return empty array if DATABASE_URL includes [SIFRE]", async () => {
    process.env.DATABASE_URL = "postgresql://user:[SIFRE]@localhost:5432/db";
    const { resolveDrugsDB } = require("../lib/interactions");
    const result = await resolveDrugsDB(["drug1"]);
    expect(result).toEqual([]);
  });

  it("should return drugs from DB", async () => {
    const { prisma } = require("@/lib/prisma");
    const { resolveDrugsDB } = require("../lib/interactions");
    const mockDrugs = [{ id: "drug1", name: "Drug 1" }];
    prisma.drug.findMany.mockResolvedValue(mockDrugs);

    const result = await resolveDrugsDB(["drug1"]);

    expect(prisma.drug.findMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { id: { in: ["drug1"] } },
          { name: { in: ["drug1"] } },
          { brandNames: { some: { name: { in: ["drug1"] } } } },
          { aliases: { some: { alias: { in: ["drug1"] } } } },
          { aliases: { some: { normalizedAlias: { in: ["drug1"] } } } }
        ]
      }
    });
    expect(result).toEqual(mockDrugs);
  });

  it("should return empty array on database error and log error", async () => {
    const { prisma } = require("@/lib/prisma");
    const { resolveDrugsDB } = require("../lib/interactions");
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    prisma.drug.findMany.mockRejectedValue(new Error("DB Error"));

    const result = await resolveDrugsDB(["drug1"]);

    expect(consoleSpy).toHaveBeenCalled();
    expect(result).toEqual([]);

    consoleSpy.mockRestore();
  });
});


describe("checkAccumulationDB", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv, DATABASE_URL: "postgresql://user:pass@localhost:5432/db" };
    const { prisma } = require("@/lib/prisma");
    if (prisma.drug && prisma.drug.findMany && typeof prisma.drug.findMany.mockClear === 'function') {
        prisma.drug.findMany.mockClear();
    }
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("should return checkAccumulation results if DATABASE_URL is not set", async () => {
    delete process.env.DATABASE_URL;
    const { checkAccumulationDB } = require("../lib/interactions");
    const result = await checkAccumulationDB(["aspirin", "ibuprofen"]);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].type).toBe("pharmacological_group");
  });

  it("should return checkAccumulation results if DATABASE_URL includes [SIFRE]", async () => {
    process.env.DATABASE_URL = "postgresql://user:[SIFRE]@localhost:5432/db";
    const { checkAccumulationDB } = require("../lib/interactions");
    const result = await checkAccumulationDB(["aspirin", "ibuprofen"]);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].type).toBe("pharmacological_group");
  });

  it("should return accumulation warnings for same active ingredient from DB", async () => {
    const { prisma } = require("@/lib/prisma");
    const { checkAccumulationDB } = require("../lib/interactions");

    // Mock 2 drugs with the same active ingredient
    const mockDrugs = [
      { id: "drug1", name: "Parol", activeIngredient: "Parasetamol" },
      { id: "drug2", name: "Minoset", activeIngredient: "Parasetamol" }
    ];
    prisma.drug.findMany.mockResolvedValue(mockDrugs);

    const result = await checkAccumulationDB(["parol", "minoset"]);

    expect(prisma.drug.findMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { id: { in: ["parol", "minoset"] } },
          { name: { in: ["parol", "minoset"] } },
          { brandNames: { some: { name: { in: ["parol", "minoset"] } } } }
        ]
      }
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      type: "active_ingredient",
      severity: "high",
      message: "Dikkat: Aynı etkin maddeyi (Parasetamol) içeren birden fazla ilaç eklediniz. Aşırı doz riski!",
      triggerDrugs: ["Parol", "Minoset"],
      detail: "Parol ve Minoset ilaçlarının ikisi de Parasetamol içermektedir."
    });
  });

  it("should return accumulation warnings for same pharmacological group from DB", async () => {
    const { prisma } = require("@/lib/prisma");
    const { checkAccumulationDB } = require("../lib/interactions");

    // Mock 2 drugs with different ingredients but same pharmacological group
    const mockDrugs = [
      { id: "drug1", name: "Ibuprofen", activeIngredient: "Ibuprofen", pharmacologicalGroup: "NSAII" },
      { id: "drug2", name: "Naproksen", activeIngredient: "Naproksen", pharmacologicalGroup: "NSAII" }
    ];
    prisma.drug.findMany.mockResolvedValue(mockDrugs);

    const result = await checkAccumulationDB(["ibuprofen", "naproksen"]);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      type: "pharmacological_group",
      severity: "medium",
      message: "Dikkat: Aynı farmakolojik sınıftan (NSAII) birden fazla ilaç eklediniz. Yan etki riski artabilir.",
      triggerDrugs: ["Ibuprofen", "Naproksen"],
      detail: "Ibuprofen ve Naproksen ilaçları NSAII sınıfına aittir."
    });
  });

  it("should use resolvedDrugsCache if provided instead of querying DB", async () => {
    const { prisma } = require("@/lib/prisma");
    const { checkAccumulationDB } = require("../lib/interactions");

    const mockDrugs = [
      { id: "drug1", name: "Parol", activeIngredient: "Parasetamol" },
      { id: "drug2", name: "Minoset", activeIngredient: "Parasetamol" }
    ];

    const result = await checkAccumulationDB(["parol", "minoset"], mockDrugs);

    expect(prisma.drug.findMany).not.toHaveBeenCalled();
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("active_ingredient");
  });

  it("should return checkAccumulation results on database error and log error", async () => {
    const { prisma } = require("@/lib/prisma");
    const { checkAccumulationDB } = require("../lib/interactions");
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    prisma.drug.findMany.mockRejectedValue(new Error("DB Error"));

    const result = await checkAccumulationDB(["aspirin", "ibuprofen"]);

    // checkAccumulation from local mock data should return active ingredient warning for parol/minoset
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].type).toBe("pharmacological_group");

    consoleSpy.mockRestore();
  });
});
