import { POST } from "@/app/api/admin/review/route";
import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";

jest.mock("@/lib/auth", () => ({
  verifyCSRF: jest.fn().mockReturnValue(true),
  getSession: jest.fn(),
}));

jest.mock("@/lib/redis", () => ({
  redis: {
    get: jest.fn(),
    set: jest.fn(),
  },
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: jest.fn().mockImplementation((promises) => Promise.all(promises)),
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

describe("Admin Review Route Performance Benchmark", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("measures performance difference between DB lookup and cached session/Redis lookup", async () => {
    const mockReq = {
      json: jest.fn().mockResolvedValue({
        interactionId: "interaction-1",
        status: "VERIFIED",
      }),
    } as unknown as NextRequest;

    (prisma.drugInteraction.findUnique as jest.Mock).mockResolvedValue({ id: "interaction-1" });
    (prisma.drugInteraction.update as jest.Mock).mockResolvedValue({ id: "interaction-1", verificationStatus: "VERIFIED" });
    (prisma.clinicalReview.create as jest.Mock).mockResolvedValue({ id: "review-1" });

    // Uncached DB lookup for each request
    (getSession as jest.Mock).mockResolvedValue({ userId: "admin-1", email: "admin@test.com" });
    (redis?.get as jest.Mock).mockResolvedValue(null);
    (prisma.user.findUnique as jest.Mock).mockImplementation(async () => {
      return { role: "ADMIN" };
    });

    const iterations = 1000;

    const startUncached = performance.now();
    for (let i = 0; i < iterations; i++) {
      await POST(mockReq);
    }
    const endUncached = performance.now();
    const uncachedTime = endUncached - startUncached;

    // Cached role in session token
    (getSession as jest.Mock).mockResolvedValue({ userId: "admin-1", email: "admin@test.com", role: "ADMIN" });

    const startCached = performance.now();
    for (let i = 0; i < iterations; i++) {
      await POST(mockReq);
    }
    const endCached = performance.now();
    const cachedTime = endCached - startCached;

    console.log(`[BENCHMARK] Uncached DB lookup (${iterations} reqs): ${uncachedTime.toFixed(2)} ms`);
    console.log(`[BENCHMARK] Session token/Redis cached lookup (${iterations} reqs): ${cachedTime.toFixed(2)} ms`);
    if (cachedTime > 0) {
      console.log(`[BENCHMARK] Speedup factor: ${(uncachedTime / cachedTime).toFixed(2)}x`);
    }

    expect(cachedTime).toBeLessThanOrEqual(uncachedTime);
  });
});
