import { POST } from "../app/api/check/route";
import { findInteractionsDB } from "@/lib/interactions";

jest.mock("@/lib/interactions", () => ({
  findInteractionsDB: jest.fn(),
}));

describe("POST /api/check", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 400 if drugIds is missing", async () => {
    const req = new Request("http://localhost/api/check", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data).toEqual({ error: "En az 2 ilaç ID'si gereklidir." });
  });

  it("should return 400 if drugIds is not an array", async () => {
    const req = new Request("http://localhost/api/check", {
      method: "POST",
      body: JSON.stringify({ drugIds: "not-an-array" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data).toEqual({ error: "En az 2 ilaç ID'si gereklidir." });
  });

  it("should return 400 if drugIds has less than 2 items", async () => {
    const req = new Request("http://localhost/api/check", {
      method: "POST",
      body: JSON.stringify({ drugIds: ["drug-1"] }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data).toEqual({ error: "En az 2 ilaç ID'si gereklidir." });
  });

  it("should return 500 if JSON parsing fails", async () => {
    const req = new Request("http://localhost/api/check", {
      method: "POST",
      body: "invalid-json",
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data).toEqual({ error: "Kontrol sırasında bir hata oluştu." });
  });

  it("should return 500 if findInteractionsDB throws an error", async () => {
    (findInteractionsDB as jest.Mock).mockRejectedValueOnce(new Error("DB Error"));

    const req = new Request("http://localhost/api/check", {
      method: "POST",
      body: JSON.stringify({ drugIds: ["drug-1", "drug-2"] }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data).toEqual({ error: "Kontrol sırasında bir hata oluştu." });
  });

  it("should return 200 and interactions if request is valid", async () => {
    const mockResults = [
      {
        interaction: { id: "test", severity: "high", summary: "Test summary" },
        drug1Name: "Drug A",
        drug2Name: "Drug B",
      },
    ];
    (findInteractionsDB as jest.Mock).mockResolvedValueOnce(mockResults);

    const req = new Request("http://localhost/api/check", {
      method: "POST",
      body: JSON.stringify({ drugIds: ["drug-1", "drug-2"] }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({
      interactions: mockResults,
      checkedDrugs: ["drug-1", "drug-2"],
      totalFound: 1,
      disclaimer: "Bu sonuçlar sınırlı bir demo veri setine dayanabilir ve tıbbi tavsiye niteliği taşımaz.",
    });
  });
});
