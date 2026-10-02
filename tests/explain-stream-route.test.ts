import { POST } from "../app/api/explain/route";
import { redis } from "@/lib/redis";
import * as gemini from "@/lib/gemini";

jest.mock("@/lib/auth", () => ({
  verifyCSRF: jest.fn().mockReturnValue(true),
}));

jest.mock("@/lib/redis", () => ({
  redis: {
    get: jest.fn(),
    set: jest.fn(),
    incr: jest.fn(),
    expire: jest.fn(),
  },
}));

// Mock the gemini functions
jest.mock("@/lib/gemini", () => {
  const original = jest.requireActual("@/lib/gemini");
  return {
    ...original,
    getInteractionContext: jest.fn(),
    getCoverageContext: jest.fn(),
    shouldUseFallback: jest.fn().mockReturnValue(false),
    streamGeminiContent: jest.fn(),
    runReviewerAgent: jest.fn(),
    buildInteractionStreamPrompt: jest.fn().mockReturnValue("mock interaction prompt"),
    buildCoverageStreamPrompt: jest.fn().mockReturnValue("mock coverage prompt"),
  };
});

describe("POST /api/explain Streaming Mode (Sprint 2)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should stream cached response if cache hit occurs", async () => {
    (redis!.incr as jest.Mock).mockResolvedValue(1);
    (gemini.getInteractionContext as jest.Mock).mockResolvedValue({
      interaction: { id: "test", severity: "high", summary: "Test Summary", source: "test" },
      drug1Name: "Drug A",
      drug2Name: "Drug B",
      drug1Ingredient: "A",
      drug2Ingredient: "B",
    });

    const cachedData = { explanation: "Bu bir önbelleğe alınmış açıklamadır.", generatedAt: "12:00:00" };
    (redis!.get as jest.Mock).mockResolvedValue(cachedData);

    const req = new Request("http://localhost/api/explain", {
      method: "POST",
      body: JSON.stringify({ interactionId: "test", stream: true }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");

    const reader = res.body?.getReader();
    const decoder = new TextDecoder();
    let result = "";
    while (true) {
      const { done, value } = await reader!.read();
      if (done) break;
      result += decoder.decode(value);
    }

    expect(result).toContain("Bu bir önbelleğe alınmış açıklamadır.");
    expect(result).toContain("[DONE]");
  });

  it("should stream live Gemini content successfully and cache the result", async () => {
    (redis!.incr as jest.Mock).mockResolvedValue(1);
    (gemini.getInteractionContext as jest.Mock).mockResolvedValue({
      interaction: { id: "test-live", severity: "low", summary: "Test Summary", source: "test" },
      drug1Name: "Drug A",
      drug2Name: "Drug B",
      drug1Ingredient: "A",
      drug2Ingredient: "B",
    });
    (redis!.get as jest.Mock).mockResolvedValue(null);

    async function* mockLiveGenerator() {
      yield "Canlı açıklama parçası 1. ";
      yield "Canlı açıklama parçası 2.";
    }
    (gemini.streamGeminiContent as jest.Mock).mockReturnValue(mockLiveGenerator());
    (gemini.runReviewerAgent as jest.Mock).mockResolvedValue(true);
    (redis!.set as jest.Mock).mockResolvedValue("OK");

    const req = new Request("http://localhost/api/explain", {
      method: "POST",
      body: JSON.stringify({ interactionId: "test-live", stream: true }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");

    const reader = res.body?.getReader();
    const decoder = new TextDecoder();
    let result = "";
    while (true) {
      const { done, value } = await reader!.read();
      if (done) break;
      result += decoder.decode(value);
    }

    expect(result).toContain("Canlı açıklama parçası 1.");
    expect(result).toContain("Canlı açıklama parçası 2.");
    expect(result).toContain('"done":true');
    expect(result).toContain("[DONE]");

    expect(redis!.set).toHaveBeenCalledWith(
      expect.stringContaining("explanation:v3:interaction:test-live"),
      expect.objectContaining({
        explanation: "Canlı açıklama parçası 1. Canlı açıklama parçası 2.",
      }),
      { ex: 604800 }
    );
  });

  it("should block stream and yield UNSAFE_ALERT if chunk-level regex fails", async () => {
    (redis!.incr as jest.Mock).mockResolvedValue(1);
    (gemini.getInteractionContext as jest.Mock).mockResolvedValue({
      interaction: { id: "test", severity: "high", summary: "Test Summary", source: "test" },
      drug1Name: "Drug A",
      drug2Name: "Drug B",
      drug1Ingredient: "A",
      drug2Ingredient: "B",
    });
    (redis!.get as jest.Mock).mockResolvedValue(null);

    // Mock generator to return safe chunk, then an unsafe chunk
    async function* mockGenerator() {
      yield "Bu güvenli bir cümledir.";
      yield " İlacı hemen bırakın."; // Unsafe phrase (bırakın)
    }
    (gemini.streamGeminiContent as jest.Mock).mockReturnValue(mockGenerator());

    const req = new Request("http://localhost/api/explain", {
      method: "POST",
      body: JSON.stringify({ interactionId: "test", stream: true }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const reader = res.body?.getReader();
    const decoder = new TextDecoder();
    let result = "";
    while (true) {
      const { done, value } = await reader!.read();
      if (done) break;
      result += decoder.decode(value);
    }

    expect(result).toContain("UNSAFE_ALERT");
  });

  it("should block stream and yield REJECTED if Reviewer Agent flags output as unsafe", async () => {
    (redis!.incr as jest.Mock).mockResolvedValue(1);
    (gemini.getInteractionContext as jest.Mock).mockResolvedValue({
      interaction: { id: "test-rejected", severity: "high", summary: "Test Summary", source: "test" },
      drug1Name: "Drug A",
      drug2Name: "Drug B",
      drug1Ingredient: "A",
      drug2Ingredient: "B",
    });
    (redis!.get as jest.Mock).mockResolvedValue(null);

    async function* mockGenerator() {
      yield "Bu metin başlangıçta güvenli görünüyor...";
    }
    (gemini.streamGeminiContent as jest.Mock).mockReturnValue(mockGenerator());
    (gemini.runReviewerAgent as jest.Mock).mockResolvedValue(false);

    const req = new Request("http://localhost/api/explain", {
      method: "POST",
      body: JSON.stringify({ interactionId: "test-rejected", stream: true }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const reader = res.body?.getReader();
    const decoder = new TextDecoder();
    let result = "";
    while (true) {
      const { done, value } = await reader!.read();
      if (done) break;
      result += decoder.decode(value);
    }

    expect(result).toContain("REJECTED");
    expect(result).toContain("AI çıktısı klinik güvenlik kurallarını (Reviewer Agent) ihlal ediyor.");
    expect(result).toContain("safety_block");
  });

  it.each([
    { severity: "high", expectSafetyBlock: true },
    { severity: "moderate", expectSafetyBlock: false },
    { severity: "low", expectSafetyBlock: false },
  ])(
    "should yield API_ERROR and close stream if streamGeminiContent throws an error mid-stream (severity: $severity)",
    async ({ severity, expectSafetyBlock }) => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      (redis!.incr as jest.Mock).mockResolvedValue(1);
      (gemini.getInteractionContext as jest.Mock).mockResolvedValue({
        interaction: { id: "test-stream-error", severity, summary: "Test Summary", source: "test" },
        drug1Name: "Drug A",
        drug2Name: "Drug B",
        drug1Ingredient: "A",
        drug2Ingredient: "B",
      });
      (redis!.get as jest.Mock).mockResolvedValue(null);

      async function* mockErrorGenerator() {
        yield "İlk güvenli metin...";
        throw new Error("Stream connection reset mid-flight");
      }
      (gemini.streamGeminiContent as jest.Mock).mockReturnValue(mockErrorGenerator());

      const req = new Request("http://localhost/api/explain", {
        method: "POST",
        body: JSON.stringify({ interactionId: "test-stream-error", stream: true }),
        headers: { "Content-Type": "application/json" },
      });

      const res = await POST(req);
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let result = "";
      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;
        result += decoder.decode(value);
      }

      expect(result).toContain("API_ERROR");
      expect(result).toContain("Canlı AI açıklaması şu anda üretilemedi.");
      if (expectSafetyBlock) {
        expect(result).toContain("safety_block");
      } else {
        expect(result).not.toContain("safety_block");
      }
      consoleSpy.mockRestore();
    }
  );

  it("should stream coverage explanation successfully for valid drugIds with stream=true", async () => {
    (redis!.incr as jest.Mock).mockResolvedValue(1);
    (gemini.getCoverageContext as jest.Mock).mockReturnValue({
      drugs: [{ id: "drug1", name: "Drug1" }, { id: "drug2", name: "Drug2" }],
      combinations: [],
    });
    (redis!.get as jest.Mock).mockResolvedValue(null);

    async function* mockCoverageGenerator() {
      yield "Kapsam açıklaması canlı metni...";
    }
    (gemini.streamGeminiContent as jest.Mock).mockReturnValue(mockCoverageGenerator());
    (gemini.runReviewerAgent as jest.Mock).mockResolvedValue(true);
    (redis!.set as jest.Mock).mockResolvedValue("OK");

    const req = new Request("http://localhost/api/explain", {
      method: "POST",
      body: JSON.stringify({ drugIds: ["drug1", "drug2"], stream: true }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");

    const reader = res.body?.getReader();
    const decoder = new TextDecoder();
    let result = "";
    while (true) {
      const { done, value } = await reader!.read();
      if (done) break;
      result += decoder.decode(value);
    }

    expect(result).toContain("Kapsam açıklaması canlı metni...");
    expect(result).toContain('"done":true');
    expect(result).toContain("[DONE]");
  });
});
