import { getInteractionContext } from "../lib/gemini";
import { PrismaClient } from "@prisma/client";

// Mocks
jest.mock("@/lib/prisma", () => {
  return {
    prisma: {
      drugInteraction: {
        findUnique: jest.fn().mockImplementation(async ({ where }) => {
          // Simulate database latency
          await new Promise((resolve) => setTimeout(resolve, 50));
          if (where.id === "db-only-interaction") {
            return {
              id: "db-only-interaction",
              drug1Id: "D1",
              drug2Id: "D2",
              severity: "High",
              summary: "Severe interaction",
              source: "DB"
            };
          }
          return null;
        })
      }
    }
  };
});

describe("getInteractionContext Benchmark", () => {
  beforeAll(() => {
    process.env.DATABASE_URL = "postgresql://dummy";
  });

  afterAll(() => {
    delete process.env.DATABASE_URL;
  });

  it("should benchmark db fallback caching", async () => {
    const start1 = Date.now();
    await getInteractionContext("db-only-interaction");
    const end1 = Date.now();
    const duration1 = end1 - start1;

    const start2 = Date.now();
    await getInteractionContext("db-only-interaction");
    const end2 = Date.now();
    const duration2 = end2 - start2;

    console.log(`First call (uncached): ${duration1}ms`);
    console.log(`Second call (cached): ${duration2}ms`);

    // We expect the second call to be significantly faster if cached
  });
});
