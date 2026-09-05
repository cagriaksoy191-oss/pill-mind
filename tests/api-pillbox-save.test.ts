import { POST } from "@/app/api/pillbox/save/route";
import { NextRequest } from "next/server";
import { getSession, verifyCSRF } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Mock dependencies
jest.mock("@/lib/auth", () => ({
  getSession: jest.fn(),
  verifyCSRF: jest.fn(),
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
    (verifyCSRF as jest.Mock).mockReturnValue(true);
  });

  const createMockRequest = (body: Record<string, unknown>) => {
    return {
      json: jest.fn().mockResolvedValue(body),
    } as unknown as NextRequest;
  };

  it("should return 403 if CSRF verification fails", async () => {
    (verifyCSRF as jest.Mock).mockReturnValue(false);

    const req = createMockRequest({ name: "My Pillbox", drugIds: ["drug-1"] });
    const res = await POST(req);

    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe("Güvenlik doğrulaması başarısız oldu (CSRF engellendi).");
  });

  it("should return 401 if user is not authenticated", async () => {
    (getSession as jest.Mock).mockResolvedValue(null);

    const req = createMockRequest({ name: "My Pillbox", drugIds: ["drug-1"] });
    const res = await POST(req);

    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("İlaç kutunuzu buluta kaydetmek için lütfen önce giriş yapın.");
  });

  describe("Validation Errors (400)", () => {
    it.each([
      ["missing name", { name: "", drugIds: ["drug-1"] }],
      ["whitespace-only name", { name: "   ", drugIds: ["drug-1"] }],
      ["missing drugIds", { name: "My Pillbox" }],
      ["empty drugIds array", { name: "My Pillbox", drugIds: [] }],
      ["drugIds not an array", { name: "My Pillbox", drugIds: "not-an-array" }],
    ])("should return 400 when %s", async (_, body) => {
      (getSession as jest.Mock).mockResolvedValue({ userId: "user-1", email: "test@test.com", expires: Date.now() + 10000 });

      const req = createMockRequest(body);
      const res = await POST(req);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Kutu ismi ve en az 1 ilaç seçimi zorunludur.");
    });

    it("should return 400 if drugIds array is longer than 100 elements", async () => {
      (getSession as jest.Mock).mockResolvedValue({ userId: "user-1", email: "test@test.com", expires: Date.now() + 10000 });

      const tooManyDrugIds = new Array(101).fill("drug-id");
      const req = createMockRequest({ name: "My Pillbox", drugIds: tooManyDrugIds });
      const res = await POST(req);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Bir kutuya en fazla 100 ilaç eklenebilir.");
    });
  });

  it("should return 413 if drugIds payload is too large", async () => {
    (getSession as jest.Mock).mockResolvedValue({ userId: "user-1", email: "test@test.com", expires: Date.now() + 10000 });

    const largeDrugIds = new Array(10000).fill("a-very-long-drug-id-string-to-exceed-the-limit");
    const req = createMockRequest({ name: "My Pillbox", drugIds: largeDrugIds });
    const res = await POST(req);

    expect(res.status).toBe(413);
    const data = await res.json();
    expect(data.error).toBe("Payload Too Large");
  });

  it("should return 200 and save the pillbox successfully", async () => {
    (getSession as jest.Mock).mockResolvedValue({ userId: "user-1", email: "test@test.com", expires: Date.now() + 10000 });

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
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    (getSession as jest.Mock).mockResolvedValue({ userId: "user-1", email: "test@test.com", expires: Date.now() + 10000 });
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
