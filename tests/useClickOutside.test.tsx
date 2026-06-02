/** @jest-environment jsdom */
import { renderHook, act } from "@testing-library/react";
import { useClickOutside } from "../hooks/useClickOutside";

describe("useClickOutside", () => {
  it("calls handler when clicking outside the element", () => {
    const handler = jest.fn();
    const targetElement = document.createElement("div");
    const insideElement = document.createElement("span");
    targetElement.appendChild(insideElement);
    document.body.appendChild(targetElement);

    const ref = { current: targetElement };

    renderHook(() => useClickOutside(ref, handler));

    // Click inside the element
    act(() => {
      insideElement.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    });
    expect(handler).not.toHaveBeenCalled();

    // Click outside the element
    act(() => {
      document.body.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    });
    expect(handler).toHaveBeenCalledTimes(1);

    // Click exactly on the element
    act(() => {
      targetElement.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    });
    expect(handler).toHaveBeenCalledTimes(1); // Still 1 from before
  });

  it("does not call handler if ref is null", () => {
    const handler = jest.fn();
    const ref = { current: null };

    renderHook(() => useClickOutside(ref, handler));

    act(() => {
      document.body.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    });
    expect(handler).not.toHaveBeenCalled();
  });

  it("cleans up event listener on unmount", () => {
    const handler = jest.fn();
    const targetElement = document.createElement("div");
    document.body.appendChild(targetElement);

    const ref = { current: targetElement };

    const { unmount } = renderHook(() => useClickOutside(ref, handler));

    unmount();

    act(() => {
      document.body.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    });
    expect(handler).not.toHaveBeenCalled();
  });
});
