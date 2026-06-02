/** @jest-environment jsdom */
import { renderHook, act } from "@testing-library/react";
import { useDrugSearch } from "@/hooks/useDrugSearch";
import { Drug } from "@/lib/interactions";

// Mock the fuzzySearchDrugs function since we are testing the hook logic, not the search algorithm
jest.mock("@/lib/fuzzySearch", () => ({
  fuzzySearchDrugs: jest.fn().mockImplementation((query, drugs) => {
    return drugs.map((d: Drug) => ({ item: d })); // Simplified mock
  }),
}));

describe("useDrugSearch", () => {
  const mockDrugs: Drug[] = [
    { id: "d1", name: "Aspirin", activeIngredient: "Acetylsalicylic acid", category: "Analgesic" },
    { id: "d2", name: "Ibuprofen", activeIngredient: "Ibuprofen", category: "NSAID" },
    { id: "d3", name: "Acetaminophen", activeIngredient: "Paracetamol", category: "Analgesic" },
  ];

  it("should return all available drugs when query is empty", () => {
    const { result } = renderHook(() => useDrugSearch(mockDrugs, []));

    expect(result.current.query).toBe("");
    expect(result.current.filtered).toEqual(mockDrugs);
  });

  it("should return all available drugs when query is only whitespace", () => {
    const { result } = renderHook(() => useDrugSearch(mockDrugs, []));

    act(() => {
      result.current.setQuery("   ");
    });

    expect(result.current.query).toBe("   ");
    expect(result.current.filtered).toEqual(mockDrugs);
  });

  it("should filter out selected drugs from available list", () => {
    const { result } = renderHook(() => useDrugSearch(mockDrugs, ["d1"]));

    expect(result.current.filtered).toEqual([mockDrugs[1], mockDrugs[2]]);
  });
});
