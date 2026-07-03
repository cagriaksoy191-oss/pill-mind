import { POST } from "@/app/api/auth/login/route";
import { prisma } from "@/lib/prisma";

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

  it("should return 500 if an internal error occurs (e.g., db failure)", async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Simulating database error
    (prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error("Database connection failed"));

    const req = createMockRequest({ email: "test@example.com" });
    const res = await POST(req);

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("Giriş yapılırken sistemsel bir hata oluştu.");
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});
