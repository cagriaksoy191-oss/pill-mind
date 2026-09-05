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
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.clearAllMocks();
  });

  describe("Security and Authentication", () => {
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
  });

  describe("Request Validation", () => {
    it.each([
      {
        description: "body is empty object",
        body: {},
        expectedStatus: 400,
        expectedError: "En az 2 ilaç ID'si gereklidir.",
      },
      {
        description: "drugIds is not an array",
        body: { drugIds: "not-an-array" },
        expectedStatus: 400,
        expectedError: "En az 2 ilaç ID'si gereklidir.",
      },
      {
        description: "drugIds has less than 2 items",
        body: { drugIds: ["drug-1"] },
        expectedStatus: 400,
        expectedError: "En az 2 ilaç ID'si gereklidir.",
      },
      {
        description: "drugIds has more than 50 items",
        body: { drugIds: Array.from({ length: 51 }, (_, i) => `drug-${i}`) },
        expectedStatus: 400,
        expectedError: "Tek seferde en fazla 50 ilaç kontrol edilebilir.",
      },
      {
        description: "drugIds contains non-string items",
        body: { drugIds: ["drug-1", 123] },
        expectedStatus: 400,
        expectedError: "Geçersiz ilaç ID formatı.",
      },
      {
        description: "body is null",
        body: null,
        expectedStatus: 400,
        expectedError: "En az 2 ilaç ID'si gereklidir.",
      },
      {
        description: "body is primitive number",
        body: 123,
        expectedStatus: 400,
        expectedError: "En az 2 ilaç ID'si gereklidir.",
      },
    ])(
      "should return $expectedStatus when $description",
      async ({ body, expectedStatus, expectedError }) => {
        const req = new Request("http://localhost/api/check", {
          method: "POST",
          body: JSON.stringify(body),
          headers: { "Content-Type": "application/json" },
        });

        const res = await POST(req);
        const data = await res.json();

        expect(res.status).toBe(expectedStatus);
        expect(data).toEqual({ error: expectedError });
      },
    );

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
  });

  describe("Rate Limiting", () => {
    it("should return 429 if rate limit is exceeded (>30 requests)", async () => {
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

    it("should return 503 if redis operations throw an error", async () => {
      (redis!.incr as jest.Mock).mockRejectedValueOnce(
        new Error("Redis connection failure"),
      );
      const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

      const req = new Request("http://localhost/api/check", {
        method: "POST",
        body: JSON.stringify({ drugIds: ["drug-1", "drug-2"] }),
        headers: { "Content-Type": "application/json" },
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(503);
      expect(data).toEqual({
        error:
          "Hizmet şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.",
        source: "error",
        reason: "service_unavailable",
      });

      warnSpy.mockRestore();
    });

    it("should bypass rate limiting if redis is null", async () => {
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
  });

  describe("Core Business Logic & Service Interactions", () => {
    it("should return 200 and formatted interactions for valid requests", async () => {
      (redis!.incr as jest.Mock).mockResolvedValue(1);

      const mockResults = [
        {
          interaction: {
            id: "test",
            severity: "high",
            summary: "Test summary",
          },
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

    it("should execute optional interaction functions when available", async () => {
      jest.resetModules();
      jest.doMock("@/lib/redis", () => ({
        redis: { incr: jest.fn().mockResolvedValue(1), expire: jest.fn() },
      }));

      jest.doMock("@/lib/interactions", () => ({
        findInteractionsDB: jest.fn().mockResolvedValue([]),
        checkAccumulationDB: jest.fn().mockResolvedValue([]),
        resolveDrugsDB: jest.fn().mockResolvedValue([{}]),
        findFoodInteractionsDB: jest.fn().mockResolvedValue([{ id: "food1" }]),
        findContraindicationsDB: jest
          .fn()
          .mockResolvedValue([{ id: "contra1" }]),
        checkPolypharmacyAndBeers: jest.fn().mockReturnValue({
          score: 3,
          level: "high",
          message: "High risk polypharmacy",
          beersWarnings: ["Beers criteria alert"],
        }),
      }));

      const { POST: POST_with_fns } = await import("../app/api/check/route");

      const req = new Request("http://localhost/api/check", {
        method: "POST",
        body: JSON.stringify({
          drugIds: ["drug-1", "drug-2"],
          patientContext: { age: 70 },
        }),
        headers: { "Content-Type": "application/json" },
      });

      const res = await POST_with_fns(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.foodInteractions).toHaveLength(1);
      expect(data.contraindications).toHaveLength(1);
      expect(data.polypharmacyReport.level).toBe("high");

      jest.resetModules();
    });

    it("should return 500 when findInteractionsDB throws an unexpected error", async () => {
      (findInteractionsDB as jest.Mock).mockRejectedValueOnce(
        new Error("Database connection error"),
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

    it("should return 500 when resolveDrugsDB throws an error in top-level try block", async () => {
      jest.resetModules();
      jest.doMock("@/lib/redis", () => ({
        redis: { incr: jest.fn().mockResolvedValue(1), expire: jest.fn() },
      }));

      jest.doMock("@/lib/interactions", () => ({
        findInteractionsDB: jest.fn(),
        checkAccumulationDB: jest.fn(),
        resolveDrugsDB: jest
          .fn()
          .mockRejectedValue(new Error("Database error on resolveDrugs")),
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
});
