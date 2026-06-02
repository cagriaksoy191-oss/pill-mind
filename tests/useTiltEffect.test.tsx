/** @jest-environment jsdom */
import { renderHook, act } from "@testing-library/react";
import { useTiltEffect } from "../hooks/useTiltEffect";

describe("useTiltEffect", () => {
  it("initializes with default values", () => {
    const { result } = renderHook(() => useTiltEffect());
    expect(result.current.tilt).toEqual({ x: 0, y: 0 });
    expect(result.current.isHovered).toBe(false);
    expect(result.current.containerRef.current).toBeNull();
  });

  it("updates state on mouse enter and leave", () => {
    const { result } = renderHook(() => useTiltEffect());

    act(() => {
      result.current.handleMouseEnter();
    });
    expect(result.current.isHovered).toBe(true);

    act(() => {
      result.current.handleMouseLeave();
    });
    expect(result.current.isHovered).toBe(false);
    expect(result.current.tilt).toEqual({ x: 0, y: 0 });
  });

  it("calculates tilt correctly on mouse move", () => {
    const { result } = renderHook(() => useTiltEffect(10));

    const mockElement = document.createElement("div");
    mockElement.getBoundingClientRect = jest.fn(() => ({
      width: 200,
      height: 200,
      top: 100,
      left: 100,
      bottom: 300,
      right: 300,
      x: 100,
      y: 100,
      toJSON: () => {},
    }));

    // Attach mock element to ref
    (
      result.current.containerRef as React.MutableRefObject<HTMLDivElement>
    ).current = mockElement;

    act(() => {
      // @ts-expect-error Mocking MouseEvent for testing
      result.current.handleMouseMove({
        clientX: 150,
        clientY: 150,
      });
    });

    // clientX = 150, left = 100 -> x = 50
    // clientY = 150, top = 100 -> y = 50
    // centerX = 100, centerY = 100
    // rotateX = ((100 - 50) / 100) * 10 = 5
    // rotateY = ((50 - 100) / 100) * 10 = -5
    expect(result.current.tilt).toEqual({ x: 5, y: -5 });
  });

  it("does nothing on mouse move if containerRef is null", () => {
    const { result } = renderHook(() => useTiltEffect(10));

    act(() => {
      // @ts-expect-error Mocking MouseEvent for testing
      result.current.handleMouseMove({
        clientX: 150,
        clientY: 150,
      });
    });

    expect(result.current.tilt).toEqual({ x: 0, y: 0 });
  });

  it("calculates tilt correctly when maxRotation is 0", () => {
    const { result } = renderHook(() => useTiltEffect(0));

    const mockElement = document.createElement("div");
    mockElement.getBoundingClientRect = jest.fn(() => ({
      width: 200,
      height: 200,
      top: 100,
      left: 100,
      bottom: 300,
      right: 300,
      x: 100,
      y: 100,
      toJSON: () => {},
    }));

    // Attach mock element to ref
    (
      result.current.containerRef as React.MutableRefObject<HTMLDivElement>
    ).current = mockElement;

    act(() => {
      // @ts-expect-error Mocking MouseEvent for testing
      result.current.handleMouseMove({
        clientX: 150,
        clientY: 150,
      });
    });

    expect(result.current.tilt).toEqual({ x: 0, y: -0 });
  });
});
