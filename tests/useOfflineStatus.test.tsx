/**
 * @jest-environment jsdom
 */
import { renderHook, act } from "@testing-library/react";
import { useOfflineStatus } from "@/hooks/useOfflineStatus";

describe("useOfflineStatus", () => {
  let originalOnLine: boolean;

  beforeEach(() => {
    // Mock navigator.onLine and serviceWorker
    originalOnLine = window.navigator.onLine;
    Object.defineProperty(window.navigator, 'onLine', {
      writable: true,
      value: true,
    });

    Object.defineProperty(window.navigator, 'serviceWorker', {
      writable: true,
      value: {
        register: jest.fn().mockResolvedValue({ scope: '/' }),
      },
    });

    jest.spyOn(console, 'info').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    Object.defineProperty(window.navigator, 'onLine', {
      writable: true,
      value: originalOnLine,
    });
    jest.restoreAllMocks();
  });

  it("should return false initially when online", () => {
    Object.defineProperty(window.navigator, 'onLine', { value: true });
    const { result } = renderHook(() => useOfflineStatus());
    expect(result.current).toBe(false);
  });

  it("should return true initially when offline", () => {
    Object.defineProperty(window.navigator, 'onLine', { value: false });
    const { result } = renderHook(() => useOfflineStatus());
    expect(result.current).toBe(true);
  });

  it("should update state to true on 'offline' event", () => {
    const { result } = renderHook(() => useOfflineStatus());
    expect(result.current).toBe(false);

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    expect(result.current).toBe(true);
  });

  it("should update state to false on 'online' event", () => {
    // Start offline
    Object.defineProperty(window.navigator, 'onLine', { value: false });
    const { result } = renderHook(() => useOfflineStatus());
    expect(result.current).toBe(true);

    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    expect(result.current).toBe(false);
  });

  it("should register service worker if available", () => {
    renderHook(() => useOfflineStatus());
    expect(window.navigator.serviceWorker.register).toHaveBeenCalledWith('/sw.js');
  });

  it("should clean up event listeners on unmount", () => {
    const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useOfflineStatus());

    expect(addEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(addEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));
  });
});
