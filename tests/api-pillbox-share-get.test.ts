import { GET } from "@/app/api/pillbox/share/[token]/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  findInteractionsDB,
  resolveDrugsDB,
  checkAccumulationDB,
  findFoodInteractionsDB,
  findContraindicationsDB,
} from "@/lib/interactions";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    pillboxShare: {
      findUnique: jest.fn(),
    },
    drug: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock("@/lib/interactions", () => ({
  findInteractionsDB: jest.fn(),
  resolveDrugsDB: jest.fn(),
  checkAccumulationDB: jest.fn(),
  findFoodInteractionsDB: jest.fn(),
  findContraindicationsDB: jest.fn(),
  getDrugsByIds: jest.fn(),
}));

describe("GET /api/pillbox/share/[token]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockRequest = () => {
    return {} as unknown as NextRequest;
  };

  it("should return 400 if token is missing", async () => {
    const req = createMockRequest();
    const res = await GET(req, { params: Promise.resolve({ token: "" }) });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Geçersiz paylaşım bağlantısı (Token eksik).");
  });

  it("should return 404 if share is not found", async () => {
    (prisma.pillboxShare.findUnique as jest.Mock).mockResolvedValue(null);

    const req = createMockRequest();
    const res = await GET(req, { params: Promise.resolve({ token: "invalid-token" }) });

    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("Paylaşım bulunamadı veya silinmiş.");
  });

  it("should return 410 if share has expired", async () => {
    (prisma.pillboxShare.findUnique as jest.Mock).mockResolvedValue({
      token: "expired-token",
      expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Expired yesterday
    });

    const req = createMockRequest();
    const res = await GET(req, { params: Promise.resolve({ token: "expired-token" }) });

    expect(res.status).toBe(410);
    const data = await res.json();
    expect(data.error).toBe("Bu paylaşım bağlantısının süresi dolmuş.");
  });

  it("should return 200 and filter drugs from resolvedDrugsCache if it returns an array", async () => {
    const mockShare = {
      token: "valid-token",
      drugIds: ["drug-1", "drug-2"],
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      createdAt: new Date(),
    };
    (prisma.pillboxShare.findUnique as jest.Mock).mockResolvedValue(mockShare);

    const mockCachedDrugs = [
      { id: "drug-1", name: "Cached Aspirin" },
      { id: "drug-2", name: "Cached Paracetamol" },
      { id: "drug-3", name: "Cached Ibuprofen" },
    ];
    (resolveDrugsDB as jest.Mock).mockResolvedValue(mockCachedDrugs);
    (findInteractionsDB as jest.Mock).mockResolvedValue([]);
    (checkAccumulationDB as jest.Mock).mockResolvedValue([]);
    (findFoodInteractionsDB as jest.Mock).mockResolvedValue([]);
    (findContraindicationsDB as jest.Mock).mockResolvedValue([]);

    const req = createMockRequest();
    const res = await GET(req, { params: Promise.resolve({ token: "valid-token" }) });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.drugs).toEqual([
      { id: "drug-1", name: "Cached Aspirin" },
      { id: "drug-2", name: "Cached Paracetamol" },
    ]);
    expect(prisma.drug.findMany).not.toHaveBeenCalled();
  });

  it("should return 200 and data successfully via local getDrugsByIds fallback when cache is not an array or empty", async () => {
    const mockShare = {
      token: "valid-token",
      drugIds: ["drug-1", "drug-2"],
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Valid for tomorrow
      createdAt: new Date(),
    };
    (prisma.pillboxShare.findUnique as jest.Mock).mockResolvedValue(mockShare);

    const mockLocalDrugs = [{ id: "drug-1", name: "Aspirin" }, { id: "drug-2", name: "Paracetamol" }];
    const { getDrugsByIds } = jest.requireMock("@/lib/interactions");
    getDrugsByIds.mockReturnValue(mockLocalDrugs);

    const mockResolvedDrugsCache = new Map();
    (resolveDrugsDB as jest.Mock).mockResolvedValue(mockResolvedDrugsCache);
    (findInteractionsDB as jest.Mock).mockResolvedValue([{ severity: "High" }]);
    (checkAccumulationDB as jest.Mock).mockResolvedValue([{ issue: "Accumulation" }]);
    (findFoodInteractionsDB as jest.Mock).mockResolvedValue([{ warning: "No grapefruit" }]);
    (findContraindicationsDB as jest.Mock).mockResolvedValue([{ contraindication: "Liver disease" }]);

    const req = createMockRequest();
    const res = await GET(req, { params: Promise.resolve({ token: "valid-token" }) });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.token).toBe("valid-token");
    expect(data.drugIds).toEqual(["drug-1", "drug-2"]);
    expect(data.drugs).toEqual(mockLocalDrugs);
    expect(data.interactions).toEqual([{ severity: "High" }]);
    expect(data.accumulationWarnings).toEqual([{ issue: "Accumulation" }]);
    expect(data.foodInteractions).toEqual([{ warning: "No grapefruit" }]);
    expect(data.contraindications).toEqual([{ contraindication: "Liver disease" }]);
    expect(prisma.drug.findMany).not.toHaveBeenCalled();
  });

  it("should return 500 if an internal error occurs", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    (prisma.pillboxShare.findUnique as jest.Mock).mockRejectedValue(new Error("Unexpected error"));

    const req = createMockRequest();
    const res = await GET(req, { params: Promise.resolve({ token: "valid-token" }) });

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("Paylaşım verileri yüklenirken sistemsel bir hata oluştu.");

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
