import { POST } from "@/app/api/auth/register/route";
import { prisma } from "@/lib/prisma";
import { verifyCSRF } from "@/lib/auth";
import * as Sentry from "@sentry/nextjs";

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

  it("should return 500 if an internal error occurs (e.g., db failure)", async () => {

    // Simulating database error during findUnique
    (prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error("Database connection failed"));

    const req = createMockRequest({ email: "test@example.com" });
    const res = await POST(req);

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("Kayıt sırasında sistemsel bir hata oluştu.");
    expect(Sentry.captureException).toHaveBeenCalled();

  });

  it("should return 500 if an internal error occurs during user creation", async () => {

    // Simulating no user exists
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    // Simulating database error during create
    (prisma.user.create as jest.Mock).mockRejectedValue(new Error("Database connection failed"));

    const req = createMockRequest({ email: "test@example.com" });
    const res = await POST(req);

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("Kayıt sırasında sistemsel bir hata oluştu.");
    expect(Sentry.captureException).toHaveBeenCalled();

  });

  it("should successfully register a new user", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.user.create as jest.Mock).mockResolvedValue({ id: "user-1", email: "test@example.com" });

    const req = createMockRequest({ email: "test@example.com" });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.user).toEqual({ id: "user-1", email: "test@example.com" });
  });

  it("should return 400 if user is already registered", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: "user-1", email: "test@example.com" });

    const req = createMockRequest({ email: "test@example.com" });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Bu e-posta adresiyle kayıtlı bir kullanıcı zaten mevcut.");
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
