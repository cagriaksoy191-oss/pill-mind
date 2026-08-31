import { fetchDrugsList } from "../app/api/fhir/medication/route";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    drug: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock("@/lib/redis", () => ({
  redis: {
    get: jest.fn(),
    set: jest.fn(),
  },
}));

describe("FHIR Medication Route Caching Benchmark", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("benchmarks performance of repeated fetchDrugsList calls", async () => {
    const mockDrugs = Array.from({ length: 50 }, (_, i) => ({
      id: `drug-${i}`,
      name: `Drug ${i}`,
      activeIngredient: `Ingredient ${i}`,
      category: `Category ${i}`,
      pharmacologicalGroup: `Group ${i}`,
      rxcui: `100${i}`,
      ingredient: {
        id: `ing-${i}`,
        name: `Ingredient ${i}`,
        normalizedName: `ingredient ${i}`,
        rxcui: `100${i}`,
        atcCode: `A0${i}`
      }
    }));

    (prisma.drug.findMany as jest.Mock).mockResolvedValue(mockDrugs);
    (redis!.get as jest.Mock).mockResolvedValue(null);

    const iterations = 1000;
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      await fetchDrugsList(50, 0);
    }
    const end = performance.now();

    console.log(`[FHIR MEDICATION BENCHMARK] ${iterations} iterations took: ${(end - start).toFixed(2)} ms`);
    const dbCallCount = (prisma.drug.findMany as jest.Mock).mock.calls.length;
    console.log(`[FHIR MEDICATION BENCHMARK] Prisma findMany call count: ${dbCallCount}`);
  });
});
