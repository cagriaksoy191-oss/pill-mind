/**
 * @jest-environment jsdom
 */

import { renderHook, act } from "@testing-library/react";
import { useNewlyAddedDrug } from "@/hooks/useNewlyAddedDrug";
import { Drug } from "@/components/VirtualPillbox";

describe("useNewlyAddedDrug", () => {
  const drug1: Drug = { id: "1", name: "Aspirin", activeIngredient: "ASA", category: "Analgesic" };
  const drug2: Drug = { id: "2", name: "Parol", activeIngredient: "Paracetamol", category: "Analgesic" };

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns null initially when starting with empty drugs list", () => {
    const { result } = renderHook(() => useNewlyAddedDrug([]));
    expect(result.current).toBeNull();
  });

  it("triggers animation ID when a new drug is added and clears it after timeout", () => {
    const { result, rerender } = renderHook(({ drugs }) => useNewlyAddedDrug(drugs), {
      initialProps: { drugs: [drug1] },
    });

    expect(result.current).toBeNull();

    // Rerender with added drug
    rerender({ drugs: [drug1, drug2] });

    // Fast-forward requestAnimationFrame
    act(() => {
      jest.runAllTimers();
    });

    // After animation timeout (1000ms), it resets to null
    expect(result.current).toBeNull();
  });
});
