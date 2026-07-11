import { POST } from "../app/api/explain/route";
import { redis } from "@/lib/redis";
import {
  shouldUseFallback,
  getInteractionContext,
  callGeminiForInteraction,
  getCoverageContext,
  callGeminiForCoverage,
} from "@/lib/gemini";

jest.mock("@/lib/redis", () => ({
  redis: {
    get: jest.fn(),
    set: jest.fn(),
    incr: jest.fn(),
    expire: jest.fn(),
  },
}));

jest.mock("@/lib/gemini", () => ({
  shouldUseFallback: jest.fn(),
  getInteractionContext: jest.fn(),
  callGeminiForInteraction: jest.fn(),
  callGeminiForCoverage: jest.fn(),
    buildInteractionStreamPrompt: jest.fn().mockReturnValue("mock prompt"),
    buildCoverageStreamPrompt: jest.fn().mockReturnValue("mock prompt"),
    streamGeminiContent: jest.fn(),
    runReviewerAgent: jest.fn().mockResolvedValue(true),
  getCoverageContext: jest.fn(),
}));

describe("POST /api/explain", () => {
  let consoleWarnSpy: jest.SpyInstance;
  let consoleInfoSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    consoleInfoSpy = jest.spyOn(console, "info").mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    // Default rate limit bypass
    (redis!.incr as jest.Mock).mockResolvedValue(1);
    (redis!.expire as jest.Mock).mockResolvedValue(true);

    // Default gemini mocks
    (shouldUseFallback as jest.Mock).mockReturnValue(false);
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleInfoSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });


  it("should return 400 when body is missing/invalid JSON", async () => {
    const req = new Request("http://localhost/api/explain", {
      method: "POST",
      body: "invalid-json", // Invalid JSON string
      headers: { "Content-Type": "application/json" }
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data).toEqual({ error: "Geçersiz JSON gövdesi." });
  });

  it("should return 400 when body is not an object", async () => {
    const req = new Request("http://localhost/api/explain", {
      method: "POST",
      body: JSON.stringify("a string instead of object"),
      headers: { "Content-Type": "application/json" }
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data).toEqual({ error: "Geçersiz istek yapısı." });
  });

  it("should gracefully fallback to live AI when Redis cache read fails", async () => {
    const fakeError = new Error("Redis read timeout");
    (redis!.get as jest.Mock).mockRejectedValueOnce(fakeError);
    (redis!.set as jest.Mock).mockResolvedValueOnce("OK");

    (getInteractionContext as jest.Mock).mockReturnValue({
      interaction: { id: "test", severity: "high" },
      drug1Name: "DrugA",
      drug2Name: "DrugB",
      drug1Ingredient: "IngA",
      drug2Ingredient: "IngB"
    });

    (callGeminiForInteraction as jest.Mock).mockResolvedValue({
      explanation: "Live AI explanation generated after cache fail.",
      generatedAt: "2024-05-20T12:00:00.000Z"
    });

    const req = new Request("http://localhost/api/explain", {
      method: "POST",
      body: JSON.stringify({ interactionId: "test-interaction" }),
      headers: {
        "Content-Type": "application/json",
      }
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({
      explanation: "Live AI explanation generated after cache fail.",
      source: "gemini_live",
      generatedAt: "2024-05-20T12:00:00.000Z",
      disclaimer: "Bu açıklama bilgilendirme amaçlıdır ve tıbbi tavsiye niteliği taşımaz.",
    });

    // Check if the fallback warning was logged
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "[Redis] Cache read error, continuing to live AI:",
      fakeError
    );

    // Verify it attempted to write the result back to cache
    expect(redis!.set).toHaveBeenCalledWith(
      "explanation:v3:interaction:test-interaction:data:2026.06.26:schema:3.0.0:locale:tr",
      {
        explanation: "Live AI explanation generated after cache fail.",
        generatedAt: "2024-05-20T12:00:00.000Z",
        belirsizlikNotu: undefined,
        hastaDiliRiskEtiketi: undefined,
        hekimModuKisaMekanizma: undefined,
        kaynakOzeti: undefined,
        sourceIds: undefined,
        yasakliEylemKontrolu: undefined
      },
      { ex: 604800 }
    );
  });

  it("should return 503 and handle Gemini AI failure gracefully", async () => {
    (getInteractionContext as jest.Mock).mockResolvedValueOnce({
      interaction: { id: "test", severity: "medium" },
      drug1Name: "DrugA",
      drug2Name: "DrugB",
      drug1Ingredient: "IngA",
      drug2Ingredient: "IngB"
    });

    const fakeError = new Error("timeout processing request");
    (callGeminiForInteraction as jest.Mock).mockRejectedValueOnce(fakeError);

    const req = new Request("http://localhost/api/explain", {
      method: "POST",
      body: JSON.stringify({ interactionId: "test-interaction" }),
      headers: {
        "Content-Type": "application/json",
      }
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(503);
    expect(data).toEqual({
      error: "Canlı AI açıklaması şu anda üretilemedi.",
      source: "error",
      reason: "timeout",
      disclaimer: "Bu açıklama bilgilendirme amaçlıdır ve tıbbi tavsiye niteliği taşımaz.",
    });
  });

  it("should return 503 and block explanation (fail-closed safety_block) when high severity interaction fails", async () => {
    (getInteractionContext as jest.Mock).mockResolvedValueOnce({
      interaction: { id: "test", severity: "high" },
      drug1Name: "DrugA",
      drug2Name: "DrugB",
      drug1Ingredient: "IngA",
      drug2Ingredient: "IngB"
    });

    const fakeError = new Error("timeout processing request");
    (callGeminiForInteraction as jest.Mock).mockRejectedValueOnce(fakeError);

    const req = new Request("http://localhost/api/explain", {
      method: "POST",
      body: JSON.stringify({ interactionId: "test-interaction" }),
      headers: {
        "Content-Type": "application/json",
      }
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(503);
    expect(data).toEqual({
      error: "Güvenlik nedeniyle canlı AI açıklaması engellendi.",
      source: "error",
      reason: "safety_block",
      disclaimer: "Bu açıklama bilgilendirme amaçlıdır ve tıbbi tavsiye niteliği taşımaz.",
    });
  });

  it("should return 429 when rate limit is exceeded", async () => {
    (redis!.incr as jest.Mock).mockResolvedValueOnce(16);

    const req = new Request("http://localhost/api/explain", {
      method: "POST",
      body: JSON.stringify({ interactionId: "test-interaction" }),
      headers: {
        "Content-Type": "application/json",
        "x-vercel-forwarded-for": "192.168.1.1"
      }
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(429);
    expect(data).toEqual({
      error: "Çok fazla istek gönderildi. Lütfen bir dakika bekleyin.",
      source: "error",
      reason: "rate_limited"
    });

    expect(consoleWarnSpy).toHaveBeenCalledWith("[Security Alert] Rate limit exceeded for IP: 192.168.1.1");
  });

  it("should gracefully fallback to live AI when Redis cache read fails for coverage (drugIds)", async () => {
    const fakeError = new Error("Redis read timeout for coverage");
    (redis!.get as jest.Mock).mockRejectedValueOnce(fakeError);
    (redis!.set as jest.Mock).mockResolvedValueOnce("OK");

    (getCoverageContext as jest.Mock).mockReturnValue({
      drugs: [{ id: "drug1", name: "Drug1" }, { id: "drug2", name: "Drug2" }],
      combinations: []
    });

    (callGeminiForCoverage as jest.Mock).mockResolvedValue({
      explanation: "Live AI coverage explanation generated after cache fail.",
      generatedAt: "2024-05-20T12:00:00.000Z"
    });

    const req = new Request("http://localhost/api/explain", {
      method: "POST",
      body: JSON.stringify({ drugIds: ["drug1", "drug2"] }),
      headers: {
        "Content-Type": "application/json",
      }
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({
      explanation: "Live AI coverage explanation generated after cache fail.",
      source: "gemini_live",
      generatedAt: "2024-05-20T12:00:00.000Z",
      disclaimer: "Bu açıklama bilgilendirme amaçlıdır ve tıbbi tavsiye niteliği taşımaz.",
    });

    // Check if the fallback warning was logged
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "[Redis] Cache read error, continuing to live AI:",
      fakeError
    );

    // Verify it attempted to write the result back to cache
    // The cacheKey for drugIds uses sorted ids "drug1:drug2"
    expect(redis!.set).toHaveBeenCalledWith(
      "explanation:v3:coverage:drug1:drug2:data:2026.06.26:schema:3.0.0:locale:tr",
      {
        explanation: "Live AI coverage explanation generated after cache fail.",
        generatedAt: "2024-05-20T12:00:00.000Z",
        belirsizlikNotu: undefined,
        hastaDiliRiskEtiketi: undefined,
        hekimModuKisaMekanizma: undefined,
        kaynakOzeti: undefined,
        sourceIds: undefined,
        yasakliEylemKontrolu: undefined
      },
      { ex: 604800 }
    );
  });

  it("should bypass rate limiter and continue when Redis throws an error", async () => {
    const fakeRedisError = new Error("Redis connection failed");
    (redis!.incr as jest.Mock).mockRejectedValueOnce(fakeRedisError);

    (getInteractionContext as jest.Mock).mockReturnValue({
      interaction: { id: "test", severity: "high" },
      drug1Name: "DrugA",
      drug2Name: "DrugB",
      drug1Ingredient: "IngA",
      drug2Ingredient: "IngB"
    });

    (callGeminiForInteraction as jest.Mock).mockResolvedValue({
      explanation: "Live AI explanation generated after rate limiter fail.",
      generatedAt: "2024-05-20T12:00:00.000Z"
    });

    const req = new Request("http://localhost/api/explain", {
      method: "POST",
      body: JSON.stringify({ interactionId: "test-interaction-ratelimit-bypass" }),
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "192.168.1.2"
      }
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(503);
    expect(data.error).toBe("Hizmet şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.");
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "[Redis Rate Limiter] Blocked request due to Redis error:",
      fakeRedisError
    );
  });

  it("should return 400 when neither interactionId nor drugIds are provided", async () => {
    const req = new Request("http://localhost/api/explain", {
      method: "POST",
      body: JSON.stringify({ otherField: "test" }),
      headers: { "Content-Type": "application/json" }
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data).toEqual({ error: "interactionId veya en az 2 drugId alanı gereklidir." });
  });

  it("should return 400 when interactionId is invalid (stream=true)", async () => {
    const req = new Request("http://localhost/api/explain", {
      method: "POST",
      body: JSON.stringify({ interactionId: "", stream: true }),
      headers: { "Content-Type": "application/json" }
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data).toEqual({ error: "Geçersiz veya aşırı uzun interactionId." });
  });

  it("should return 400 when drugIds is invalid array (stream=true)", async () => {
    const req = new Request("http://localhost/api/explain", {
      method: "POST",
      body: JSON.stringify({ drugIds: ["only-one"], stream: true }),
      headers: { "Content-Type": "application/json" }
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data).toEqual({ error: "drugIds 2 ila 10 adet geçerli kimlik içeren bir dizi olmalıdır." });
  });



  it("should handle valid interactionId with stream=true", async () => {
    (getInteractionContext as jest.Mock).mockResolvedValue({
      interaction: { id: "test", severity: "high" },
      drug1Name: "DrugA",
      drug2Name: "DrugB",
      drug1Ingredient: "IngA",
      drug2Ingredient: "IngB"
    });

    (redis!.get as jest.Mock).mockResolvedValue(null);

    const originalGemini = jest.requireMock('@/lib/gemini');
    if (originalGemini && originalGemini.buildInteractionStreamPrompt) {
        originalGemini.buildInteractionStreamPrompt.mockReturnValue("mock prompt");
    }

    // We also need to mock streamGeminiContent properly as an async generator
    if (originalGemini && originalGemini.streamGeminiContent) {
        async function* mockStream() { yield "test"; }
        originalGemini.streamGeminiContent.mockReturnValue(mockStream());
    }
    if (originalGemini && originalGemini.runReviewerAgent) {
        originalGemini.runReviewerAgent.mockResolvedValue(true);
    }

    const req = new Request("http://localhost/api/explain", {
      method: "POST",
      body: JSON.stringify({ interactionId: "valid-id", stream: true }),
      headers: { "Content-Type": "application/json" }
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");
  });

  it("should handle valid drugIds with stream=true", async () => {
    (getCoverageContext as jest.Mock).mockReturnValue({
      drugs: [{ id: "drug1", name: "Drug1" }, { id: "drug2", name: "Drug2" }],
      combinations: []
    });

    (redis!.get as jest.Mock).mockResolvedValue(null);

    const originalGemini = jest.requireMock('@/lib/gemini');
    if (originalGemini && originalGemini.buildCoverageStreamPrompt) {
        originalGemini.buildCoverageStreamPrompt.mockReturnValue("mock prompt");
    }
    if (originalGemini && originalGemini.streamGeminiContent) {
        async function* mockStream() { yield "test"; }
        originalGemini.streamGeminiContent.mockReturnValue(mockStream());
    }
    if (originalGemini && originalGemini.runReviewerAgent) {
        originalGemini.runReviewerAgent.mockResolvedValue(true);
    }

    const req = new Request("http://localhost/api/explain", {
      method: "POST",
      body: JSON.stringify({ drugIds: ["drug1", "drug2"], stream: true }),
      headers: { "Content-Type": "application/json" }
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");
  });

});
