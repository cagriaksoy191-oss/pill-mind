/** @jest-environment jsdom */
import { renderHook, act } from "@testing-library/react";
import { useInteractionState } from "../hooks/useInteractionState";
import { CheckResult, AccumulationWarning, FoodInteractionResult, ContraindicationResult, PolypharmacyReport } from "@/lib/interactions";

describe("useInteractionState", () => {
  it("should initialize with default values", () => {
    const { result } = renderHook(() => useInteractionState());

    expect(result.current.interactions).toEqual([]);
    expect(result.current.accumulationWarnings).toEqual([]);
    expect(result.current.foodInteractions).toEqual([]);
    expect(result.current.contraindications).toEqual([]);
    expect(result.current.polypharmacyReport).toBeNull();
    expect(result.current.isChecking).toBe(false);
    expect(result.current.checkingError).toBeNull();
  });

  it("should update individual states", () => {
    const { result } = renderHook(() => useInteractionState());

    act(() => {
      result.current.setIsChecking(true);
      result.current.setCheckingError("An error occurred");
    });

    expect(result.current.isChecking).toBe(true);
    expect(result.current.checkingError).toBe("An error occurred");
  });

  it("should apply results correctly", () => {
    const { result } = renderHook(() => useInteractionState());

    const mockInteractions: CheckResult[] = [{ severity: "high", description: "Test interaction", drugs: ["Drug A", "Drug B"] }];
    const mockAccumulationWarnings: AccumulationWarning[] = [{ type: "cns_depression", drugs: ["Drug A"], message: "Warning" }];
    const mockFoodInteractions: FoodInteractionResult[] = [{ drug: "Drug A", food: "Grapefruit", description: "Interaction", severity: "high" }];
    const mockContraindications: ContraindicationResult[] = [{ drug: "Drug A", condition: "Pregnancy", description: "Contraindicated", severity: "high" }];
    const mockPolypharmacyReport: PolypharmacyReport = { count: 1, warnings: [], beersListMatch: [] };

    act(() => {
      result.current.applyResults({
        interactions: mockInteractions,
        accumulationWarnings: mockAccumulationWarnings,
        foodInteractions: mockFoodInteractions,
        contraindications: mockContraindications,
        polypharmacyReport: mockPolypharmacyReport,
      });
    });

    expect(result.current.interactions).toEqual(mockInteractions);
    expect(result.current.accumulationWarnings).toEqual(mockAccumulationWarnings);
    expect(result.current.foodInteractions).toEqual(mockFoodInteractions);
    expect(result.current.contraindications).toEqual(mockContraindications);
    expect(result.current.polypharmacyReport).toEqual(mockPolypharmacyReport);
  });

  it("should apply partial results and default others to empty arrays or null", () => {
    const { result } = renderHook(() => useInteractionState());

    const mockInteractions: CheckResult[] = [{ severity: "high", description: "Test interaction", drugs: ["Drug A", "Drug B"] }];

    act(() => {
      result.current.applyResults({
        interactions: mockInteractions,
        // others are omitted
      });
    });

    expect(result.current.interactions).toEqual(mockInteractions);
    expect(result.current.accumulationWarnings).toEqual([]);
    expect(result.current.foodInteractions).toEqual([]);
    expect(result.current.contraindications).toEqual([]);
    expect(result.current.polypharmacyReport).toBeNull();
  });

  it("should reset state correctly", () => {
    const { result } = renderHook(() => useInteractionState());

    act(() => {
      result.current.applyResults({
        interactions: [{ severity: "high", description: "Test interaction", drugs: ["Drug A", "Drug B"] }],
        accumulationWarnings: [{ type: "cns_depression", drugs: ["Drug A"], message: "Warning" }],
        foodInteractions: [{ drug: "Drug A", food: "Grapefruit", description: "Interaction", severity: "high" }],
        contraindications: [{ drug: "Drug A", condition: "Pregnancy", description: "Contraindicated", severity: "high" }],
        polypharmacyReport: { count: 1, warnings: [], beersListMatch: [] },
      });
      result.current.setIsChecking(true);
      result.current.setCheckingError("Error");
    });

    act(() => {
      result.current.resetState();
    });

    expect(result.current.interactions).toEqual([]);
    expect(result.current.accumulationWarnings).toEqual([]);
    expect(result.current.foodInteractions).toEqual([]);
    expect(result.current.contraindications).toEqual([]);
    expect(result.current.polypharmacyReport).toBeNull();
    // note: isChecking is not reset in resetState
    expect(result.current.isChecking).toBe(true);
    expect(result.current.checkingError).toBeNull();
  });
});
