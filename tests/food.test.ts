import { findFoodInteractions, findFoodInteractionsDB, clearFoodInteractionsCache } from "@/lib/interactions/food";
import { resolveDrugsDB } from "@/lib/interactions/interactions";
import { prisma } from "@/lib/prisma";
import { Drug } from "@/lib/interactions/types";

jest.mock("@/lib/interactions/interactions", () => ({
  ...jest.requireActual("@/lib/interactions/interactions"),
  resolveDrugsDB: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    foodInteraction: {
      findMany: jest.fn(),
    },
  },
}));

describe("Food Interactions Engine (food.ts)", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    clearFoodInteractionsCache();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("findFoodInteractions (synchronous local lookup)", () => {
    it("returns empty array when drugIds is empty", () => {
      expect(findFoodInteractions([])).toEqual([]);
    });

    it("returns empty array for drug IDs without food interactions", () => {
      expect(findFoodInteractions(["amoksisilin"])).toEqual([]);
    });

    it("returns food interactions for a known drug ID (warfarin)", () => {
      const results = findFoodInteractions(["warfarin"]);
      expect(results.length).toBeGreaterThan(0);
      results.forEach((item) => {
        expect(item).toEqual({
          id: expect.any(String),
          drugId: "warfarin",
          drugName: expect.any(String),
          substance: expect.any(String),
          effect: expect.any(String),
          severity: expect.stringMatching(/^(high|medium|low)$/),
        });
      });
    });

    it("resolves drug aliases correctly (e.g. coumadin -> warfarin)", () => {
      const results = findFoodInteractions(["coumadin"]);
      expect(results.length).toBeGreaterThan(0);
      expect(results.every((item) => item.drugId === "warfarin")).toBe(true);
    });

    it("handles mixed case and extra whitespace in drug names", () => {
      const results = findFoodInteractions(["  WaRfaRiN  "]);
      expect(results.length).toBeGreaterThan(0);
      expect(results.every((item) => item.drugId === "warfarin")).toBe(true);
    });

    it("ignores unknown drug names/aliases that resolve to empty string", () => {
      const results = findFoodInteractions(["completely_unknown_drug_123"]);
      expect(results).toEqual([]);
    });

    it("clears resolve cache when cache size reaches MAX_CACHE_SIZE (5000)", () => {
      const unknownNames: string[] = new Array<string>(5005);
      for (let i = 0; i < 5005; i++) {
        unknownNames[i] = `unknown_drug_item_${i}`;
      }

      const results = findFoodInteractions(unknownNames);
      expect(results).toEqual([]);
    });
  });

  describe("findFoodInteractionsDB (asynchronous database lookup)", () => {
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

        const results = await findFoodInteractionsDB(["warfarin"]);
        expect(results.length).toBeGreaterThan(0);
        expect(results.every((r) => r.drugId === "warfarin")).toBe(true);
        expect(resolveDrugsDB).not.toHaveBeenCalled();
        expect(prisma.foodInteraction.findMany).not.toHaveBeenCalled();
      });
    });

    describe("When DATABASE_URL is valid", () => {
      beforeEach(() => {
        process.env.DATABASE_URL = "postgresql://postgres:password@localhost:5432/pillmind";
      });

      it("fetches resolved drugs via resolveDrugsDB when cache is not provided or empty", async () => {
        const mockResolvedDrugs: Drug[] = [
          { id: "warfarin", name: "Warfarin Sodium", activeIngredient: "Warfarin" },
        ];
        (resolveDrugsDB as jest.Mock).mockResolvedValue(mockResolvedDrugs);

        const mockDbFoodInteractions = [
          {
            id: "food-1",
            drugId: "warfarin",
            substance: "Greyfurt",
            effect: "Biyoyararlanımı artırır",
            severity: "HIGH",
            drug: { name: "Warfarin Sodium" },
          },
        ];
        (prisma.foodInteraction.findMany as jest.Mock).mockResolvedValue(mockDbFoodInteractions);

        const results = await findFoodInteractionsDB(["warfarin"]);

        expect(resolveDrugsDB).toHaveBeenCalledWith(["warfarin"]);
        expect(prisma.foodInteraction.findMany).toHaveBeenCalledWith({
          where: { drugId: { in: ["warfarin"] } },
          include: { drug: true },
        });

        expect(results).toEqual([
          {
            id: "food-1",
            drugId: "warfarin",
            drugName: "Warfarin Sodium",
            substance: "Greyfurt",
            effect: "Biyoyararlanımı artırır",
            severity: "high",
          },
        ]);
      });

      it("uses resolvedDrugsCache if provided as a non-empty array", async () => {
        const mockCachedDrugs: Drug[] = [
          { id: "metformin", name: "Metformin Hydrochloride", activeIngredient: "Metformin" },
        ];

        const mockDbFoodInteractions = [
          {
            id: "food-2",
            drugId: "metformin",
            substance: "Alkol",
            effect: "Laktik asidoz riskini artırır",
            severity: "MEDIUM",
            drug: { name: "Metformin Hydrochloride" },
          },
        ];
        (prisma.foodInteraction.findMany as jest.Mock).mockResolvedValue(mockDbFoodInteractions);

        const results = await findFoodInteractionsDB(["metformin"], mockCachedDrugs);

        expect(resolveDrugsDB).not.toHaveBeenCalled();
        expect(prisma.foodInteraction.findMany).toHaveBeenCalledWith({
          where: { drugId: { in: ["metformin"] } },
          include: { drug: true },
        });

        expect(results).toEqual([
          {
            id: "food-2",
            drugId: "metformin",
            drugName: "Metformin Hydrochloride",
            substance: "Alkol",
            effect: "Laktik asidoz riskini artırır",
            severity: "medium",
          },
        ]);
      });

      it("falls back to local check if resolveDrugsDB throws an error", async () => {
        const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
        (resolveDrugsDB as jest.Mock).mockRejectedValue(new Error("Database connection error"));

        const results = await findFoodInteractionsDB(["warfarin"]);

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "[PillMind CMIO Engine] Food interactions DB query failed, using local fallback:",
          expect.any(Error)
        );
        expect(results.length).toBeGreaterThan(0);
        expect(results.every((r) => r.drugId === "warfarin")).toBe(true);

        consoleErrorSpy.mockRestore();
      });

      it("falls back to local check if prisma.foodInteraction.findMany throws an error", async () => {
        const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
        (resolveDrugsDB as jest.Mock).mockResolvedValue([{ id: "warfarin", name: "Warfarin" }]);
        (prisma.foodInteraction.findMany as jest.Mock).mockRejectedValue(new Error("Query failed"));

        const results = await findFoodInteractionsDB(["warfarin"]);

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "[PillMind CMIO Engine] Food interactions DB query failed, using local fallback:",
          expect.any(Error)
        );
        expect(results.length).toBeGreaterThan(0);
        expect(results.every((r) => r.drugId === "warfarin")).toBe(true);

        consoleErrorSpy.mockRestore();
      });
    });
  });
});
