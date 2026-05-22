import { getSeverityColor, getAllDrugs } from "../lib/interactions";

describe("interactions UI helpers", () => {
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
});
