import { POST } from "@/app/api/pillbox/save/route";
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
      create: jest.fn(),
    },
  },
}));

describe("POST /api/pillbox/save", () => {
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

    const req = createMockRequest({ name: "My Pillbox", drugIds: ["drug-1"] });
    const res = await POST(req);

    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("İlaç kutunuzu buluta kaydetmek için lütfen önce giriş yapın.");
  });

  it("should return 400 if name is missing", async () => {
    (getSession as jest.Mock).mockReturnValue({ userId: "user-1", email: "test@test.com", expires: Date.now() + 10000 });

    const req = createMockRequest({ name: "   ", drugIds: ["drug-1"] });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Kutu ismi ve en az 1 ilaç seçimi zorunludur.");
  });

  it("should return 400 if drugIds is missing or empty", async () => {
    (getSession as jest.Mock).mockReturnValue({ userId: "user-1", email: "test@test.com", expires: Date.now() + 10000 });

    const req = createMockRequest({ name: "My Pillbox", drugIds: [] });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Kutu ismi ve en az 1 ilaç seçimi zorunludur.");
  });

  it("should return 400 if drugIds is not an array", async () => {
    (getSession as jest.Mock).mockReturnValue({ userId: "user-1", email: "test@test.com", expires: Date.now() + 10000 });

    const req = createMockRequest({ name: "My Pillbox", drugIds: "not-an-array" });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Kutu ismi ve en az 1 ilaç seçimi zorunludur.");
  });

  it("should return 200 and save the pillbox successfully", async () => {
    (getSession as jest.Mock).mockReturnValue({ userId: "user-1", email: "test@test.com", expires: Date.now() + 10000 });

    const mockCreatedPillbox = { id: "pillbox-1", userId: "user-1", name: "My Pillbox", drugIds: ["drug-1"] };
    (prisma.savedPillbox.create as jest.Mock).mockResolvedValue(mockCreatedPillbox);

    const req = createMockRequest({ name: "My Pillbox ", drugIds: ["drug-1"] });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.pillbox).toEqual(mockCreatedPillbox);
    expect(prisma.savedPillbox.create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        name: "My Pillbox",
        drugIds: ["drug-1"],
      },
    });
  });

  it("should return 500 if an internal error occurs", async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (getSession as jest.Mock).mockReturnValue({ userId: "user-1", email: "test@test.com", expires: Date.now() + 10000 });
    (prisma.savedPillbox.create as jest.Mock).mockRejectedValue(new Error("Database error"));

    const req = createMockRequest({ name: "My Pillbox", drugIds: ["drug-1"] });
    const res = await POST(req);

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("İlaç kutusu kaydedilirken sistemsel bir hata oluştu.");

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
