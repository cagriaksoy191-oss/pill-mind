/**
 * @jest-environment jsdom
 */
import { renderHook, act } from "@testing-library/react";
import { useKeyboardNavigation } from "../hooks/useKeyboardNavigation";
import { KeyboardEvent } from "react";

describe("useKeyboardNavigation", () => {
  it("handles ArrowDown when filtered is empty", () => {
    const setIsOpen = jest.fn();
    const setActiveIndex = jest.fn();
    const onAddDrug = jest.fn();

    const { result } = renderHook(() =>
      useKeyboardNavigation({
        isOpen: true,
        setIsOpen,
        activeIndex: -1,
        setActiveIndex,
        filtered: [],
        onAddDrug,
      }),
    );

    act(() => {
      result.current({
        key: "ArrowDown",
        preventDefault: jest.fn(),
      } as unknown as KeyboardEvent<HTMLInputElement>);
    });

    // In current implementation, if prev is -1 and length is 0,
    // prev < -1 is false, so it returns 0.
    // We just want to ensure it calls setActiveIndex with a function that calculates the next state
    // Let's extract the state updater function and test it directly.
    expect(setActiveIndex).toHaveBeenCalled();
    const updater = setActiveIndex.mock.calls[0][0];
    expect(updater(-1)).toBe(0);
  });

  it("handles ArrowUp when filtered is empty", () => {
    const setIsOpen = jest.fn();
    const setActiveIndex = jest.fn();
    const onAddDrug = jest.fn();

    const { result } = renderHook(() =>
      useKeyboardNavigation({
        isOpen: true,
        setIsOpen,
        activeIndex: -1,
        setActiveIndex,
        filtered: [],
        onAddDrug,
      }),
    );

    act(() => {
      result.current({
        key: "ArrowUp",
        preventDefault: jest.fn(),
      } as unknown as KeyboardEvent<HTMLInputElement>);
    });

    expect(setActiveIndex).toHaveBeenCalled();
    const updater = setActiveIndex.mock.calls[0][0];
    // prev > 0 ? prev - 1 : filtered.length - 1
    // -1 > 0 is false, so 0 - 1 = -1
    expect(updater(-1)).toBe(-1);
  });

  it("handles Enter when filtered is empty", () => {
    const setIsOpen = jest.fn();
    const setActiveIndex = jest.fn();
    const onAddDrug = jest.fn();

    const { result } = renderHook(() =>
      useKeyboardNavigation({
        isOpen: true,
        setIsOpen,
        activeIndex: -1,
        setActiveIndex,
        filtered: [],
        onAddDrug,
      }),
    );

    act(() => {
      result.current({
        key: "Enter",
        preventDefault: jest.fn(),
      } as unknown as KeyboardEvent<HTMLInputElement>);
    });

    // onAddDrug shouldn't be called because both branches require matching conditions that aren't met
    expect(onAddDrug).not.toHaveBeenCalled();
  });
});
