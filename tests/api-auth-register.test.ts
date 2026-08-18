import { POST } from "@/app/api/auth/register/route";
import { prisma } from "@/lib/prisma";
import { verifyCSRF } from "@/lib/auth";
import * as Sentry from "@sentry/nextjs";
import { writeAuditLog } from "@/lib/audit";

import { redis } from "@/lib/redis";

jest.mock("@/lib/redis", () => ({
  redis: {
    incr: jest.fn(),
    expire: jest.fn(),
  },
}));

jest.mock("@/lib/audit", () => ({
  writeAuditLog: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/lib/ip", () => ({
  getClientIp: jest.fn().mockReturnValue("127.0.0.1"),
}));

jest.mock("@sentry/nextjs", () => ({
  captureException: jest.fn(),
}));

jest.mock("@/lib/auth", () => ({
  verifyCSRF: jest.fn().mockReturnValue(true),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
    },
  },
}));

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockRequest = (body: Record<string, unknown>) => {
    return {
      json: jest.fn().mockResolvedValue(body),
    } as unknown as Request;
  };

  it("should return 429 if rate limit is exceeded", async () => {
    (redis.incr as jest.Mock).mockResolvedValueOnce(6); // Exceed limit

    const req = createMockRequest({ email: "test@example.com" });
    const res = await POST(req);

    expect(res.status).toBe(429);
    const data = await res.json();
    expect(data.error).toBe("Çok fazla kayıt denemesi yapıldı. Lütfen daha sonra tekrar deneyin.");
    expect(writeAuditLog).toHaveBeenCalledWith({
      eventType: "RATE_LIMIT_EXCEEDED",
      entityType: "AUTH_REGISTER",
      details: "Rate limit exceeded for register endpoint, IP: 127.0.0.1",
    });
  });

  it("should return 503 if redis.incr throws an error", async () => {
    const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

    (redis.incr as jest.Mock).mockRejectedValueOnce(new Error("Redis connection failed"));

    const req = createMockRequest({ email: "test@example.com" });
    const res = await POST(req);

    expect(res.status).toBe(503);
    const data = await res.json();
    expect(data.error).toBe("Hizmet şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.");

    consoleWarnSpy.mockRestore();
  });

  it("should return 500 if an internal error occurs (e.g., db failure)", async () => {
    // Simulating database error during upsert
    (prisma.user.upsert as jest.Mock).mockRejectedValue(new Error("Database connection failed"));

    const req = createMockRequest({ email: "test@example.com" });
    const res = await POST(req);

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("Kayıt sırasında sistemsel bir hata oluştu.");
    expect(Sentry.captureException).toHaveBeenCalled();
  });

  it("should successfully register a new user using upsert", async () => {
    (prisma.user.upsert as jest.Mock).mockResolvedValue({ id: "user-1", email: "test@example.com" });

    const req = createMockRequest({ email: "test@example.com" });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.user).toEqual({ id: "user-1", email: "test@example.com" });
    expect(prisma.user.upsert).toHaveBeenCalledWith({
      where: { email: "test@example.com" },
      update: {},
      create: { email: "test@example.com" },
    });
  });

  it("should return 200 OK and user data if user is already registered", async () => {
    (prisma.user.upsert as jest.Mock).mockResolvedValue({ id: "user-1", email: "test@example.com" });

    const req = createMockRequest({ email: "TEST@example.com" });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.user).toEqual({ id: "user-1", email: "test@example.com" });
    expect(prisma.user.upsert).toHaveBeenCalledWith({
      where: { email: "test@example.com" },
      update: {},
      create: { email: "test@example.com" },
    });
  });

  it("should return 400 if email is invalid", async () => {
    const req = createMockRequest({ email: "invalid-email" });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Geçersiz bir e-posta adresi girdiniz.");
  });

  it("should return 400 if email is missing", async () => {
    const req = createMockRequest({});
    const res = await POST(req);

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Geçersiz bir e-posta adresi girdiniz.");
  });

  it("should return 403 if CSRF verification fails", async () => {
    (verifyCSRF as jest.Mock).mockReturnValue(false);

    const req = createMockRequest({ email: "test@example.com" });
    const res = await POST(req);

    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe("Güvenlik doğrulaması başarısız oldu (CSRF engellendi).");
  });
});
