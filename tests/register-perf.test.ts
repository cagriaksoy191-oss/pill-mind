import { POST } from "@/app/api/auth/register/route";
import { prisma } from "@/lib/prisma";

jest.mock("@/lib/redis", () => ({
  redis: {
    incr: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(true),
  },
}));

jest.mock("@/lib/ip", () => ({
  getClientIp: jest.fn().mockReturnValue("127.0.0.1"),
}));

jest.mock("@sentry/nextjs", () => ({
  captureException: jest.fn(),
}));

jest.mock("@/lib/auth", () => ({
  verifyCSRF: jest.fn().mockReturnValue(true),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
    },
  },
}));

describe("Register Route DB Query Count Benchmark", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("measures DB operations during user registration", async () => {
    const email = "benchmark@example.com";
    const req = {
      json: jest.fn().mockResolvedValue({ email }),
    } as unknown as Request;

    (prisma.user.upsert as jest.Mock).mockResolvedValue({ id: "user-bm", email });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.user.create as jest.Mock).mockResolvedValue({ id: "user-bm", email });

    const start = performance.now();
    await POST(req);
    const end = performance.now();

    const findUniqueCalls = (prisma.user.findUnique as jest.Mock).mock.calls.length;
    const createCalls = (prisma.user.create as jest.Mock).mock.calls.length;
    const upsertCalls = (prisma.user.upsert as jest.Mock).mock.calls.length;
    const totalDbQueries = findUniqueCalls + createCalls + upsertCalls;

    console.log(`[REGISTER BENCHMARK] Execution time: ${(end - start).toFixed(3)}ms | Total DB Queries: ${totalDbQueries} (findUnique: ${findUniqueCalls}, create: ${createCalls}, upsert: ${upsertCalls})`);
    expect(upsertCalls).toBe(1);
    expect(findUniqueCalls).toBe(0);
    expect(createCalls).toBe(0);
  });
});
