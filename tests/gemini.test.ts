import { getCoverageContext, getInteractionContext, formatExplanation, buildInteractionStreamPrompt } from "../lib/gemini";

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
  it("should return null for invalid interaction IDs (empty, non-string, too long)", async () => {
    expect(await getInteractionContext("")).toBeNull();
    // @ts-expect-error - testing invalid type
    expect(await getInteractionContext(null)).toBeNull();
    // @ts-expect-error - testing invalid type
    expect(await getInteractionContext(123)).toBeNull();
    expect(await getInteractionContext("a".repeat(101))).toBeNull();
  });

  it("should return null for an unknown interaction ID", async () => {
    expect(await getInteractionContext("invalid_interaction_id")).toBeNull();
  });

  it("should return correct InteractionContext for a valid interaction ID", async () => {
    const result = await getInteractionContext("aspirin-warfarin");
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


describe("Gemini Safety Shield Bypass", () => {
  const originalFetch = global.fetch;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv, GOOGLE_API_KEY: "test_key", NEXT_PUBLIC_DEMO_MODE: "false" };
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  it("should throw an error when the generated AI output violates the deterministic regex filter", async () => {
    // We mock fetch to simulate a response that parses to JSON and contains an unsafe word like "kullanmayın"
    global.fetch = jest.fn().mockImplementation(() => {
      const mockGeminiResponse = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    girisCumlesi: "Merhaba",
                    klinikEtkiAciklamasi: "Bu ilacı kesinlikle kullanmayın. Çok tehlikelidir.",
                    hastalaraOneriler: ["Sadece doktorunuzu dinleyin."],
                    hekimYonlendirmesi: "Doktorunuza danışın.",
                  }),
                },
              ],
            },
            finishReason: "STOP",
          },
        ],
      };

      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockGeminiResponse),
      } as Response);
    });

    const { callGeminiForCoverage } = await import("../lib/gemini");

    // Dummy coverage context
    const mockCtx = {
      drugNames: ["Aspirin", "Warfarin"],
      drugIngredients: ["Asetilsalisilik Asit", "Warfarin Sodyum"]
    };

    // Because callGeminiWithPrompt retries over MODEL_CHAIN, it will fail on all models and throw the lastError.
    await expect(callGeminiForCoverage(mockCtx)).rejects.toThrow(
      "AI çıktısı klinik güvenlik kurallarını (regex) ihlal ediyor."
    );
  });
});


describe("callGeminiForInteraction", () => {
  const originalFetch = global.fetch;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv, GOOGLE_API_KEY: "test_key", NEXT_PUBLIC_DEMO_MODE: "false" };
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  it("should return parsed GeminiResult when both generation and Reviewer Agent succeed", async () => {
    global.fetch = jest.fn().mockImplementation((url, options) => {
      const body = JSON.parse(options.body);
      const text = body.contents[0].parts[0].text;

      if (text.includes("Sen Sağlık Bilgi Sistemleri Yöneticisi")) {
        // Reviewer agent request
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            candidates: [{ content: { parts: [{ text: "EVET" }] }, finishReason: "STOP" }],
          }),
        });
      } else {
        // Main generation request
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            candidates: [{
              content: {
                parts: [{
                  text: JSON.stringify({
                    girisCumlesi: "Bu iki ilacın birlikte kullanılması sonucunda bazı yan etkiler görülebilir ve bu durum hastanın genel sağlık durumunu etkileyebilir.",
                    klinikEtkiAciklamasi: "İlaçların etki mekanizmaları birbirini etkileyerek istenmeyen bazı klinik sonuçlara yol açabilme potansiyeline sahiptir.",
                    hastalaraOneriler: ["Lütfen ilaçlarınızı düzenli olarak alın.", "Herhangi bir yan etki hissederseniz derhal bildirin."],
                    hekimYonlendirmesi: "Bu bilgileri mutlaka kendi hekiminizle paylaşınız ve hekiminizin yönlendirmesi olmadan tedavi planınızı kesinlikle değiştirmeyiniz."
                  })
                }]
              },
              finishReason: "STOP"
            }],
          }),
        });
      }
    });

    const { callGeminiForInteraction } = await import("../lib/gemini");
    const mockCtx = {
      interaction: {
        id: "test", drug1: "test1", drug2: "test2", severity: "high", summary: "sum", source: "src"
      },
      drug1Name: "Drug1",
      drug2Name: "Drug2",
      drug1Ingredient: "Ing1",
      drug2Ingredient: "Ing2"
    };

    const result = await callGeminiForInteraction(mockCtx);

    expect(result).toHaveProperty("explanation");
    expect(result.explanation).toContain("Bu iki ilacın birlikte kullanılması sonucunda bazı yan etkiler görülebilir ve bu durum hastanın genel sağlık durumunu etkileyebilir.");
    expect(result.explanation).toContain("İlaçların etki mekanizmaları birbirini etkileyerek istenmeyen bazı klinik sonuçlara yol açabilme potansiyeline sahiptir.");
    expect(result.explanation).toContain("Lütfen ilaçlarınızı düzenli olarak alın.");
    expect(result.explanation).toContain("Bu bilgileri mutlaka kendi hekiminizle paylaşınız ve hekiminizin yönlendirmesi olmadan tedavi planınızı kesinlikle değiştirmeyiniz.");
    expect(result).toHaveProperty("generatedAt");
  });

  it("should throw an error when Reviewer Agent returns HAYIR", async () => {
    global.fetch = jest.fn().mockImplementation((url, options) => {
      const body = JSON.parse(options.body);
      const text = body.contents[0].parts[0].text;

      if (text.includes("Sen Sağlık Bilgi Sistemleri Yöneticisi")) {
        // Reviewer agent request -> FAILS the safety check
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            candidates: [{ content: { parts: [{ text: "HAYIR" }] }, finishReason: "STOP" }],
          }),
        });
      } else {
        // Main generation request
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            candidates: [{
              content: {
                parts: [{
                  text: JSON.stringify({
                    girisCumlesi: "Giriş.",
                    klinikEtkiAciklamasi: "Etki.",
                    hastalaraOneriler: ["Öneri 1."],
                    hekimYonlendirmesi: "Hekime danışın."
                  })
                }]
              },
              finishReason: "STOP"
            }],
          }),
        });
      }
    });

    const { callGeminiForInteraction } = await import("../lib/gemini");
    const mockCtx = {
      interaction: {
        id: "test", drug1: "test1", drug2: "test2", severity: "high", summary: "sum", source: "src"
      },
      drug1Name: "Drug1",
      drug2Name: "Drug2",
      drug1Ingredient: "Ing1",
      drug2Ingredient: "Ing2"
    };

    await expect(callGeminiForInteraction(mockCtx)).rejects.toThrow(
      "AI çıktısı klinik güvenlik kurallarını (Reviewer Agent) ihlal ediyor."
    );
  });
});


describe("callGeminiForCoverage", () => {
  const originalFetch = global.fetch;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv, GOOGLE_API_KEY: "test_key", NEXT_PUBLIC_DEMO_MODE: "false" };
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  it("should return parsed GeminiResult when generation and Reviewer Agent succeed for coverage", async () => {
    global.fetch = jest.fn().mockImplementation((url, options) => {
      const body = JSON.parse(options.body);
      const text = body.contents[0].parts[0].text;

      if (text.includes("Sen Sağlık Bilgi Sistemleri Yöneticisi")) {
        // Reviewer agent request -> PASSES the safety check
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            candidates: [{ content: { parts: [{ text: "EVET" }] }, finishReason: "STOP" }],
          }),
        });
      } else {
        // Main generation request
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            candidates: [{
              content: {
                parts: [{
                  text: JSON.stringify({
                    girisCumlesi: "Bu ilaçların birlikte kullanımı üzerine demo veri setimizde kayıtlı bir etkileşim bulunmamaktadır.",
                    klinikEtkiAciklamasi: "Bu durum, ilaçların tamamen risksiz olduğu anlamına gelmez. Veritabanımızda belgelenmiş spesifik bir kayıt yoktur.",
                    hastalaraOneriler: ["İlaçlarınızı doktorunuzun önerdiği şekilde kullanmaya devam edin.", "Beklenmeyen bir etki görürseniz bildirin."],
                    hekimYonlendirmesi: "Kesin bir risk değerlendirmesi için mutlaka hekiminize veya eczacınıza danışın."
                  })
                }]
              },
              finishReason: "STOP"
            }],
          }),
        });
      }
    });

    const { callGeminiForCoverage } = await import("../lib/gemini");
    const mockCtx = {
      drugNames: ["Drug A", "Drug B"],
      drugIngredients: ["Ingredient A", "Ingredient B"]
    };

    const result = await callGeminiForCoverage(mockCtx);

    expect(result).toHaveProperty("explanation");
    expect(result.explanation).toContain("demo veri setimizde kayıtlı bir etkileşim bulunmamaktadır.");
    expect(result.explanation).toContain("Beklenmeyen bir etki görürseniz bildirin.");
    expect(result.explanation).toContain("mutlaka hekiminize veya eczacınıza danışın.");
    expect(result).toHaveProperty("generatedAt");
  });
});

describe("formatExplanation", () => {

  it("should handle completely missing hastalaraOneriler property gracefully", () => {
    const input = {
      girisCumlesi: "Giriş",
      klinikEtkiAciklamasi: "Klinik"
    };

    const expected = `Giriş

Klinik

**Önemli Belirtiler ve Öneriler:**`;

    expect(formatExplanation(input)).toBe(expected);
  });

  it("should format a well-formed JSON object correctly", () => {
    const input = {
      girisCumlesi: "Bu bir giriş cümlesidir.",
      klinikEtkiAciklamasi: "Bu bir klinik etki açıklamasıdır.",
      hastalaraOneriler: ["Öneri 1", "Öneri 2"],
      hekimYonlendirmesi: "Bu bir hekim yönlendirmesidir."
    };

    const expected = `Bu bir giriş cümlesidir.

Bu bir klinik etki açıklamasıdır.

**Önemli Belirtiler ve Öneriler:**
• Öneri 1
• Öneri 2

Bu bir hekim yönlendirmesidir.`;

    expect(formatExplanation(input)).toBe(expected);
  });

  it("should handle missing string fields gracefully", () => {
    const input = {
      hastalaraOneriler: ["Öneri 1"]
    };

    const expected = `**Önemli Belirtiler ve Öneriler:**
• Öneri 1`;

    expect(formatExplanation(input)).toBe(expected);
  });

  it("should handle hastalaraOneriler as a string instead of an array", () => {
    const input = {
      hastalaraOneriler: "Tek bir öneri string olarak"
    };

    const expected = `**Önemli Belirtiler ve Öneriler:**
• Tek bir öneri string olarak`;

    expect(formatExplanation(input)).toBe(expected);
  });

  it("should handle hastalaraOneriler as null or undefined", () => {
    const input1 = { hastalaraOneriler: null } as any;
    const input2 = { hastalaraOneriler: undefined } as any;
    const input3 = {};

    const expected = `**Önemli Belirtiler ve Öneriler:**`;

    expect(formatExplanation(input1)).toBe(expected);
    expect(formatExplanation(input2)).toBe(expected);
    expect(formatExplanation(input3)).toBe(expected);
  });

  it("should handle hastalaraOneriler as an object (invalid type)", () => {
    const input = {
      hastalaraOneriler: { someKey: "someValue" }
    } as any;

    const expected = `**Önemli Belirtiler ve Öneriler:**`;

    expect(formatExplanation(input)).toBe(expected);
  });

  it("should handle hastalaraOneriler as a number or boolean", () => {
    const input1 = { hastalaraOneriler: 123 } as any;
    const input2 = { hastalaraOneriler: true } as any;

    const expected = `**Önemli Belirtiler ve Öneriler:**`;

    expect(formatExplanation(input1)).toBe(expected);
    expect(formatExplanation(input2)).toBe(expected);
  });

  it("should handle hastalaraOneriler as an array with invalid elements gracefully", () => {
    const input = {
      hastalaraOneriler: ["Valid", null, undefined, 456, false, "Another valid"]
    } as any;

    const expected = `**Önemli Belirtiler ve Öneriler:**
• Valid
• 456
• Another valid`;

    expect(formatExplanation(input)).toBe(expected);
  });

});

describe("buildInteractionStreamPrompt", () => {
  it("should generate prompt with correct severity labels", () => {
    const baseCtx = {
      drug1Name: "Drug A",
      drug2Name: "Drug B",
      drug1Ingredient: "Ingredient A",
      drug2Ingredient: "Ingredient B",
      interaction: {
        id: "1",
        drug1Id: "d1",
        drug2Id: "d2",
        severity: "high" as const,
        summary: "Test summary",
        evidences: [],
        mechanisms: []
      }
    };

    const promptHigh = buildInteractionStreamPrompt(baseCtx);
    expect(promptHigh).toContain("Şiddet Derecesi: yüksek");

    const promptMedium = buildInteractionStreamPrompt({
      ...baseCtx,
      interaction: { ...baseCtx.interaction, severity: "medium" as const }
    });
    expect(promptMedium).toContain("Şiddet Derecesi: orta");

    const promptLow = buildInteractionStreamPrompt({
      ...baseCtx,
      interaction: { ...baseCtx.interaction, severity: "low" as const }
    });
    expect(promptLow).toContain("Şiddet Derecesi: düşük");
  });

  it("should correctly format the drugs and summary into the prompt", () => {
    const prompt = buildInteractionStreamPrompt({
      drug1Name: "Drug A",
      drug2Name: "Drug B",
      drug1Ingredient: "Ingredient A",
      drug2Ingredient: "Ingredient B",
      interaction: {
        id: "1",
        drug1Id: "d1",
        drug2Id: "d2",
        severity: "high",
        summary: "Critical interaction here.",
        evidences: [],
        mechanisms: []
      }
    });

    expect(prompt).toContain("İlaç 1: Drug A (Etken madde: Ingredient A)");
    expect(prompt).toContain("İlaç 2: Drug B (Etken madde: Ingredient B)");
    expect(prompt).toContain("Doğrulanmış Tıbbi Özet: Critical interaction here.");
  });
});

describe("buildCoverageStreamPrompt", () => {
  it("should generate the correct prompt with drug names and ingredients", async () => {
    const { buildCoverageStreamPrompt } = await import("../lib/gemini");
    const mockCtx = {
      drugNames: ["Drug A", "Drug B"],
      drugIngredients: ["Ing A", "Ing B"]
    };

    const prompt = buildCoverageStreamPrompt(mockCtx);

    expect(prompt).toContain("Sen Sağlık İletişim Asistanı ve Tıbbi Yapay Zeka Güvenlik Uzmanısın.");
    expect(prompt).toContain("Seçilen ilaçlar: Drug A, Drug B");
    expect(prompt).toContain("Etken maddeler: Ing A, Ing B");
    expect(prompt).toContain("kullanmayın");
    expect(prompt).toContain("bırakın");
  });
});
