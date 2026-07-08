import { POST } from "@/app/api/pillbox/share/route";
import { NextRequest } from "next/server";
import { getSession, verifyCSRF } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import crypto from "crypto";

// Mock dependencies
jest.mock("@/lib/auth", () => ({
  getSession: jest.fn(),
  verifyCSRF: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    pillboxShare: {
      create: jest.fn(),
    },
  },
}));

jest.mock("@/lib/audit", () => ({
  writeAuditLog: jest.fn(),
}));

jest.mock("crypto", () => ({
  randomBytes: jest.fn(),
}));

describe("POST /api/pillbox/share", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockRequest = (body?: Record<string, unknown>) => {
    return {
      json: jest.fn().mockResolvedValue(body || {}),
    } as unknown as NextRequest;
  };

  it("should return 403 if CSRF check fails", async () => {
    (verifyCSRF as jest.Mock).mockReturnValue(false);

    const req = createMockRequest();
    const res = await POST(req);

    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe("Güvenlik doğrulaması başarısız oldu (CSRF engellendi).");
  });

  it("should return 401 if user is not authenticated", async () => {
    (verifyCSRF as jest.Mock).mockReturnValue(true);
    (getSession as jest.Mock).mockReturnValue(null);

    const req = createMockRequest();
    const res = await POST(req);

    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("Rapor paylaşmak için lütfen önce giriş yapın.");
  });

  it("should return 400 if drugIds is missing", async () => {
    (verifyCSRF as jest.Mock).mockReturnValue(true);
    (getSession as jest.Mock).mockReturnValue({ userId: "user-1", email: "test@test.com" });

    const req = createMockRequest({});
    const res = await POST(req);

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Paylaşmak için en az 1 ilaç seçilmelidir.");
  });

  it("should return 400 if drugIds is not an array", async () => {
    (verifyCSRF as jest.Mock).mockReturnValue(true);
    (getSession as jest.Mock).mockReturnValue({ userId: "user-1", email: "test@test.com" });

    const req = createMockRequest({ drugIds: "not-an-array" });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Paylaşmak için en az 1 ilaç seçilmelidir.");
  });

  it("should return 400 if drugIds is empty", async () => {
    (verifyCSRF as jest.Mock).mockReturnValue(true);
    (getSession as jest.Mock).mockReturnValue({ userId: "user-1", email: "test@test.com" });

    const req = createMockRequest({ drugIds: [] });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Paylaşmak için en az 1 ilaç seçilmelidir.");
  });

  it("should return 200 and create a share link successfully", async () => {
    (verifyCSRF as jest.Mock).mockReturnValue(true);
    (getSession as jest.Mock).mockReturnValue({ userId: "user-1", email: "test@test.com" });

    const mockToken = "mocked-token-hash";
    (crypto.randomBytes as jest.Mock).mockReturnValue({
      toString: () => mockToken,
    });

    const mockCreatedShare = {
      id: "share-1",
      token: mockToken,
      drugIds: ["drug-1", "drug-2"],
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };
    (prisma.pillboxShare.create as jest.Mock).mockResolvedValue(mockCreatedShare);

    const req = createMockRequest({ drugIds: ["drug-1", "drug-2"], summary: { note: "test" } });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.token).toBe(mockToken);
    expect(data.shareUrl).toBe(`/share/${mockToken}`);
    expect(data.expiresAt).toBeDefined();

    expect(prisma.pillboxShare.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          token: mockToken,
          drugIds: ["drug-1", "drug-2"],
          summary: JSON.stringify({ note: "test" }),
        })
      })
    );

    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "SHARE_CREATED",
        entityType: "PillboxShare",
        entityId: "share-1",
        userId: "user-1",
      })
    );
  });

  it("should return 500 if an internal error occurs", async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (verifyCSRF as jest.Mock).mockReturnValue(true);
    (getSession as jest.Mock).mockReturnValue({ userId: "user-1", email: "test@test.com" });

    (prisma.pillboxShare.create as jest.Mock).mockRejectedValue(new Error("Database error"));

    const req = createMockRequest({ drugIds: ["drug-1"] });
    const res = await POST(req);

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("Paylaşım bağlantısı oluşturulurken sistemsel bir hata oluştu.");

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
