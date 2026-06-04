import { POST } from "../app/api/explain/route";
import {
  shouldUseFallback,
  getInteractionContext,
  callGeminiForInteraction,
} from "@/lib/gemini";

jest.mock("@/lib/redis", () => ({
  redis: null,
}));

jest.mock("@/lib/gemini", () => ({
  shouldUseFallback: jest.fn(),
  getInteractionContext: jest.fn(),
  callGeminiForInteraction: jest.fn(),
  callGeminiForCoverage: jest.fn(),
  getCoverageContext: jest.fn(),
}));

describe("POST /api/explain benchmark", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (shouldUseFallback as jest.Mock).mockReturnValue(false);
  });

  it("should measure performance", async () => {
    (getInteractionContext as jest.Mock).mockReturnValue({
      interaction: { id: "test", severity: "high" },
      drug1Name: "DrugA",
      drug2Name: "DrugB",
      drug1Ingredient: "IngA",
      drug2Ingredient: "IngB"
    });

    (callGeminiForInteraction as jest.Mock).mockImplementation(async () => {
      await new Promise(r => setTimeout(r, 100)); // Simulate 100ms LLM latency
      return {
        explanation: "Live AI explanation generated after cache fail.",
        generatedAt: "2024-05-20T12:00:00.000Z"
      };
    });

    const req1 = new Request("http://localhost/api/explain", {
      method: "POST",
      body: JSON.stringify({ interactionId: "test-interaction" }),
      headers: { "Content-Type": "application/json" }
    });

    const start1 = Date.now();
    await POST(req1);
    const end1 = Date.now();
    console.log(`First request (without Redis): ${end1 - start1}ms`);

    const req2 = new Request("http://localhost/api/explain", {
      method: "POST",
      body: JSON.stringify({ interactionId: "test-interaction" }),
      headers: { "Content-Type": "application/json" }
    });

    const start2 = Date.now();
    await POST(req2);
    const end2 = Date.now();
    console.log(`Second request (without Redis): ${end2 - start2}ms`);

    // We expect 1 LLM call because we implemented in-memory cache fallback
    expect(callGeminiForInteraction).toHaveBeenCalledTimes(1);
  });
});
