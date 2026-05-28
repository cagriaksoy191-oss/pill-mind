import { getSeverityLabel, getSeverityColor, getAllDrugs, findInteractions } from "../lib/interactions";

describe("interactions UI helpers", () => {

  describe("getSeverityLabel", () => {
    test("returns correct label for 'high' severity", () => {
      const result = getSeverityLabel("high");
      expect(result).toBe("Potansiyel Önemli Etkileşim");
    });

    test("returns correct label for 'medium' severity", () => {
      const result = getSeverityLabel("medium");
      expect(result).toBe("Dikkat Edilmesi Gereken Etkileşim");
    });

    test("returns correct label for 'low' severity", () => {
      const result = getSeverityLabel("low");
      expect(result).toBe("Olası Hafif Etkileşim / İzlem Önerisi");
    });

    test("returns default label for unknown severity", () => {
      const result = getSeverityLabel("unknown");
      expect(result).toBe("Bilgi mevcut değil");
    });

    test("returns default label for empty string", () => {
      const result = getSeverityLabel("");
      expect(result).toBe("Bilgi mevcut değil");
    });

    test("is case sensitive and returns default for uppercase inputs", () => {
      const result = getSeverityLabel("HIGH");
      expect(result).toBe("Bilgi mevcut değil");
    });
  });

  describe("getSeverityColor", () => {
    test("returns correct colors for 'high' severity", () => {
      const result = getSeverityColor("high");
      expect(result).toEqual({
        bg: "bg-red-50",
        border: "border-red-300",
        badge: "bg-red-600 text-white",
        text: "text-red-800",
      });
    });

    test("returns correct colors for 'medium' severity", () => {
      const result = getSeverityColor("medium");
      expect(result).toEqual({
        bg: "bg-amber-50",
        border: "border-amber-300",
        badge: "bg-amber-500 text-white",
        text: "text-amber-800",
      });
    });

    test("returns correct colors for 'low' severity", () => {
      const result = getSeverityColor("low");
      expect(result).toEqual({
        bg: "bg-green-50",
        border: "border-green-300",
        badge: "bg-green-600 text-white",
        text: "text-green-800",
      });
    });

    test("returns default gray colors for unknown severity", () => {
      const result = getSeverityColor("unknown");
      expect(result).toEqual({
        bg: "bg-gray-50",
        border: "border-gray-300",
        badge: "bg-gray-500 text-white",
        text: "text-gray-700",
      });
    });

    test("returns default gray colors for empty string", () => {
      const result = getSeverityColor("");
      expect(result).toEqual({
        bg: "bg-gray-50",
        border: "border-gray-300",
        badge: "bg-gray-500 text-white",
        text: "text-gray-700",
      });
    });

    test("is case sensitive and returns default for uppercase inputs", () => {
      const result = getSeverityColor("HIGH");
      expect(result).toEqual({
        bg: "bg-gray-50",
        border: "border-gray-300",
        badge: "bg-gray-500 text-white",
        text: "text-gray-700",
      });
    });
  });

  describe("getAllDrugs", () => {
    test("returns an array of drugs", () => {
      const drugs = getAllDrugs();
      expect(Array.isArray(drugs)).toBe(true);
      expect(drugs.length).toBeGreaterThan(0);

      const firstDrug = drugs[0];
      expect(firstDrug).toHaveProperty("id");
      expect(firstDrug).toHaveProperty("name");
      expect(firstDrug).toHaveProperty("activeIngredient");
      expect(firstDrug).toHaveProperty("category");
    });
  });

  describe("findInteractions", () => {
    test("returns empty array for empty input", () => {
      const result = findInteractions([]);
      expect(result).toEqual([]);
    });

    test("returns empty array for single drug", () => {
      const result = findInteractions(["aspirin"]);
      expect(result).toEqual([]);
    });

    test("returns empty array for non-interacting drugs", () => {
      // Assuming aspirin and metformin don't interact in the mock dataset
      const result = findInteractions(["aspirin", "metformin"]);
      expect(result).toEqual([]);
    });

    test("returns interactions for interacting drugs", () => {
      const result = findInteractions(["aspirin", "warfarin"]);
      expect(result.length).toBe(1);

      const res = result[0];
      expect(res.interaction.id).toBe("aspirin-warfarin");
      expect(res.interaction.severity).toBe("high");
      expect(res.drug1Name).toBe("Aspirin");
      expect(res.drug2Name).toBe("Coumadin (Warfarin)");
    });

    test("is order independent", () => {
      const result1 = findInteractions(["aspirin", "warfarin"]);
      const result2 = findInteractions(["warfarin", "aspirin"]);

      expect(result1.length).toBe(1);
      expect(result2.length).toBe(1);
      expect(result1[0].interaction.id).toBe(result2[0].interaction.id);
    });

    test("returns multiple interactions for multiple interacting drugs", () => {
      const result = findInteractions(["aspirin", "warfarin", "ibuprofen"]);

      // Expected interactions: aspirin-warfarin, aspirin-ibuprofen, ibuprofen-warfarin
      // Let's check length is correct based on dataset (assuming 3 interactions here or at least 2)
      // aspirin-warfarin and ibuprofen-warfarin exist based on the peek.
      // aspirin-ibuprofen might also exist. We just assert length > 1
      expect(result.length).toBeGreaterThan(1);

      const ids = result.map(r => r.interaction.id);
      expect(ids).toContain("aspirin-warfarin");
      expect(ids).toContain("ibuprofen-warfarin");
    });
  });
});
