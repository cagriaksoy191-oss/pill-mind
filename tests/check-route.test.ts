import { POST } from "../app/api/check/route";
import { verifyCSRF } from "@/lib/auth";
import { findInteractionsDB } from "@/lib/interactions";
import { redis } from "@/lib/redis";

jest.mock("@/lib/interactions", () => ({
  findInteractionsDB: jest.fn(),
  checkAccumulationDB: jest.fn().mockResolvedValue([]),
  resolveDrugsDB: jest.fn().mockResolvedValue([{}]),
}));

jest.mock("@/lib/auth", () => ({
  verifyCSRF: jest.fn().mockReturnValue(true),
}));

jest.mock("@/lib/redis", () => ({
  redis: {
    incr: jest.fn(),
    expire: jest.fn(),
  },
}));

jest.mock("@sentry/nextjs", () => ({
  captureException: jest.fn(),
}));

describe("POST /api/check", () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.clearAllMocks();
  });

  it("should return 403 when verifyCSRF returns false", async () => {
    (verifyCSRF as jest.Mock).mockReturnValueOnce(false);

    const req = new Request("http://localhost/api/check", {
      method: "POST",
      body: JSON.stringify({ drugIds: ["drug-1", "drug-2"] }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data).toEqual({
      error: "Güvenlik doğrulaması başarısız oldu (CSRF engellendi).",
    });
  });

  it("should return 400 if drugIds is missing", async () => {
    const req = new Request("http://localhost/api/check", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data).toEqual({ error: "En az 2 ilaç ID'si gereklidir." });
  });

  it("should return 400 if drugIds is not an array", async () => {
    const req = new Request("http://localhost/api/check", {
      method: "POST",
      body: JSON.stringify({ drugIds: "not-an-array" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data).toEqual({ error: "En az 2 ilaç ID'si gereklidir." });
  });

  it("should return 400 if drugIds has less than 2 items", async () => {
    const req = new Request("http://localhost/api/check", {
      method: "POST",
      body: JSON.stringify({ drugIds: ["drug-1"] }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data).toEqual({ error: "En az 2 ilaç ID'si gereklidir." });
  });

  it("should return 400 if drugIds has more than 50 items", async () => {
    const hugeArray = Array.from({ length: 51 }, (_, i) => `drug-${i}`);
    const req = new Request("http://localhost/api/check", {
      method: "POST",
      body: JSON.stringify({ drugIds: hugeArray }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data).toEqual({
      error: "Tek seferde en fazla 50 ilaç kontrol edilebilir.",
    });
  });

  it("should return 400 if drugIds contains invalid types", async () => {
    const req = new Request("http://localhost/api/check", {
      method: "POST",
      body: JSON.stringify({ drugIds: ["drug-1", 123] }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data).toEqual({ error: "Geçersiz ilaç ID formatı." });
  });

  it("should return 500 if JSON parsing fails", async () => {
    const req = new Request("http://localhost/api/check", {
      method: "POST",
      body: "invalid-json",
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data).toEqual({ error: "Kontrol sırasında bir hata oluştu." });
  });

  it("should return 500 if findInteractionsDB throws an error", async () => {
    (findInteractionsDB as jest.Mock).mockRejectedValueOnce(
      new Error("DB Error"),
    );

    const req = new Request("http://localhost/api/check", {
      method: "POST",
      body: JSON.stringify({ drugIds: ["drug-1", "drug-2"] }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(console.error).toHaveBeenCalled();
    expect(data).toEqual({ error: "Kontrol sırasında bir hata oluştu." });
  });

  it("should return 429 if rate limit is exceeded", async () => {
    (redis!.incr as jest.Mock).mockResolvedValue(31);

    const req = new Request("http://localhost/api/check", {
      method: "POST",
      body: JSON.stringify({ drugIds: ["drug-1", "drug-2"] }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(429);
    expect(data).toEqual({
      error: "Çok fazla istek gönderildi. Lütfen bir dakika bekleyin.",
    });
  });

  it("should return 200 and interactions if request is valid", async () => {
    (redis!.incr as jest.Mock).mockResolvedValue(1);

    const mockResults = [
      {
        interaction: { id: "test", severity: "high", summary: "Test summary" },
        drug1Name: "Drug A",
        drug2Name: "Drug B",
      },
    ];
    (findInteractionsDB as jest.Mock).mockResolvedValueOnce(mockResults);

    const req = new Request("http://localhost/api/check", {
      method: "POST",
      body: JSON.stringify({ drugIds: ["drug-1", "drug-2"] }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({
      interactions: mockResults,
      accumulationWarnings: [],
      foodInteractions: [],
      contraindications: [],
      polypharmacyReport: {
        score: 2,
        level: "low",
        message: "",
        beersWarnings: [],
      },
      checkedDrugs: ["drug-1", "drug-2"],
      totalFound: 1,
      disclaimer:
        "Bu sonuçlar sınırlı bir demo veri setine dayanabilir ve tıbbi tavsiye niteliği taşımaz.",
    });
  });

  it("should return 400 if body is null", async () => {
    const req = new Request("http://localhost/api/check", {
      method: "POST",
      body: JSON.stringify(null),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data).toEqual({ error: "En az 2 ilaç ID'si gereklidir." });
  });

  it("should return 400 if body is not an object", async () => {
    const req = new Request("http://localhost/api/check", {
      method: "POST",
      body: JSON.stringify(123),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data).toEqual({ error: "En az 2 ilaç ID'si gereklidir." });
  });

  it("should return 503 if redis throws an error", async () => {
    (redis!.incr as jest.Mock).mockRejectedValueOnce(new Error("Redis error"));

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const req = new Request("http://localhost/api/check", {
      method: "POST",
      body: JSON.stringify({ drugIds: ["drug-1", "drug-2"] }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(503);
    expect(data).toEqual({
      error: "Hizmet şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.",
      source: "error",
      reason: "service_unavailable",
    });

    warnSpy.mockRestore();
  });

  it("should skip rate limiting if redis is null", async () => {
    jest.resetModules();
    jest.doMock("@/lib/redis", () => ({ redis: null }));

    jest.doMock("@/lib/interactions", () => ({
      findInteractionsDB: jest.fn().mockResolvedValue([]),
      checkAccumulationDB: jest.fn().mockResolvedValue([]),
      resolveDrugsDB: jest.fn().mockResolvedValue([{}]),
    }));

    const { POST: POST_no_redis } = await import("../app/api/check/route");

    const req = new Request("http://localhost/api/check", {
      method: "POST",
      body: JSON.stringify({ drugIds: ["drug-1", "drug-2"] }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST_no_redis(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.checkedDrugs).toEqual(["drug-1", "drug-2"]);

    jest.resetModules();
  });

  it("should handle optional interactions modules functions properly", async () => {
    jest.resetModules();
    jest.doMock("@/lib/redis", () => ({ redis: { incr: jest.fn().mockResolvedValue(1), expire: jest.fn() } }));

    jest.doMock("@/lib/interactions", () => ({
      findInteractionsDB: jest.fn().mockResolvedValue([]),
      checkAccumulationDB: jest.fn().mockResolvedValue([]),
      resolveDrugsDB: jest.fn().mockResolvedValue([{}]),
      findFoodInteractionsDB: jest.fn().mockResolvedValue([{}]),
      findContraindicationsDB: jest.fn().mockResolvedValue([{}]),
      checkPolypharmacyAndBeers: jest.fn().mockReturnValue({
        score: 3,
        level: "high",
        message: "Warning",
        beersWarnings: [],
      })
    }));

    const { POST: POST_with_fns } = await import("../app/api/check/route");

    const req = new Request("http://localhost/api/check", {
      method: "POST",
      body: JSON.stringify({ drugIds: ["drug-1", "drug-2"], patientContext: { age: 70 } }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST_with_fns(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.foodInteractions.length).toBe(1);
    expect(data.contraindications.length).toBe(1);
    expect(data.polypharmacyReport.level).toBe("high");

    jest.resetModules();
  });

  it("should return 500 and catch error if resolveDrugsDB throws an error", async () => {
    jest.resetModules();
    jest.doMock("@/lib/redis", () => ({ redis: { incr: jest.fn().mockResolvedValue(1), expire: jest.fn() } }));

    jest.doMock("@/lib/interactions", () => ({
      findInteractionsDB: jest.fn(),
      checkAccumulationDB: jest.fn(),
      resolveDrugsDB: jest.fn().mockRejectedValue(new Error("Outer Catch Error")),
      findFoodInteractionsDB: jest.fn(),
      findContraindicationsDB: jest.fn(),
      checkPolypharmacyAndBeers: jest.fn(),
    }));

    const { POST: POST_with_error } = await import("../app/api/check/route");

    const req = new Request("http://localhost/api/check", {
      method: "POST",
      body: JSON.stringify({ drugIds: ["drug-1", "drug-2"] }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST_with_error(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(console.error).toHaveBeenCalled();
    expect(data).toEqual({ error: "Kontrol sırasında bir hata oluştu." });

    jest.resetModules();
  });
});
