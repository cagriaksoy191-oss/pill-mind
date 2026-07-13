import { GET } from "../app/api/fhir/medication/route";
import { getAllDrugs } from "@/lib/interactions";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    drug: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock("@/lib/auth", () => ({
  getSession: jest.fn().mockResolvedValue({ userId: "test-user", email: "test@example.com", expires: Date.now() + 10000 }),
  verifyCSRF: jest.fn().mockReturnValue(true),
}));

jest.mock("@/lib/interactions", () => ({
  getAllDrugs: jest.fn(),
}));

describe("GET /api/fhir/medication", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it("should return a bundle of drugs from the database with correct FHIR Medication format", async () => {
    const { prisma } = require("@/lib/prisma");
    (prisma.drug.findMany as jest.Mock).mockResolvedValue([
      {
        id: "drug-1",
        name: "Drug One",
        activeIngredient: "Ingredient 1",
        category: "Category 1",
        pharmacologicalGroup: "Group 1",
        rxcui: "12345",
        ingredient: {
          id: "ing-1",
          name: "Ingredient 1",
          normalizedName: "ingredient 1",
          rxcui: "12345",
          atcCode: "A01AA01"
        }
      },
      {
        id: "drug-2",
        name: "Drug Two",
        activeIngredient: "Ingredient 2",
        category: "Category 2",
        pharmacologicalGroup: "Group 2",
        rxcui: null, // Test fallback coding logic when both missing
        ingredient: null
      }
    ]);

    const req = new Request("http://localhost/api/fhir/medication") as any;
    req.cookies = { get: jest.fn().mockReturnValue({ value: "mock-session-cookie" }) };
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.resourceType).toBe("Bundle");
    expect(data.type).toBe("searchset");
    expect(data.total).toBe(2);

    // Check first drug with rxcui and atcCode
    const resource1 = data.entry[0].resource;
    expect(resource1.id).toBe("drug-1");
    expect(resource1.code.coding.length).toBe(2);
    expect(resource1.code.coding[0].system).toBe("http://www.nlm.nih.gov/research/umls/rxnorm");
    expect(resource1.code.coding[0].code).toBe("12345");
    expect(resource1.code.coding[1].system).toBe("http://www.whocc.no/atc");
    expect(resource1.code.coding[1].code).toBe("A01AA01");

    // Check second drug without rxcui/atcCode (fallback coding)
    const resource2 = data.entry[1].resource;
    expect(resource2.id).toBe("drug-2");
    expect(resource2.code.coding.length).toBe(1);
    expect(resource2.code.coding[0].system).toBe("http://www.whocc.no/atc");
    expect(resource2.code.coding[0].code).toBe("ATC-DRUG-2"); // drug.id.toUpperCase()
  });

  it("should fallback to getAllDrugs if database query fails", async () => {
    const { prisma } = require("@/lib/prisma");
    (prisma.drug.findMany as jest.Mock).mockRejectedValue(new Error("DB Connection Error"));

    (getAllDrugs as jest.Mock).mockReturnValue([
      {
        id: "fallback-1",
        name: "Fallback Drug",
        activeIngredient: "Fallback Ingredient",
        category: "Fallback Category",
        pharmacologicalGroup: "Fallback Group"
      }
    ]);

    const req = new Request("http://localhost/api/fhir/medication") as any;
    req.cookies = { get: jest.fn().mockReturnValue({ value: "mock-session-cookie" }) };
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.total).toBe(1);
    expect(data.entry[0].resource.id).toBe("fallback-1");

    // Fallback logic sets rxcui and ingredient to null, so it uses fallback coding
    const coding = data.entry[0].resource.code.coding;
    expect(coding.length).toBe(1);
    expect(coding[0].code).toBe("ATC-FALLBACK-1");
  });

  it("should return 500 OperationOutcome if an unexpected error occurs", async () => {
    const { prisma } = require("@/lib/prisma");
    (prisma.drug.findMany as jest.Mock).mockRejectedValue(new Error("DB Connection Error"));

    // Make fallback throw as well to trigger the outer catch
    (getAllDrugs as jest.Mock).mockImplementation(() => {
      throw new Error("Unexpected Failure");
    });

    const req = new Request("http://localhost/api/fhir/medication") as any;
    req.cookies = { get: jest.fn().mockReturnValue({ value: "mock-session-cookie" }) };
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.resourceType).toBe("OperationOutcome");
    expect(data.issue[0].severity).toBe("error");
    expect(data.issue[0].code).toBe("exception");
    expect(data.issue[0].diagnostics).toBe("Unexpected Failure");
    });

  it("should parse _count and _offset and pass to findMany", async () => {
    const { prisma } = require("@/lib/prisma");
    (prisma.drug.findMany as jest.Mock).mockResolvedValue([]);

    const req = new Request("http://localhost/api/fhir/medication?_count=10&_offset=20") as any;
    req.cookies = { get: jest.fn().mockReturnValue({ value: "mock-session-cookie" }) };
    await GET(req);

    expect(prisma.drug.findMany).toHaveBeenCalledWith({
      take: 10,
      skip: 20,
      include: {
        ingredient: true
      }
    });
  });

});
