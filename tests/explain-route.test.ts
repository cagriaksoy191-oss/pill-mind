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
      "explanation:v1:interaction:test-interaction",
      {
        explanation: "Live AI explanation generated after cache fail.",
        generatedAt: "2024-05-20T12:00:00.000Z"
      },
      { ex: 604800 }
    );
  });

  it("should return 503 and handle Gemini AI failure gracefully", async () => {
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
      error: "Canlı AI açıklaması şu anda üretilemedi.",
      source: "error",
      reason: "timeout",
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
      "explanation:v1:coverage:drug1:drug2",
      {
        explanation: "Live AI coverage explanation generated after cache fail.",
        generatedAt: "2024-05-20T12:00:00.000Z"
      },
      { ex: 604800 }
    );
  });
});
