import { findContraindications, findContraindicationsDB } from "@/lib/interactions/contraindications";
import { resolveDrugsDB } from "@/lib/interactions/interactions";
import { prisma } from "@/lib/prisma";
import { Drug } from "@/lib/interactions/types";

jest.mock("@/lib/interactions/interactions", () => ({
  ...jest.requireActual("@/lib/interactions/interactions"),
  resolveDrugsDB: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    drug: {
      findMany: jest.fn(),
    },
    contraindication: {
      findMany: jest.fn(),
    },
  },
}));

describe("Contraindications Engine (contraindications.ts)", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("findContraindications (synchronous local lookup)", () => {
    describe("Input Validation & Edge Cases", () => {
      it.each([
        ["null drugIds", null as unknown as string[]],
        ["undefined drugIds", undefined as unknown as string[]],
        ["non-array drugIds", "aspirin" as unknown as string[]],
        ["empty array", []],
      ])("returns empty array when input is %s", (_, drugIds) => {
        expect(findContraindications(drugIds)).toEqual([]);
      });

      it("returns empty array when patientContext is undefined", () => {
        expect(findContraindications(["aspirin"])).toEqual([]);
      });

      it("returns empty array when patientContext contains no disease or clinical risk factors", () => {
        expect(findContraindications(["aspirin"], {})).toEqual([]);
      });

      it("handles unknown drug names/IDs gracefully without throwing or returning contraindications", () => {
        expect(findContraindications(["unknown_drug_123"], { isPregnant: true })).toEqual([]);
      });

      it("clears resolve cache when cache size reaches MAX_CACHE_SIZE (5000)", () => {
        const unknownNames: string[] = new Array<string>(5005);
        for (let i = 0; i < 5005; i++) {
          unknownNames[i] = `unknown_drug_item_${i}`;
        }

        const results = findContraindications(unknownNames, { isPregnant: true });
        expect(results).toEqual([]);
      });
    });

    describe("Disease Contraindications", () => {
      it("returns disease contraindication for known drug and disease ICD code", () => {
        const results = findContraindications(["aspirin"], { diseases: ["K25"] });
        expect(results.length).toBeGreaterThan(0);
        expect(results[0]).toMatchObject({
          drugId: "aspirin",
          type: "disease",
          diseaseIcd: "K25",
          severity: "high",
        });
        expect(results[0].message).toBeTruthy();
        expect(results[0].diseaseName).toBeTruthy();
      });

      it("resolves drug aliases and mixed casing/whitespace for disease contraindications", () => {
        const results = findContraindications(["  CORASPIN  "], { diseases: ["K25"] });
        expect(results.length).toBeGreaterThan(0);
        expect(results[0].drugId).toBe("aspirin");
        expect(results[0].type).toBe("disease");
      });
    });

    describe("Pregnancy Contraindications", () => {
      it("returns Category X pregnancy contraindication (e.g. Warfarin)", () => {
        const results = findContraindications(["warfarin"], { isPregnant: true });
        expect(results.length).toBe(1);
        expect(results[0]).toMatchObject({
          id: "preg-contra-warfarin",
          drugId: "warfarin",
          type: "pregnancy",
          severity: "high",
        });
        expect(results[0].message).toContain("Kategori X");
      });

      it("returns Category D pregnancy contraindication (e.g. Enalapril)", () => {
        const results = findContraindications(["enalapril"], { isPregnant: true });
        expect(results.length).toBe(1);
        expect(results[0]).toMatchObject({
          id: "preg-contra-enalapril",
          drugId: "enalapril",
          type: "pregnancy",
          severity: "high",
        });
        expect(results[0].message).toContain("Kategori D");
      });

      it("does not return pregnancy contraindication for pregnancy-safe drugs (Category A/B/C)", () => {
        const results = findContraindications(["parasetamol"], { isPregnant: true });
        expect(results).toEqual([]);
      });

      it("does not return pregnancy contraindication if patient is not pregnant", () => {
        const results = findContraindications(["warfarin"], { isPregnant: false });
        expect(results).toEqual([]);
      });
    });

    describe("Breastfeeding Contraindications", () => {
      it.each(["warfarin", "aspirin", "enalapril"])(
        "returns breastfeeding contraindication for %s",
        (drugId) => {
          const results = findContraindications([drugId], { isBreastfeeding: true });
          expect(results.length).toBe(1);
          expect(results[0]).toMatchObject({
            id: `lact-contra-${drugId}`,
            drugId,
            type: "breastfeeding",
            severity: "medium",
          });
          expect(results[0].message).toContain("Emzirme Uyarısı:");
        }
      );

      it("does not return breastfeeding contraindication for unflagged drugs or non-breastfeeding patients", () => {
        expect(findContraindications(["metformin"], { isBreastfeeding: true })).toEqual([]);
        expect(findContraindications(["aspirin"], { isBreastfeeding: false })).toEqual([]);
      });
    });

    describe("Renal Contraindications", () => {
      it("returns lactic acidosis contraindication for metformin under renal risk", () => {
        const results = findContraindications(["metformin"], { renalRisk: true });
        expect(results.length).toBe(1);
        expect(results[0]).toMatchObject({
          id: "renal-contra-metformin",
          drugId: "metformin",
          type: "renal",
          severity: "high",
        });
        expect(results[0].message).toContain("laktik asidoza yol açabileceğinden");
      });

      it.each(["ibuprofen", "diklofenak", "aspirin"])(
        "returns NSAID renal contraindication for %s under renal risk",
        (drugId) => {
          const results = findContraindications([drugId], { renalRisk: true });
          expect(results.length).toBe(1);
          expect(results[0]).toMatchObject({
            id: `renal-contra-${drugId}`,
            drugId,
            type: "renal",
            severity: "high",
          });
          expect(results[0].message).toContain("akut renal yetmezliği tetikleyebilir");
        }
      );

      it("does not return renal contraindications when renalRisk is false or for non-renal drugs", () => {
        expect(findContraindications(["metformin"], { renalRisk: false })).toEqual([]);
        expect(findContraindications(["amoksisilin"], { renalRisk: true })).toEqual([]);
      });
    });

    describe("Hepatic Contraindications", () => {
      it("returns dose-limit hepatic warning for parasetamol", () => {
        const results = findContraindications(["parasetamol"], { hepaticRisk: true });
        expect(results.length).toBe(1);
        expect(results[0]).toMatchObject({
          id: "hepatic-contra-parasetamol",
          drugId: "parasetamol",
          type: "hepatic",
          severity: "high",
        });
        expect(results[0].message).toContain("günlük doz 2 gramı aşmamalıdır");
      });

      it("returns bleeding risk hepatic contraindication for warfarin", () => {
        const results = findContraindications(["warfarin"], { hepaticRisk: true });
        expect(results.length).toBe(1);
        expect(results[0]).toMatchObject({
          id: "hepatic-contra-warfarin",
          drugId: "warfarin",
          type: "hepatic",
          severity: "high",
        });
        expect(results[0].message).toContain("kanama riskini ölümcül düzeyde artırır");
      });

      it("does not return hepatic contraindications when hepaticRisk is false or for unflagged drugs", () => {
        expect(findContraindications(["parasetamol"], { hepaticRisk: false })).toEqual([]);
        expect(findContraindications(["metformin"], { hepaticRisk: true })).toEqual([]);
      });
    });
  });

  describe("findContraindicationsDB (asynchronous database lookup)", () => {
    describe("Fallback to local check when DATABASE_URL is missing or invalid", () => {
      it.each([
        ["undefined DATABASE_URL", undefined],
        ["empty DATABASE_URL", ""],
        ["contains placeholder [SIFRE]", "postgresql://user:[SIFRE]@localhost:5432/db"],
      ])("falls back to local check when %s", async (_, dbUrl) => {
        if (dbUrl === undefined) {
          delete process.env.DATABASE_URL;
        } else {
          process.env.DATABASE_URL = dbUrl;
        }

        const results = await findContraindicationsDB(["warfarin"], { isPregnant: true });
        expect(results.length).toBe(1);
        expect(results[0].type).toBe("pregnancy");
        expect(resolveDrugsDB).not.toHaveBeenCalled();
        expect(prisma.contraindication.findMany).not.toHaveBeenCalled();
      });
    });

    describe("When DATABASE_URL is valid", () => {
      beforeEach(() => {
        process.env.DATABASE_URL = "postgresql://postgres:password@localhost:5432/pillmind";
      });

      it("returns empty array if patientContext is undefined", async () => {
        const results = await findContraindicationsDB(["warfarin"]);
        expect(results).toEqual([]);
      });

      it("fetches resolved drugs via resolveDrugsDB when cache is not provided or empty", async () => {
        const mockResolvedDrugs: Drug[] = [
          { id: "aspirin", name: "Aspirin 100mg", activeIngredient: "Aspirin" },
        ];
        (resolveDrugsDB as jest.Mock).mockResolvedValue(mockResolvedDrugs);

        const mockDbContras = [
          {
            id: "contra-db-1",
            drugId: "aspirin",
            diseaseIcd: "K25",
            diseaseName: "Peptik Ülser",
            effect: "Gastrointestinal kanama riski",
            severity: "HIGH",
          },
        ];
        (prisma.contraindication.findMany as jest.Mock).mockResolvedValue(mockDbContras);

        const results = await findContraindicationsDB(
          ["aspirin"],
          { diseases: ["K25"], isBreastfeeding: true }
        );

        expect(resolveDrugsDB).toHaveBeenCalledWith(["aspirin"]);
        expect(prisma.contraindication.findMany).toHaveBeenCalledWith({
          where: {
            drugId: { in: ["aspirin"] },
            diseaseIcd: { in: ["K25"] },
          },
        });

        expect(results).toHaveLength(2);
        expect(results[0]).toEqual({
          id: "contra-db-1",
          drugId: "aspirin",
          drugName: "Aspirin 100mg",
          type: "disease",
          severity: "high",
          message: "Gastrointestinal kanama riski",
          diseaseIcd: "K25",
          diseaseName: "Peptik Ülser",
        });
        expect(results[1].type).toBe("breastfeeding");
      });

      it("uses resolvedDrugsCache if provided as a non-empty array", async () => {
        const mockCachedDrugs: Drug[] = [
          { id: "warfarin", name: "Warfarin Sodium", activeIngredient: "Warfarin" },
        ];

        const results = await findContraindicationsDB(
          ["warfarin"],
          { isPregnant: true },
          mockCachedDrugs
        );

        expect(resolveDrugsDB).not.toHaveBeenCalled();
        expect(prisma.contraindication.findMany).not.toHaveBeenCalled();
        expect(results).toHaveLength(1);
        expect(results[0].type).toBe("pregnancy");
      });

      it("falls back to local check if resolveDrugsDB throws an error", async () => {
        const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
        (resolveDrugsDB as jest.Mock).mockRejectedValue(new Error("Database connection error"));

        const results = await findContraindicationsDB(["warfarin"], { isPregnant: true });

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "[PillMind CMIO Engine] Contraindications DB failed, falling back to local:",
          expect.any(Error)
        );
        expect(results.length).toBe(1);
        expect(results[0].type).toBe("pregnancy");

        consoleErrorSpy.mockRestore();
      });

      it("falls back to local check if prisma.contraindication.findMany throws an error", async () => {
        const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
        (resolveDrugsDB as jest.Mock).mockResolvedValue([
          { id: "aspirin", name: "Aspirin", activeIngredient: "Aspirin" },
        ]);
        (prisma.contraindication.findMany as jest.Mock).mockRejectedValue(new Error("Query failed"));

        const results = await findContraindicationsDB(["aspirin"], { diseases: ["K25"] });

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "[PillMind CMIO Engine] Contraindications DB failed, falling back to local:",
          expect.any(Error)
        );
        expect(results.length).toBeGreaterThan(0);
        expect(results[0].type).toBe("disease");

        consoleErrorSpy.mockRestore();
      });
    });
  });
});
