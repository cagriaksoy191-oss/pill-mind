import { POST } from "@/app/api/admin/review/route";
import { NextRequest } from "next/server";
import { getSession, verifyCSRF } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";

// Mock dependencies
jest.mock("@/lib/auth", () => ({
  getSession: jest.fn(),
  verifyCSRF: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    drugInteraction: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    clinicalReview: {
      create: jest.fn(),
    },
  },
}));

jest.mock("@/lib/audit", () => ({
  writeAuditLog: jest.fn(),
}));

describe("POST /api/admin/review", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockRequest = (body: Record<string, unknown> = {}) => {
    return {
      json: jest.fn().mockResolvedValue(body),
    } as unknown as NextRequest;
  };

  it("should return 403 if CSRF verification fails", async () => {
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
    expect(data.error).toBe("Klinik onay işlemi gerçekleştirmek için lütfen giriş yapın.");
  });

  it("should return 403 if user is not found", async () => {
    (verifyCSRF as jest.Mock).mockReturnValue(true);
    (getSession as jest.Mock).mockReturnValue({ userId: "user-1", email: "test@test.com" });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const req = createMockRequest();
    const res = await POST(req);

    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe("Klinik onay işlemi için yetkiniz bulunmamaktadır.");
  });

  it("should return 403 if user role is not ADMIN or CLINICAL_REVIEWER", async () => {
    (verifyCSRF as jest.Mock).mockReturnValue(true);
    (getSession as jest.Mock).mockReturnValue({ userId: "user-1", email: "test@test.com" });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ role: "USER" });

    const req = createMockRequest();
    const res = await POST(req);

    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe("Klinik onay işlemi için yetkiniz bulunmamaktadır.");
  });

  it("should return 400 if interactionId or status is missing", async () => {
    (verifyCSRF as jest.Mock).mockReturnValue(true);
    (getSession as jest.Mock).mockReturnValue({ userId: "admin-1", email: "admin@test.com" });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ role: "ADMIN" });

    const req = createMockRequest({ interactionId: "interaction-1" }); // missing status
    const res = await POST(req);

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("interactionId ve status parametreleri zorunludur.");
  });

  it("should return 400 if status is invalid", async () => {
    (verifyCSRF as jest.Mock).mockReturnValue(true);
    (getSession as jest.Mock).mockReturnValue({ userId: "admin-1", email: "admin@test.com" });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ role: "ADMIN" });

    const req = createMockRequest({ interactionId: "interaction-1", status: "INVALID_STATUS" });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Geçersiz durum değeri. (VERIFIED, PENDING veya DEPRECATED olmalıdır)");
  });

  it("should return 404 if interaction is not found", async () => {
    (verifyCSRF as jest.Mock).mockReturnValue(true);
    (getSession as jest.Mock).mockReturnValue({ userId: "admin-1", email: "admin@test.com" });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ role: "ADMIN" });
    (prisma.drugInteraction.findUnique as jest.Mock).mockResolvedValue(null);

    const req = createMockRequest({ interactionId: "interaction-1", status: "VERIFIED" });
    const res = await POST(req);

    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("Belirtilen ilaç etkileşimi bulunamadı.");
  });

  it("should successfully process review and return 200", async () => {
    (verifyCSRF as jest.Mock).mockReturnValue(true);
    (getSession as jest.Mock).mockReturnValue({ userId: "admin-1", email: "admin@test.com" });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ role: "ADMIN" });
    (prisma.drugInteraction.findUnique as jest.Mock).mockResolvedValue({ id: "interaction-1" });

    const mockUpdatedInteraction = { id: "interaction-1", verificationStatus: "VERIFIED" };
    (prisma.drugInteraction.update as jest.Mock).mockResolvedValue(mockUpdatedInteraction);

    const mockReview = { id: "review-1", decision: "VERIFIED" };
    (prisma.clinicalReview.create as jest.Mock).mockResolvedValue(mockReview);

    const req = createMockRequest({
      interactionId: "interaction-1",
      status: "VERIFIED",
      notes: "Looks good",
      evidenceSourceId: "source-1"
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.interaction).toEqual(mockUpdatedInteraction);
    expect(data.review).toEqual(mockReview);

    expect(prisma.drugInteraction.update).toHaveBeenCalledWith({
      where: { id: "interaction-1" },
      data: { verificationStatus: "VERIFIED" }
    });

    expect(prisma.clinicalReview.create).toHaveBeenCalledWith({
      data: {
        entityType: "DrugInteraction",
        entityId: "interaction-1",
        reviewerRole: "CLINICAL_REVIEWER",
        reviewerId: "admin-1",
        decision: "VERIFIED",
        notes: "Looks good",
        evidenceSourceId: "source-1",
      }
    });

    expect(writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      eventType: "CLINICAL_REVIEW_UPDATE",
      entityType: "DrugInteraction",
      entityId: "interaction-1",
      userId: "admin-1",
    }));
  });

  it("should return 500 if an internal error occurs", async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (verifyCSRF as jest.Mock).mockReturnValue(true);
    (getSession as jest.Mock).mockReturnValue({ userId: "admin-1", email: "admin@test.com" });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ role: "ADMIN" });
    (prisma.drugInteraction.findUnique as jest.Mock).mockRejectedValue(new Error("Database error"));

    const req = createMockRequest({ interactionId: "interaction-1", status: "VERIFIED" });
    const res = await POST(req);

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("Onay durumu güncellenirken sistemsel bir hata oluştu.");

    consoleSpy.mockRestore();
  });
});
