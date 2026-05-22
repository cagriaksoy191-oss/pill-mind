import { getCoverageContext, getInteractionContext } from "../lib/gemini";

describe("getCoverageContext", () => {
  it("should return null when an empty array is provided", () => {
    expect(getCoverageContext([])).toBeNull();
  });

  it("should return null when only 1 valid drug ID is provided", () => {
    expect(getCoverageContext(["aspirin"])).toBeNull();
  });

  it("should return null when valid drug IDs are less than 2, ignoring invalid IDs", () => {
    expect(getCoverageContext(["aspirin", "invalid_drug_id"])).toBeNull();
  });

  it("should return correct CoverageContext for 2 valid drug IDs", () => {
    const result = getCoverageContext(["aspirin", "warfarin"]);
    expect(result).not.toBeNull();
    expect(result?.drugNames).toEqual(["Aspirin", "Coumadin (Warfarin)"]);
    expect(result?.drugIngredients).toEqual(["Asetilsalisilik Asit", "Warfarin Sodyum"]);
  });

  it("should return correct CoverageContext for more than 2 valid drug IDs", () => {
    const result = getCoverageContext(["aspirin", "warfarin", "metformin"]);
    expect(result).not.toBeNull();
    expect(result?.drugNames).toEqual(["Aspirin", "Coumadin (Warfarin)", "Metformin"]);
    expect(result?.drugIngredients).toEqual(["Asetilsalisilik Asit", "Warfarin Sodyum", "Metformin HCl"]);
  });
});

describe("getInteractionContext", () => {
  it("should return null for an unknown interaction ID", () => {
    expect(getInteractionContext("invalid_interaction_id")).toBeNull();
  });

  it("should return correct InteractionContext for a valid interaction ID", () => {
    const result = getInteractionContext("aspirin-warfarin");
    expect(result).not.toBeNull();

    expect(result?.drug1Name).toBe("Aspirin");
    expect(result?.drug2Name).toBe("Coumadin (Warfarin)");

    expect(result?.drug1Ingredient).toBe("Asetilsalisilik Asit");
    expect(result?.drug2Ingredient).toBe("Warfarin Sodyum");

    expect(result?.interaction.id).toBe("aspirin-warfarin");
    expect(result?.interaction.severity).toBe("high");
  });
});

describe("shouldUseFallback", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("should return true when NEXT_PUBLIC_DEMO_MODE is 'true' and GOOGLE_API_KEY is valid", async () => {
    process.env.NEXT_PUBLIC_DEMO_MODE = "true";
    process.env.GOOGLE_API_KEY = "valid_key";
    const { shouldUseFallback } = await import("../lib/gemini");
    expect(shouldUseFallback()).toBe(true);
  });

  it("should return true when NEXT_PUBLIC_DEMO_MODE is 'false' and GOOGLE_API_KEY is empty", async () => {
    process.env.NEXT_PUBLIC_DEMO_MODE = "false";
    process.env.GOOGLE_API_KEY = "";
    const { shouldUseFallback } = await import("../lib/gemini");
    expect(shouldUseFallback()).toBe(true);
  });

  it("should return true when NEXT_PUBLIC_DEMO_MODE is 'false' and GOOGLE_API_KEY is undefined", async () => {
    process.env.NEXT_PUBLIC_DEMO_MODE = "false";
    delete process.env.GOOGLE_API_KEY;
    const { shouldUseFallback } = await import("../lib/gemini");
    expect(shouldUseFallback()).toBe(true);
  });

  it("should return false when NEXT_PUBLIC_DEMO_MODE is 'false' and GOOGLE_API_KEY is valid", async () => {
    process.env.NEXT_PUBLIC_DEMO_MODE = "false";
    process.env.GOOGLE_API_KEY = "valid_key";
    const { shouldUseFallback } = await import("../lib/gemini");
    expect(shouldUseFallback()).toBe(false);
  });
});
