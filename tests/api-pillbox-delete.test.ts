import { POST } from "@/app/api/pillbox/delete/route";
import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Mock dependencies
jest.mock("@/lib/auth", () => ({
  getSession: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    savedPillbox: {
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

describe("POST /api/pillbox/delete", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockRequest = (body: Record<string, unknown>) => {
    return {
      json: jest.fn().mockResolvedValue(body),
    } as unknown as NextRequest;
  };

  it("should return 401 if user is not authenticated", async () => {
    (getSession as jest.Mock).mockReturnValue(null);

    const req = createMockRequest({ id: "pillbox-1" });
    const res = await POST(req);

    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("Kutu silme yetkiniz bulunmuyor. Lütfen önce giriş yapın.");
  });

  it("should return 400 if pillbox ID is missing", async () => {
    (getSession as jest.Mock).mockReturnValue({ userId: "user-1", email: "test@test.com", expires: Date.now() + 10000 });

    const req = createMockRequest({});
    const res = await POST(req);

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Silinecek kutunun kimliği (ID) gereklidir.");
  });

  it("should return 404 if pillbox is not found", async () => {
    (getSession as jest.Mock).mockReturnValue({ userId: "user-1", email: "test@test.com", expires: Date.now() + 10000 });
    (prisma.savedPillbox.findUnique as jest.Mock).mockResolvedValue(null);

    const req = createMockRequest({ id: "pillbox-1" });
    const res = await POST(req);

    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("Silinecek kayıt bulunamadı veya silme yetkiniz yok.");
    expect(prisma.savedPillbox.findUnique).toHaveBeenCalledWith({ where: { id: "pillbox-1" } });
  });

  it("should return 404 if user tries to delete another user's pillbox", async () => {
    (getSession as jest.Mock).mockReturnValue({ userId: "user-1", email: "test@test.com", expires: Date.now() + 10000 });
    (prisma.savedPillbox.findUnique as jest.Mock).mockResolvedValue({ id: "pillbox-1", userId: "user-2" });

    const req = createMockRequest({ id: "pillbox-1" });
    const res = await POST(req);

    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("Silinecek kayıt bulunamadı veya silme yetkiniz yok.");
  });

  it("should return 200 and delete the pillbox successfully", async () => {
    (getSession as jest.Mock).mockReturnValue({ userId: "user-1", email: "test@test.com", expires: Date.now() + 10000 });
    (prisma.savedPillbox.findUnique as jest.Mock).mockResolvedValue({ id: "pillbox-1", userId: "user-1" });
    (prisma.savedPillbox.delete as jest.Mock).mockResolvedValue({});

    const req = createMockRequest({ id: "pillbox-1" });
    const res = await POST(req);

    expect(res.status).toBe(200); // Because we return NextResponse.json({ success: true }), the default status is 200
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(prisma.savedPillbox.delete).toHaveBeenCalledWith({ where: { id: "pillbox-1" } });
  });

  it("should return 500 if an internal error occurs", async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (getSession as jest.Mock).mockReturnValue({ userId: "user-1", email: "test@test.com", expires: Date.now() + 10000 });
    (prisma.savedPillbox.findUnique as jest.Mock).mockRejectedValue(new Error("Database error"));

    const req = createMockRequest({ id: "pillbox-1" });
    const res = await POST(req);

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("İlaç kutusu silinirken sistemsel bir hata oluştu.");
    consoleSpy.mockRestore();
  });
});
