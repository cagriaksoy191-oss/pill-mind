import { getCoverageContext, getInteractionContext, buildInteractionStreamPrompt, isOutputSafe, normalizeExplanation, isExplanationComplete} from "../lib/gemini";

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
  const origDb = process.env.DATABASE_URL;
  beforeAll(() => {
    delete process.env.DATABASE_URL;
  });
  afterAll(() => {
    if (origDb) process.env.DATABASE_URL = origDb;
  });

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


describe("normalizeExplanation", () => {
  it("should remove carriage returns", () => {
    expect(normalizeExplanation("Hello\r\nWorld")).toBe("Hello\nWorld");
  });

  it("should remove leading greeting patterns like 'merhaba' and 'selam'", () => {
    expect(normalizeExplanation("Merhaba, bu bir test.")).toBe("bu bir test.");
    expect(normalizeExplanation("Selam! nasılsın?")).toBe("nasılsın?");
    expect(normalizeExplanation("merhaba  test")).toBe("test");
    expect(normalizeExplanation("selam test")).toBe("test");
  });

  it("should replace 3 or more newlines with double newlines", () => {
    expect(normalizeExplanation("Line 1\n\n\nLine 2")).toBe("Line 1\n\nLine 2");
    expect(normalizeExplanation("Line 1\n\n\n\nLine 2")).toBe("Line 1\n\nLine 2");
  });

  it("should trim leading and trailing whitespace", () => {
    expect(normalizeExplanation("  test string  ")).toBe("test string");
  });

  it("should handle combinations of all rules", () => {
    expect(normalizeExplanation("Merhaba! \r\n\n\n  Test message \n\n\n End  ")).toBe("Test message \n\n End");
  });
});
describe("isExplanationComplete", () => {
  it("should return false if normalized string is less than 100 characters", () => {
    const shortText = "a".repeat(99);
    expect(isExplanationComplete(shortText)).toBe(false);
  });

  it("should return false if there are fewer than 15 words, even if length >= 100", () => {
    // 10 words, each 10 chars long + spaces = > 100 chars
    const fewWordsText = "abcdefghij ".repeat(10).trim();
    expect(isExplanationComplete(fewWordsText)).toBe(false);
  });

  it("should return true if length >= 100 and words >= 15", () => {
    const validText = "This is a completely valid string that is definitely long enough and has more than fifteen words in it to pass the test completely.";
    expect(isExplanationComplete(validText)).toBe(true);
  });

  it("should handle multiple spaces when splitting into words", () => {
    const validTextWithSpaces = "This    is  a completely   valid string that   is definitely long enough   and has   more than fifteen words in it to pass the test completely.";
    expect(isExplanationComplete(validTextWithSpaces)).toBe(true);
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
      "Tüm Gemini modelleri başarısız oldu."
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
      "Tüm Gemini modelleri başarısız oldu."
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

describe("isOutputSafe", () => {
  it("should return true for safe text", () => {
    expect(isOutputSafe("Bu ilaçların bir arada kullanımında bilinen bir etkileşim yoktur.")).toBe(true);
    expect(isOutputSafe("Düzenli egzersiz yapmak sağlığınıza iyi gelir.")).toBe(true);
  });

  it("should return false for text containing unsafe patterns", () => {
    expect(isOutputSafe("Bu ilacı kesinlikle kullanmayın")).toBe(false);
    expect(isOutputSafe("Tedaviyi bırakınız")).toBe(false);
    expect(isOutputSafe("İlacı hemen kesmelisiniz")).toBe(false);
    expect(isOutputSafe("Dozunuzu artırın")).toBe(false);
    expect(isOutputSafe("İlacın dozu azaltılmalıdır")).toBe(false);
    expect(isOutputSafe("Bu sizin için tamamen güvenli")).toBe(false);
    expect(isOutputSafe("Hiç risk yok")).toBe(false);
  });

  it("should handle case sensitivity and Turkish characters", () => {
    expect(isOutputSafe("kullanmayın")).toBe(false);
  });
});





describe("runReviewerAgent", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("should return true when safety check responds with EVET", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        candidates: [{ content: { parts: [{ text: " EVET " }] } }]
      })
    });

    const { runReviewerAgent } = await import("../lib/gemini");
    const result = await runReviewerAgent("Safe text");
    expect(result).toBe(true);
  });

  it("should return false when safety check responds with HAYIR", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        candidates: [{ content: { parts: [{ text: " HAYIR " }] } }]
      })
    });

    const { runReviewerAgent } = await import("../lib/gemini");
    const result = await runReviewerAgent("Unsafe text with medical advice");
    expect(result).toBe(false);
  });

  it("should return true (degraded mode) when fetch fails with ok: false", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
    });
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    const { runReviewerAgent } = await import("../lib/gemini");
    const result = await runReviewerAgent("Text");
    expect(result).toBe(true);
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("[PillMind AI Safety] Reviewer Agent (gemini-2.5-flash-lite) bağlantısı kurulamadı. Regex kontrolüne güvenilerek [SAFETY SHIELD DEGRADED] moduyla devam ediliyor.")
    );
  });

  it("should return true (degraded mode) when fetch throws an error (e.g. timeout)", async () => {
    const error = new Error("Network timeout");
    global.fetch = jest.fn().mockRejectedValue(error);
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    const { runReviewerAgent } = await import("../lib/gemini");
    const result = await runReviewerAgent("Text");
    expect(result).toBe(true);
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("[PillMind AI Safety] Reviewer Agent (gemini-2.5-flash-lite) denetimi sırasında hata, [SAFETY SHIELD DEGRADED] moduyla devam ediliyor:"),
      error
    );
  });
});
describe("streamGeminiContent & executeSpeculativeStreamFetch", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("should handle error when a model fetch fails, log warning, and fall back to working model", async () => {
    const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

    // Mock fetch: first call fails (e.g. 500 API Error), second call succeeds
    const encoder = new TextEncoder();
    const mockResponseBody = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(JSON.stringify({
          candidates: [{ content: { parts: [{ text: "Streamed response text" }] } }]
        })));
        controller.close();
      }
    });

    let fetchCount = 0;
    global.fetch = jest.fn().mockImplementation(() => {
      fetchCount++;
      if (fetchCount === 1) {
        return Promise.resolve({
          ok: false,
          status: 500,
        });
      }
      return Promise.resolve({
        ok: true,
        body: mockResponseBody,
      });
    });

    const { streamGeminiContent } = await import("../lib/gemini");
    const generator = streamGeminiContent("Test prompt");
    const chunks: string[] = [];
    for await (const chunk of generator) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual(["Streamed response text"]);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("[GEMINI STREAM] Model"),
      expect.any(Error)
    );
  });

  it("should throw error when all models in the stream chain fail", async () => {
    jest.spyOn(console, "warn").mockImplementation(() => {});

    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
    });

    const { streamGeminiContent } = await import("../lib/gemini");
    const generator = streamGeminiContent("Test prompt");

    await expect(async () => {
      for await (const chunk of generator) {
        expect(chunk).toBeDefined();
      }
    }).rejects.toThrow("API Error 503");
  });

  it("should handle speculative timeout and launch fallback model", async () => {
    jest.spyOn(console, "info").mockImplementation(() => {});

    const encoder = new TextEncoder();
    const mockResponseBody = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(JSON.stringify({
          candidates: [{ content: { parts: [{ text: "Fallback stream text" }] } }]
        })));
        controller.close();
      }
    });

    let fetchCount = 0;
    global.fetch = jest.fn().mockImplementation(() => {
      fetchCount++;
      if (fetchCount === 1) {
        // Slow response that triggers speculative timeout
        return new Promise((resolve) => setTimeout(() => resolve({ ok: false, status: 504 }), 3000));
      }
      return Promise.resolve({
        ok: true,
        body: mockResponseBody,
      });
    });

    const { streamGeminiContent } = await import("../lib/gemini");
    const generator = streamGeminiContent("Test prompt");
    const chunks: string[] = [];
    for await (const chunk of generator) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual(["Fallback stream text"]);
    expect(console.info).toHaveBeenCalledWith(
      expect.stringContaining("taking longer than 1500ms. Launching fallback speculatively.")
    );
  }, 10000);
});
