process.env.JWT_SECRET = 'test-secret-key-that-is-at-least-32-chars';
import crypto from "crypto";
import { POST } from "@/app/api/auth/login/route";
import { writeAuditLog } from "@/lib/audit";
import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/lib/prisma";


const mockExec = jest.fn();

jest.mock("@/lib/redis", () => ({
  redis: {
    pipeline: jest.fn(() => ({
      incr: jest.fn(),
      expire: jest.fn(),
      exec: (...args: unknown[]) => mockExec(...args),
    })),
    incr: jest.fn(),
    expire: jest.fn(),
    get: jest.fn(),
  },
}));

jest.mock("@/lib/audit", () => ({
  writeAuditLog: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/lib/ip", () => ({
  getClientIp: jest.fn().mockReturnValue("127.0.0.1"),
}));

jest.mock("@/lib/auth", () => ({
  ...jest.requireActual("@/lib/auth"),
  verifyCSRF: jest.fn().mockReturnValue(true),
  encryptSession: jest.fn().mockReturnValue("mock-session-token"),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExec.mockResolvedValue([1, 1]);
  });

  const createMockRequest = (body: Record<string, unknown>) => {
    return {
      json: jest.fn().mockResolvedValue(body),
    } as unknown as Request;
  };


  it("should return 429 if rate limit is exceeded", async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    mockExec.mockResolvedValueOnce([6, 1]); // Exceed limit

    const req = createMockRequest({ email: "test@example.com" });
    const res = await POST(req);

    expect(res.status).toBe(429);
    const data = await res.json();
    expect(data.error).toBe("Çok fazla giriş denemesi yapıldı. Lütfen daha sonra tekrar deneyin.");
    expect(writeAuditLog).toHaveBeenCalledWith({
      eventType: "RATE_LIMIT_EXCEEDED",
      entityType: "AUTH_LOGIN",
      details: "Rate limit exceeded for login endpoint, IP: 127.0.0.1",
    });
    expect(consoleErrorSpy).toHaveBeenCalledWith("[Security Alert] Rate limit exceeded for login endpoint");
    expect(consoleErrorSpy.mock.calls[0][0]).not.toContain("127.0.0.1");

    consoleErrorSpy.mockRestore();
  });

  it("should return 503 if redis.incr throws an error", async () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    mockExec.mockRejectedValueOnce(new Error("Redis connection failed"));

    const req = createMockRequest({ email: "test@example.com" });
    const res = await POST(req);

    expect(res.status).toBe(503);
    const data = await res.json();
    expect(data.error).toBe("Hizmet şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.");

    consoleWarnSpy.mockRestore();
  });

  it("should require OTP if only email is provided", async () => {
    const req = createMockRequest({ email: "test@example.com" });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.isOtpRequired).toBe(true);
    expect(data.otpToken).toBeDefined();
  });

  it("should return 400 if OTP token is invalid or expired", async () => {
    const req = createMockRequest({
      email: "test@example.com",
      otp: "123456",
      otpToken: "1000:invalidhash"
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Girdiğiniz doğrulama kodunun süresi dolmuş.");
  });

  it("should return 400 if OTP token expiry format is non-numeric or invalid", async () => {
    const req = createMockRequest({
      email: "test@example.com",
      otp: "123456",
      otpToken: "1000abc:invalidhash"
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Geçersiz veya bozuk OTP doğrulama bileti.");
  });

  it("should return 400 if OTP is incorrect", async () => {
    const expires = Date.now() + 300000;
    const hash = crypto.createHmac('sha256', process.env.JWT_SECRET!).update(`test@example.com:123456:${expires}`).digest('hex');
    const otpToken = `${expires}:${hash}`;

    const req = createMockRequest({
      email: "test@example.com",
      otp: "654321", // Wrong OTP
      otpToken
    });
    const res = await POST(req);

    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("Geçersiz e-posta adresi veya doğrulama kodu.");
  });

  it("should successfully log in if OTP is correct", async () => {
    const expires = Date.now() + 300000;
    const email = "test@example.com";
    const otp = "123456";
    const hash = crypto.createHmac('sha256', process.env.JWT_SECRET!).update(`${email}:${otp}:${expires}`).digest('hex');
    const otpToken = `${expires}:${hash}`;

    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: "user-1",
      email: "test@example.com"
    });

    const req = createMockRequest({ email, otp, otpToken });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.user.id).toBe("user-1");
  });

  it("should return 500 if an internal error occurs (e.g., db failure)", async () => {


    // Simulating database error
    const sentrySpy = jest.spyOn(Sentry, "captureException").mockImplementation(() => "mock-id");
    (prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error("Database connection failed"));

    const expires = Date.now() + 300000;
    const email = "test@example.com";
    const otp = "123456";
    const hash = crypto.createHmac('sha256', process.env.JWT_SECRET!).update(`${email}:${otp}:${expires}`).digest('hex');
    const otpToken = `${expires}:${hash}`;

    const req = createMockRequest({ email, otp, otpToken });
    const res = await POST(req);

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("Giriş yapılırken sistemsel bir hata oluştu.");
    expect(sentrySpy).toHaveBeenCalled();

    sentrySpy.mockRestore();
    jest.restoreAllMocks();
    });

  it("should return generic error if user does not exist", async () => {
    const expires = Date.now() + 300000;
    const email = "notfound@example.com";
    const otp = "123456";
    const hash = crypto.createHmac('sha256', process.env.JWT_SECRET!).update(`${email}:${otp}:${expires}`).digest('hex');
    const otpToken = `${expires}:${hash}`;

    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const req = createMockRequest({ email, otp, otpToken });
    const res = await POST(req);

    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("Geçersiz e-posta adresi veya doğrulama kodu.");
  });
});
