import { POST } from "../app/api/check/route";
import { findInteractionsDB, checkAccumulationDB, resolveDrugsDB } from "@/lib/interactions";

jest.mock("@/lib/interactions", () => {
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  return {
    resolveDrugsDB: jest.fn().mockImplementation(async () => {
      await delay(50);
      return {};
    }),
    findInteractionsDB: jest.fn().mockImplementation(async () => {
      await delay(100);
      return [];
    }),
    checkAccumulationDB: jest.fn().mockImplementation(async () => {
      await delay(100);
      return [];
    }),
    findFoodInteractionsDB: jest.fn().mockImplementation(async () => {
      await delay(100);
      return [];
    }),
    findContraindicationsDB: jest.fn().mockImplementation(async () => {
      await delay(100);
      return [];
    }),
    checkPolypharmacyAndBeers: jest.fn().mockReturnValue({ score: 2, level: "low", message: "", beersWarnings: [] })
  };
});

jest.mock("@/lib/redis", () => ({
  redis: {
    incr: jest.fn().mockResolvedValue(1),
    expire: jest.fn(),
  },
}));

describe("API Check Route Performance Benchmark", () => {
  it("measures response time", async () => {
    const req = new Request("http://localhost/api/check", {
      method: "POST",
      body: JSON.stringify({ drugIds: ["drug-1", "drug-2"] }),
      headers: { "Content-Type": "application/json" },
    });

    const start = Date.now();
    await POST(req);
    const end = Date.now();

    console.log(`Execution time: ${end - start}ms`);
  });
});
