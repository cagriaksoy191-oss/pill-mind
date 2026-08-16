process.env.JWT_SECRET = 'test-secret';
import crypto from "crypto";
import { POST } from "@/app/api/auth/login/route";
import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";


jest.mock("@/lib/redis", () => ({
  redis: {
    incr: jest.fn(),
    expire: jest.fn(),
  },
}));

jest.mock("@/lib/ip", () => ({
  getClientIp: jest.fn().mockReturnValue("127.0.0.1"),
}));

jest.mock("@/lib/auth", () => ({
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
  });

  const createMockRequest = (body: Record<string, unknown>) => {
    return {
      json: jest.fn().mockResolvedValue(body),
    } as unknown as Request;
  };


  it("should return 429 if rate limit is exceeded", async () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    (redis.incr as jest.Mock).mockResolvedValueOnce(6); // Exceed limit

    const req = createMockRequest({ email: "test@example.com" });
    const res = await POST(req);

    expect(res.status).toBe(429);
    const data = await res.json();
    expect(data.error).toBe("Çok fazla giriş denemesi yapıldı. Lütfen daha sonra tekrar deneyin.");

    consoleWarnSpy.mockRestore();
  });

  it("should return 503 if redis.incr throws an error", async () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    (redis.incr as jest.Mock).mockRejectedValueOnce(new Error("Redis connection failed"));

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
