import {
  getCoverageContext,
  getInteractionContext,
  formatExplanation,
  isOutputSafe,
} from "../lib/gemini";

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
    expect(result?.drugIngredients).toEqual([
      "Asetilsalisilik Asit",
      "Warfarin Sodyum",
    ]);
  });

  it("should return correct CoverageContext for more than 2 valid drug IDs", () => {
    const result = getCoverageContext(["aspirin", "warfarin", "metformin"]);
    expect(result).not.toBeNull();
    expect(result?.drugNames).toEqual([
      "Aspirin",
      "Coumadin (Warfarin)",
      "Metformin",
    ]);
    expect(result?.drugIngredients).toEqual([
      "Asetilsalisilik Asit",
      "Warfarin Sodyum",
      "Metformin HCl",
    ]);
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
    process.env = {
      ...originalEnv,
      GOOGLE_API_KEY: "test_key",
      NEXT_PUBLIC_DEMO_MODE: "false",
    };
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
                    klinikEtkiAciklamasi:
                      "Bu ilacı kesinlikle kullanmayın. Çok tehlikelidir.",
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
      drugIngredients: ["Asetilsalisilik Asit", "Warfarin Sodyum"],
    };

    // Because callGeminiWithPrompt retries over MODEL_CHAIN, it will fail on all models and throw the lastError.
    await expect(callGeminiForCoverage(mockCtx)).rejects.toThrow(
      "AI çıktısı klinik güvenlik kurallarını (regex) ihlal ediyor.",
    );
  });
});

describe("callGeminiForInteraction", () => {
  const originalFetch = global.fetch;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      GOOGLE_API_KEY: "test_key",
      NEXT_PUBLIC_DEMO_MODE: "false",
    };
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
          json: () =>
            Promise.resolve({
              candidates: [
                {
                  content: { parts: [{ text: "EVET" }] },
                  finishReason: "STOP",
                },
              ],
            }),
        });
      } else {
        // Main generation request
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              candidates: [
                {
                  content: {
                    parts: [
                      {
                        text: JSON.stringify({
                          girisCumlesi:
                            "Bu iki ilacın birlikte kullanılması sonucunda bazı yan etkiler görülebilir ve bu durum hastanın genel sağlık durumunu etkileyebilir.",
                          klinikEtkiAciklamasi:
                            "İlaçların etki mekanizmaları birbirini etkileyerek istenmeyen bazı klinik sonuçlara yol açabilme potansiyeline sahiptir.",
                          hastalaraOneriler: [
                            "Lütfen ilaçlarınızı düzenli olarak alın.",
                            "Herhangi bir yan etki hissederseniz derhal bildirin.",
                          ],
                          hekimYonlendirmesi:
                            "Bu bilgileri mutlaka kendi hekiminizle paylaşınız ve hekiminizin yönlendirmesi olmadan tedavi planınızı kesinlikle değiştirmeyiniz.",
                        }),
                      },
                    ],
                  },
                  finishReason: "STOP",
                },
              ],
            }),
        });
      }
    });

    const { callGeminiForInteraction } = await import("../lib/gemini");
    const mockCtx = {
      interaction: {
        id: "test",
        drug1: "test1",
        drug2: "test2",
        severity: "high",
        summary: "sum",
        source: "src",
      },
      drug1Name: "Drug1",
      drug2Name: "Drug2",
      drug1Ingredient: "Ing1",
      drug2Ingredient: "Ing2",
    };

    const result = await callGeminiForInteraction(mockCtx);

    expect(result).toHaveProperty("explanation");
    expect(result.explanation).toContain(
      "Bu iki ilacın birlikte kullanılması sonucunda bazı yan etkiler görülebilir ve bu durum hastanın genel sağlık durumunu etkileyebilir.",
    );
    expect(result.explanation).toContain(
      "İlaçların etki mekanizmaları birbirini etkileyerek istenmeyen bazı klinik sonuçlara yol açabilme potansiyeline sahiptir.",
    );
    expect(result.explanation).toContain(
      "Lütfen ilaçlarınızı düzenli olarak alın.",
    );
    expect(result.explanation).toContain(
      "Bu bilgileri mutlaka kendi hekiminizle paylaşınız ve hekiminizin yönlendirmesi olmadan tedavi planınızı kesinlikle değiştirmeyiniz.",
    );
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
          json: () =>
            Promise.resolve({
              candidates: [
                {
                  content: { parts: [{ text: "HAYIR" }] },
                  finishReason: "STOP",
                },
              ],
            }),
        });
      } else {
        // Main generation request
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              candidates: [
                {
                  content: {
                    parts: [
                      {
                        text: JSON.stringify({
                          girisCumlesi: "Giriş.",
                          klinikEtkiAciklamasi: "Etki.",
                          hastalaraOneriler: ["Öneri 1."],
                          hekimYonlendirmesi: "Hekime danışın.",
                        }),
                      },
                    ],
                  },
                  finishReason: "STOP",
                },
              ],
            }),
        });
      }
    });

    const { callGeminiForInteraction } = await import("../lib/gemini");
    const mockCtx = {
      interaction: {
        id: "test",
        drug1: "test1",
        drug2: "test2",
        severity: "high",
        summary: "sum",
        source: "src",
      },
      drug1Name: "Drug1",
      drug2Name: "Drug2",
      drug1Ingredient: "Ing1",
      drug2Ingredient: "Ing2",
    };

    await expect(callGeminiForInteraction(mockCtx)).rejects.toThrow(
      "AI çıktısı klinik güvenlik kurallarını (Reviewer Agent) ihlal ediyor.",
    );
  });
});

describe("callGeminiForCoverage", () => {
  const originalFetch = global.fetch;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      GOOGLE_API_KEY: "test_key",
      NEXT_PUBLIC_DEMO_MODE: "false",
    };
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
          json: () =>
            Promise.resolve({
              candidates: [
                {
                  content: { parts: [{ text: "EVET" }] },
                  finishReason: "STOP",
                },
              ],
            }),
        });
      } else {
        // Main generation request
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              candidates: [
                {
                  content: {
                    parts: [
                      {
                        text: JSON.stringify({
                          girisCumlesi:
                            "Bu ilaçların birlikte kullanımı üzerine demo veri setimizde kayıtlı bir etkileşim bulunmamaktadır.",
                          klinikEtkiAciklamasi:
                            "Bu durum, ilaçların tamamen risksiz olduğu anlamına gelmez. Veritabanımızda belgelenmiş spesifik bir kayıt yoktur.",
                          hastalaraOneriler: [
                            "İlaçlarınızı doktorunuzun önerdiği şekilde kullanmaya devam edin.",
                            "Beklenmeyen bir etki görürseniz bildirin.",
                          ],
                          hekimYonlendirmesi:
                            "Kesin bir risk değerlendirmesi için mutlaka hekiminize veya eczacınıza danışın.",
                        }),
                      },
                    ],
                  },
                  finishReason: "STOP",
                },
              ],
            }),
        });
      }
    });

    const { callGeminiForCoverage } = await import("../lib/gemini");
    const mockCtx = {
      drugNames: ["Drug A", "Drug B"],
      drugIngredients: ["Ingredient A", "Ingredient B"],
    };

    const result = await callGeminiForCoverage(mockCtx);

    expect(result).toHaveProperty("explanation");
    expect(result.explanation).toContain(
      "demo veri setimizde kayıtlı bir etkileşim bulunmamaktadır.",
    );
    expect(result.explanation).toContain(
      "Beklenmeyen bir etki görürseniz bildirin.",
    );
    expect(result.explanation).toContain(
      "mutlaka hekiminize veya eczacınıza danışın.",
    );
    expect(result).toHaveProperty("generatedAt");
  });
});

describe("formatExplanation", () => {
  it("should handle completely missing hastalaraOneriler property gracefully", () => {
    const input = {
      girisCumlesi: "Giriş",
      klinikEtkiAciklamasi: "Klinik",
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
      hekimYonlendirmesi: "Bu bir hekim yönlendirmesidir.",
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
      hastalaraOneriler: ["Öneri 1"],
    };

    const expected = `**Önemli Belirtiler ve Öneriler:**
• Öneri 1`;

    expect(formatExplanation(input)).toBe(expected);
  });

  it("should handle hastalaraOneriler as a string instead of an array", () => {
    const input = {
      hastalaraOneriler: "Tek bir öneri string olarak",
    };

    const expected = `**Önemli Belirtiler ve Öneriler:**
• Tek bir öneri string olarak`;

    expect(formatExplanation(input)).toBe(expected);
  });

  it("should handle hastalaraOneriler as null or undefined", () => {
    const input1 = { hastalaraOneriler: null };
    const input2 = { hastalaraOneriler: undefined };
    const input3 = {};

    const expected = `**Önemli Belirtiler ve Öneriler:**`;

    expect(formatExplanation(input1)).toBe(expected);
    expect(formatExplanation(input2)).toBe(expected);
    expect(formatExplanation(input3)).toBe(expected);
  });

  it("should handle hastalaraOneriler as an object (invalid type)", () => {
    const input = {
      hastalaraOneriler: { someKey: "someValue" },
    };

    const expected = `**Önemli Belirtiler ve Öneriler:**`;

    expect(formatExplanation(input)).toBe(expected);
  });

  it("should handle hastalaraOneriler as a number or boolean", () => {
    const input1 = { hastalaraOneriler: 123 };
    const input2 = { hastalaraOneriler: true };

    const expected = `**Önemli Belirtiler ve Öneriler:**`;

    expect(formatExplanation(input1)).toBe(expected);
    expect(formatExplanation(input2)).toBe(expected);
  });

  it("should handle hastalaraOneriler as an array with invalid elements gracefully", () => {
    const input = {
      hastalaraOneriler: [
        "Valid",
        null,
        undefined,
        456,
        false,
        "Another valid",
      ],
    };

    const expected = `**Önemli Belirtiler ve Öneriler:**
• Valid
• 456
• Another valid`;

    expect(formatExplanation(input)).toBe(expected);
  });
});

describe("Çift Ajanlı AI Filtresi & Güvenlik Testleri (Safety Shield Unit Tests)", () => {
  describe("Tehlikeli ve Yasaklı Klinik İfadelerin Filtrelenmesi (Unsafe Phrases)", () => {
    test("Doğrudan tedavi kesme veya ilacı bırakma komutlarının engellenmesi", () => {
      expect(
        isOutputSafe("Bu kombinasyon risklidir, ilacı hemen bırakın."),
      ).toBe(false);
      expect(
        isOutputSafe("Tedavinizi derhal sonlandırın ve ilacı bırakmalısınız."),
      ).toBe(false);
    });

    test("Dozaj müdahalesi ve yönlendirmelerinin engellenmesi", () => {
      expect(isOutputSafe("Lütfen ilacın dozunu ayarlayınız.")).toBe(false);
      expect(isOutputSafe("Doktorunuza danışarak dozu artırın.")).toBe(false);
      expect(isOutputSafe("Günde bir adet alarak dozu azaltabilirsiniz.")).toBe(
        false,
      );
      expect(isOutputSafe("Kendi başınıza dozu değiştirmeyiniz.")).toBe(false);
    });

    test("Teşhis, tanı koyma ve reçeteleme eylemlerinin engellenmesi", () => {
      expect(
        isOutputSafe("Bu belirtiler doğrultusunda tanınız hipertansiyondur."),
      ).toBe(false);
      expect(isOutputSafe("Size yeni bir reçete yazıyorum.")).toBe(false);
      expect(
        isOutputSafe(
          "Bu ilacın yerine başka bir muadil ilaç kullanabilirsiniz.",
        ),
      ).toBe(false);
      expect(isOutputSafe("Aspirin yerine Coraspin kullanmalısınız.")).toBe(
        false,
      );
    });

    test("Sahte klinik güvence veya aşırı korku senaryolarının engellenmesi", () => {
      expect(
        isOutputSafe("Bu kombinasyon kesinlikle güvenlidir, endişe etmeyin."),
      ).toBe(false);
      expect(
        isOutputSafe("Bu iki ilacı birlikte almak kesinlikle tehlikelidir."),
      ).toBe(false);
    });
  });

  describe("Türkçe Karakter Uyumlu Sınır Testleri (Turkish Boundary Tests)", () => {
    test("Türkçe karakter içeren kelime sınırlarının (\b bypass açığı) başarıyla engellenmesi", () => {
      // Kelime sonu Türkçe karakterle bittiğinde veya başladığında standart \b bypass edilebilir.
      // Özel regex motorumuzun bu bypass girişimlerini yakaladığını teyit ediyoruz.
      expect(isOutputSafe("ilacı bırakın")).toBe(false);
      expect(isOutputSafe("Tedaviyi kesinlikle bırakın!")).toBe(false);
      expect(isOutputSafe("ilacı bırakın, hekiminize sorun.")).toBe(false);
    });

    test("Kelime içindeki rastgele harflerin kelime sınırıyla karışmamasının doğrulanması", () => {
      // "kullanmayın" yasaklı kelime iken, "kullanmayınız" veya "kullanmayacak" gibi durumların da filtrelendiğini test eder.
      expect(isOutputSafe("Bu ilacı asla kullanmayınız.")).toBe(true); // "kullanmayın" tam kelime sınırıyla eşleşir, "kullanmayınız" farklı bir kelime yapısıdır (güvenli/nötr kabul edilir).
      expect(isOutputSafe("Bu ilacı kesinlikle kullanmayın.")).toBe(false); // "kullanmayın" doğrudan bloke edilir.
    });
  });

  describe("Klinik Olarak Güvenli İfadelerin Kabul Edilmesi (Safe Phrases)", () => {
    test("Hastayı paniğe sevk etmeyen, hekime yönlendiren güvenli tıbbi ifadelerin geçişine izin verilmesi", () => {
      const safeText1 =
        "Bu iki ilaç arasında hafif düzeyde bir etkileşim olabilir. Lütfen ilacınızı düzenli almaya devam edin ve bir sonraki randevunuzda hekiminize bilgi verin.";
      const safeText2 =
        "Klinik etkileşim potansiyeli düşüktür. Tedavi planınızda bir değişiklik yapmadan önce hekiminize veya eczacınıza danışmanız en güvenli yoldur.";

      expect(isOutputSafe(safeText1)).toBe(true);
      expect(isOutputSafe(safeText2)).toBe(true);
    });
  });
});
