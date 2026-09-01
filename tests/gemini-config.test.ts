import {
  getGeminiApiKey,
  isDemoMode,
  getPrimaryModel,
  getModelChain,
  getWorkingModelIndex,
  setWorkingModelIndex,
} from "../lib/gemini/config";

describe("lib/gemini/config", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("getGeminiApiKey", () => {
    it("should return the GOOGLE_API_KEY environment variable when set", () => {
      process.env.GOOGLE_API_KEY = "test-api-key";
      expect(getGeminiApiKey()).toBe("test-api-key");
    });

    it("should return an empty string when GOOGLE_API_KEY is not set", () => {
      delete process.env.GOOGLE_API_KEY;
      expect(getGeminiApiKey()).toBe("");
    });
  });

  describe("isDemoMode", () => {
    it("should return true when NEXT_PUBLIC_DEMO_MODE is 'true'", () => {
      process.env.NEXT_PUBLIC_DEMO_MODE = "true";
      expect(isDemoMode()).toBe(true);
    });

    it("should return false when NEXT_PUBLIC_DEMO_MODE is 'false' or not 'true'", () => {
      process.env.NEXT_PUBLIC_DEMO_MODE = "false";
      expect(isDemoMode()).toBe(false);

      delete process.env.NEXT_PUBLIC_DEMO_MODE;
      expect(isDemoMode()).toBe(false);
    });
  });

  describe("getPrimaryModel", () => {
    it("should return GEMINI_MODEL environment variable when set", () => {
      process.env.GEMINI_MODEL = "gemini-2.0-pro";
      expect(getPrimaryModel()).toBe("gemini-2.0-pro");
    });

    it("should return default fallback model 'gemini-2.5-flash-lite' when GEMINI_MODEL is not set", () => {
      delete process.env.GEMINI_MODEL;
      expect(getPrimaryModel()).toBe("gemini-2.5-flash-lite");
    });
  });

  describe("getModelChain", () => {
    it("should return unique list of models including primary model", () => {
      delete process.env.GEMINI_MODEL;
      expect(getModelChain()).toEqual(["gemini-2.5-flash-lite", "gemini-2.5-flash"]);

      process.env.GEMINI_MODEL = "gemini-2.0-pro";
      expect(getModelChain()).toEqual([
        "gemini-2.5-flash-lite",
        "gemini-2.0-pro",
        "gemini-2.5-flash",
      ]);
    });
  });

  describe("workingModelIndex state", () => {
    it("should get and set working model index correctly", () => {
      expect(getWorkingModelIndex()).toBe(0);
      setWorkingModelIndex(2);
      expect(getWorkingModelIndex()).toBe(2);
      setWorkingModelIndex(0); // reset back
    });
  });
});
