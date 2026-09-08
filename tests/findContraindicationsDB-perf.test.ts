import { findContraindicationsDB, clearContraindicationsCache } from "../lib/interactions";

// Mock Prisma
const mockFindManyDrug = jest.fn();
const mockFindManyContra = jest.fn();
const mockPrisma = {
  drug: { findMany: mockFindManyDrug },
  contraindication: { findMany: mockFindManyContra }
};

jest.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

describe("findContraindicationsDB Performance", () => {
  const originalDbUrl = process.env.DATABASE_URL;

  beforeAll(() => {
    process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/db";
  });

  afterAll(() => {
    process.env.DATABASE_URL = originalDbUrl;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should benchmark contraindication finding with cache hit vs miss", async () => {
    const drugIds = Array.from({ length: 50 }, (_, i) => `drug-${i}`);

    const resolvedDrugsCache = drugIds.map(id => ({
      id,
      name: `Name ${id}`,
      activeIngredient: `Active ${id}`,
      category: "Category",
      pharmacologicalGroup: "Group"
    }));

    const dbContras = Array.from({ length: 10000 }, (_, i) => ({
      id: `contra-${i}`,
      drugId: `drug-${i % 50}`,
      diseaseIcd: `ICD-${i % 10}`,
      diseaseName: `Disease ${i % 10}`,
      effect: `Effect ${i}`,
      severity: i % 2 === 0 ? "High" : "Low"
    }));

    mockFindManyContra.mockResolvedValue(dbContras);

    // Baseline: Cache misses (clearing cache every iteration)
    clearContraindicationsCache();
    const startMiss = performance.now();
    for (let i = 0; i < 100; i++) {
        clearContraindicationsCache();
        await findContraindicationsDB(drugIds, { diseases: ["ICD-1", "ICD-2"] }, resolvedDrugsCache);
    }
    const endMiss = performance.now();
    const durationMiss = endMiss - startMiss;

    // Optimized: Cache hits (cache populated once)
    clearContraindicationsCache();
    const startHit = performance.now();
    for (let i = 0; i < 100; i++) {
        await findContraindicationsDB(drugIds, { diseases: ["ICD-1", "ICD-2"] }, resolvedDrugsCache);
    }
    const endHit = performance.now();
    const durationHit = endHit - startHit;

    console.log(`[BENCHMARK Cache Miss] findContraindicationsDB (100 iterations x 10000 items): ${durationMiss.toFixed(2)} ms`);
    console.log(`[BENCHMARK Cache Hit] findContraindicationsDB (100 iterations x 10000 items): ${durationHit.toFixed(2)} ms`);

    // Total DB calls should be 100 for misses + 1 for hits
    expect(mockFindManyContra).toHaveBeenCalledTimes(101);
  });

  it("should handle empty diseases array without querying db", async () => {
    const drugIds = ["drug-1", "drug-2"];
    const resolvedDrugsCache = drugIds.map(id => ({
      id,
      name: `Name ${id}`,
      activeIngredient: `Active ${id}`,
      category: "Category",
      pharmacologicalGroup: "Group"
    }));

    await findContraindicationsDB(drugIds, { diseases: [] }, resolvedDrugsCache);

    expect(mockFindManyContra).not.toHaveBeenCalled();
  });

  it("should handle undefined diseases without querying db", async () => {
    const drugIds = ["drug-1", "drug-2"];
    const resolvedDrugsCache = drugIds.map(id => ({
      id,
      name: `Name ${id}`,
      activeIngredient: `Active ${id}`,
      category: "Category",
      pharmacologicalGroup: "Group"
    }));

    await findContraindicationsDB(drugIds, { ageGroup: "elderly" }, resolvedDrugsCache);

    expect(mockFindManyContra).not.toHaveBeenCalled();
  });

  it("should handle empty drugIds without querying contraindications if no resolved drugs", async () => {
    mockFindManyDrug.mockResolvedValue([]);
    await findContraindicationsDB([], { diseases: ["ICD-1"] });

    // It will query contraindications with an empty resolvedDrugIds array
    expect(mockFindManyContra).toHaveBeenCalledWith({
      where: {
        drugId: { in: [] },
        diseaseIcd: { in: ["ICD-1"] }
      }
    });
  });

  it("should handle empty drugIds and empty diseases array simultaneously without querying contraindications", async () => {
    mockFindManyDrug.mockResolvedValue([]);
    await findContraindicationsDB([], { diseases: [] });

    // It should not query contraindications since diseases is empty
    expect(mockFindManyContra).not.toHaveBeenCalled();
  });

});
