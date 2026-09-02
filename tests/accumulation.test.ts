import { checkAccumulation, checkAccumulationDB } from "@/lib/interactions/accumulation";
import { resolveDrugsDB } from "@/lib/interactions/interactions";
import { Drug } from "@/lib/interactions/types";

jest.mock("@/lib/interactions/interactions", () => ({
  ...jest.requireActual("@/lib/interactions/interactions"),
  resolveDrugsDB: jest.fn(),
}));

describe("Drug Accumulation & Overdose Warnings (accumulation.ts)", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("checkAccumulation (synchronous local check)", () => {
    describe.each([
      ["null input", null as unknown as string[], []],
      ["undefined input", undefined as unknown as string[], []],
      ["non-array input", "ibuprofen" as unknown as string[], []],
      ["empty array", [], []],
      ["single drug ID", ["ibuprofen"], []],
    ])("Invalid or insufficient inputs: %s", (_, input, expected) => {
      it("returns an empty array", () => {
        expect(checkAccumulation(input)).toEqual(expected);
      });
    });

    it("returns warning for drugs with same active ingredient (same ID provided multiple times)", () => {
      const warnings = checkAccumulation(["ibuprofen", "ibuprofen"]);
      expect(warnings.length).toBe(1);
      expect(warnings[0]).toEqual({
        type: "active_ingredient",
        severity: "high",
        message: expect.stringContaining("Aynı etkin maddeyi (İbuprofen) içeren birden fazla ilaç eklediniz"),
        triggerDrugs: ["İbuprofen", "İbuprofen"],
        detail: expect.stringContaining("İbuprofen ve İbuprofen ilaçlarının ikisi de İbuprofen içermektedir."),
      });
    });

    it("returns warning for drugs in same pharmacological group but different active ingredients", () => {
      const warnings = checkAccumulation(["ibuprofen", "diklofenak"]);
      expect(warnings.length).toBe(1);
      expect(warnings[0].type).toBe("pharmacological_group");
      expect(warnings[0].severity).toBe("medium");
      expect(warnings[0].triggerDrugs).toEqual(["İbuprofen", "Diklofenak"]);
    });

    it("returns no warnings for drugs from different pharmacological groups", () => {
      const warnings = checkAccumulation(["metformin", "amoksisilin"]);
      expect(warnings).toEqual([]);
    });

    it("ignores unknown drug IDs safely", () => {
      expect(checkAccumulation(["unknown_1", "unknown_2"])).toEqual([]);
      expect(checkAccumulation(["ibuprofen", "unknown_1"])).toEqual([]);
    });
  });

  describe("checkAccumulationDB (asynchronous DB check)", () => {
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

        const warnings = await checkAccumulationDB(["ibuprofen", "diklofenak"]);
        expect(warnings.length).toBe(1);
        expect(warnings[0].type).toBe("pharmacological_group");
        expect(resolveDrugsDB).not.toHaveBeenCalled();
      });
    });

    describe("When DATABASE_URL is valid", () => {
      beforeEach(() => {
        process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/mydb";
      });

      it("uses resolvedDrugsCache if provided as non-empty array", async () => {
        const cachedDrugs: Drug[] = [
          {
            id: "drug1",
            name: "Drug Alpha",
            activeIngredient: "  PARACETAMOL  ",
            pharmacologicalGroup: " Analgesic ",
          },
          {
            id: "drug2",
            name: "Drug Beta",
            activeIngredient: "paracetamol",
            pharmacologicalGroup: "Analgesic",
          },
        ];

        const warnings = await checkAccumulationDB(["drug1", "drug2"], cachedDrugs);
        expect(resolveDrugsDB).not.toHaveBeenCalled();
        expect(warnings.length).toBe(1);
        expect(warnings[0].type).toBe("active_ingredient");
        expect(warnings[0].triggerDrugs).toEqual(["Drug Alpha", "Drug Beta"]);
      });

      it("fetches resolved drugs using resolveDrugsDB if cache is not provided or empty", async () => {
        const mockResolved: Drug[] = [
          {
            id: "d1",
            name: "Drug A",
            activeIngredient: "Ingredient A",
            pharmacologicalGroup: "Group X",
          },
          {
            id: "d2",
            name: "Drug B",
            activeIngredient: "Ingredient B",
            pharmacologicalGroup: "Group X",
          },
        ];
        (resolveDrugsDB as jest.Mock).mockResolvedValue(mockResolved);

        const warnings = await checkAccumulationDB(["d1", "d2"]);
        expect(resolveDrugsDB).toHaveBeenCalledWith(["d1", "d2"]);
        expect(warnings.length).toBe(1);
        expect(warnings[0].type).toBe("pharmacological_group");
        expect(warnings[0].triggerDrugs).toEqual(["Drug A", "Drug B"]);
      });

      it("handles drugs without pharmacologicalGroup in DB check", async () => {
        const cachedDrugs: Drug[] = [
          {
            id: "d1",
            name: "Drug 1",
            activeIngredient: "Substance X",
          },
          {
            id: "d2",
            name: "Drug 2",
            activeIngredient: "Substance Y",
          },
        ];

        const warnings = await checkAccumulationDB(["d1", "d2"], cachedDrugs);
        expect(warnings).toEqual([]);
      });

      it("logs error and falls back to checkAccumulation if resolveDrugsDB throws", async () => {
        const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
        (resolveDrugsDB as jest.Mock).mockRejectedValue(new Error("DB Connection Error"));

        const warnings = await checkAccumulationDB(["ibuprofen", "diklofenak"]);
        expect(consoleSpy).toHaveBeenCalledWith(
          "[Accumulation DB] Hata, lokale düşülüyor:",
          expect.any(Error)
        );
        expect(warnings.length).toBe(1);
        expect(warnings[0].type).toBe("pharmacological_group");

        consoleSpy.mockRestore();
      });
    });
  });
});
