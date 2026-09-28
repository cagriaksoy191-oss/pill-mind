import { GET } from "@/app/api/pillbox/list/route";
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
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

describe("GET /api/pillbox/list", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockRequest = (url = "http://localhost:3000/api/pillbox/list") => {
    return {
      url
    } as unknown as NextRequest;
  };

  it("should return 401 if user is not authenticated", async () => {
    (getSession as jest.Mock).mockResolvedValue(null);

    const req = createMockRequest();
    const res = await GET(req);

    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("Kaydedilmiş kutularınızı görmek için lütfen önce giriş yapın.");
  });

  it("should return 200 and the list of pillboxes successfully", async () => {
    (getSession as jest.Mock).mockResolvedValue({ userId: "user-1", email: "test@test.com", expires: Date.now() + 10000 });

    const mockPillboxes = [
      { id: "pillbox-1", userId: "user-1", name: "My Pillbox", drugIds: ["drug-1"], createdAt: new Date() },
      { id: "pillbox-2", userId: "user-1", name: "My Pillbox 2", drugIds: ["drug-2"], createdAt: new Date() }
    ];
    (prisma.savedPillbox.findMany as jest.Mock).mockResolvedValue(mockPillboxes);
    (prisma.savedPillbox.count as jest.Mock).mockResolvedValue(2);

    const req = createMockRequest();
    const res = await GET(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.total).toBe(2);
    // JSON serialization of dates turns them to strings in NextResponse
    expect(data.pillboxes.length).toBe(2);
    expect(data.pillboxes[0].id).toBe("pillbox-1");
    expect(data.pillboxes[1].id).toBe("pillbox-2");

    expect(prisma.savedPillbox.findMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      orderBy: { createdAt: "desc" },
    });
  });

  it("should return 200 and support pagination parameters", async () => {
    (getSession as jest.Mock).mockResolvedValue({ userId: "user-1", email: "test@test.com", expires: Date.now() + 10000 });

    const mockPillboxes = [
      { id: "pillbox-1", userId: "user-1", name: "My Pillbox", drugIds: ["drug-1"], createdAt: new Date() },
    ];
    (prisma.savedPillbox.findMany as jest.Mock).mockResolvedValue(mockPillboxes);
    (prisma.savedPillbox.count as jest.Mock).mockResolvedValue(10);

    const req = createMockRequest("http://localhost:3000/api/pillbox/list?limit=5&offset=5");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.total).toBe(10);
    expect(data.pillboxes.length).toBe(1);

    expect(prisma.savedPillbox.findMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      orderBy: { createdAt: "desc" },
      take: 5,
      skip: 5
    });
  });

  it("should cap limit parameter at MAX_LIMIT (100)", async () => {
    (getSession as jest.Mock).mockResolvedValue({ userId: "user-1", email: "test@test.com", expires: Date.now() + 10000 });

    (prisma.savedPillbox.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.savedPillbox.count as jest.Mock).mockResolvedValue(0);

    const req = createMockRequest("http://localhost:3000/api/pillbox/list?limit=1000");
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(prisma.savedPillbox.findMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      orderBy: { createdAt: "desc" },
      take: 100
    });
  });

  it("should ignore invalid or negative pagination parameters", async () => {
    (getSession as jest.Mock).mockResolvedValue({ userId: "user-1", email: "test@test.com", expires: Date.now() + 10000 });

    (prisma.savedPillbox.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.savedPillbox.count as jest.Mock).mockResolvedValue(0);

    const req = createMockRequest("http://localhost:3000/api/pillbox/list?limit=-10&offset=-5");
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(prisma.savedPillbox.findMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      orderBy: { createdAt: "desc" }
    });
  });

  it("should return 500 if an internal error occurs", async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (getSession as jest.Mock).mockResolvedValue({ userId: "user-1", email: "test@test.com", expires: Date.now() + 10000 });
    (prisma.savedPillbox.findMany as jest.Mock).mockRejectedValue(new Error("Database error"));

    const req = createMockRequest();
    const res = await GET(req);

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("Kayıtlı ilaç kutuları listelenirken hata oluştu.");

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
