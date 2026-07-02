import { findContraindicationsDB } from "../lib/interactions";

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

  it("should benchmark contraindication finding with many contras", async () => {
    const drugIds = Array.from({ length: 50 }, (_, i) => `drug-${i}`);

    // Generate 50 dummy drugs
    const resolvedDrugsCache = drugIds.map(id => ({
      id,
      name: `Name ${id}`,
      activeIngredient: `Active ${id}`,
      category: "Category",
      pharmacologicalGroup: "Group"
    }));

    // Create 10000 fake contraindications for the db
    const dbContras = Array.from({ length: 10000 }, (_, i) => ({
      id: `contra-${i}`,
      drugId: `drug-${i % 50}`, // Maps to our dummy drugs
      diseaseIcd: `ICD-${i % 10}`,
      diseaseName: `Disease ${i % 10}`,
      effect: `Effect ${i}`,
      severity: i % 2 === 0 ? "High" : "Low"
    }));

    mockFindManyContra.mockResolvedValue(dbContras);

    const start = performance.now();
    for (let i = 0; i < 100; i++) {
        await findContraindicationsDB(drugIds, { diseases: ["ICD-1", "ICD-2"] }, resolvedDrugsCache);
    }
    const end = performance.now();

    console.log(`[BENCHMARK] findContraindicationsDB with 10000 db results (100 iterations): ${(end - start).toFixed(2)} ms`);
    expect(true).toBe(true);
  });
});
