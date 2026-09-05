import { GET } from "@/app/api/pillbox/share/[token]/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  findInteractionsDB,
  resolveDrugsDB,
  checkAccumulationDB,
  findFoodInteractionsDB,
  findContraindicationsDB,
  getDrugsByIds
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

describe("Pillbox Share Route Performance Benchmark", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("measures performance when resolveDrugsDB returns empty array (cache miss scenario)", async () => {
    const mockShare = {
      token: "valid-token",
      drugIds: ["aspirin", "warfarin"],
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      createdAt: new Date(),
    };
    (prisma.pillboxShare.findUnique as jest.Mock).mockResolvedValue(mockShare);

    // Cache miss / empty
    (resolveDrugsDB as jest.Mock).mockResolvedValue([]);
    (getDrugsByIds as jest.Mock).mockReturnValue([
      { id: "aspirin", name: "Aspirin" },
      { id: "warfarin", name: "Warfarin" },
    ]);
    (prisma.drug.findMany as jest.Mock).mockResolvedValue([
      { id: "aspirin", name: "Aspirin" },
      { id: "warfarin", name: "Warfarin" },
    ]);
    (findInteractionsDB as jest.Mock).mockResolvedValue([]);
    (checkAccumulationDB as jest.Mock).mockResolvedValue([]);
    (findFoodInteractionsDB as jest.Mock).mockResolvedValue([]);
    (findContraindicationsDB as jest.Mock).mockResolvedValue([]);

    const req = {} as NextRequest;

    const iterations = 1000;
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      await GET(req, { params: Promise.resolve({ token: "valid-token" }) });
    }
    const duration = performance.now() - start;

    console.log(`[BENCHMARK Cache Miss] ${iterations} requests took ${duration.toFixed(2)} ms (${(duration / iterations).toFixed(4)} ms/req)`);
    console.log(`[BENCHMARK Cache Miss] prisma.drug.findMany call count: ${(prisma.drug.findMany as jest.Mock).mock.calls.length}`);
  });
});
