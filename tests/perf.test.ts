import { findInteractionsDB, checkAccumulationDB, findFoodInteractionsDB, findContraindicationsDB, resolveDrugsDB } from "../lib/interactions";

// Mock Prisma
const mockFindMany = jest.fn().mockResolvedValue([{ id: "aspirin", name: "Aspirin", activeIngredient: "Acetylsalicylic acid", category: "NSAID", pharmacologicalGroup: "NSAID" }]);
const mockPrisma = {
  drug: { findMany: mockFindMany },
  drugInteraction: { findMany: jest.fn().mockResolvedValue([]) },
  foodInteraction: { findMany: jest.fn().mockResolvedValue([]) },
  contraindication: { findMany: jest.fn().mockResolvedValue([]) }
};

jest.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

describe("Performance Optimization", () => {
  const originalDbUrl = process.env.DATABASE_URL;

  beforeAll(() => {
    process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/db";
  });

  afterAll(() => {
    process.env.DATABASE_URL = originalDbUrl;
  });

  it("should make exactly 1 query to findMany for drug resolution when using resolveDrugsDB", async () => {
    const drugIds = ["aspirin", "warfarin"];

    // Simulate what the route now does
    const resolvedCache = await resolveDrugsDB(drugIds);
    await findInteractionsDB(drugIds, resolvedCache);
    await checkAccumulationDB(drugIds, resolvedCache);
    await findFoodInteractionsDB(drugIds, resolvedCache);
    await findContraindicationsDB(drugIds, { age: 65, diseases: ["hypertension"] }, resolvedCache);

    expect(mockFindMany.mock.calls.length).toBe(1);
  });
});
