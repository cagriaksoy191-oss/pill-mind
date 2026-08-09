/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { useClinicalMode } from '../hooks/useClinicalMode';

describe('useClinicalMode', () => {
  const localStorageMock = (function () {
    let store: Record<string, string> = {};
    return {
      getItem(key: string) {
        return store[key] || null;
      },
      setItem(key: string, value: string) {
        store[key] = value;
      },
      clear() {
        store = {};
      },
      removeItem(key: string) {
        delete store[key];
      }
    };
  })();

  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });
    window.localStorage.clear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with false if localStorage is empty', () => {
    const { result } = renderHook(() => useClinicalMode());
    expect(result.current.isClinicalMode).toBe(false);
  });

  it('should initialize with true if localStorage has true', () => {
    window.localStorage.setItem('pillmind_clinical_mode', 'true');
    const { result } = renderHook(() => useClinicalMode());
    expect(result.current.isClinicalMode).toBe(true);
  });

  it('should initialize with false if localStorage has false', () => {
    window.localStorage.setItem('pillmind_clinical_mode', 'false');
    const { result } = renderHook(() => useClinicalMode());
    expect(result.current.isClinicalMode).toBe(false);
  });

  it('toggleClinicalMode should change state and update localStorage', () => {
    const { result } = renderHook(() => useClinicalMode());

    expect(result.current.isClinicalMode).toBe(false);

    act(() => {
      result.current.toggleClinicalMode();
    });

    expect(result.current.isClinicalMode).toBe(true);
    expect(window.localStorage.getItem('pillmind_clinical_mode')).toBe('true');

    act(() => {
      result.current.toggleClinicalMode();
    });

    expect(result.current.isClinicalMode).toBe(false);
    expect(window.localStorage.getItem('pillmind_clinical_mode')).toBe('false');
  });

  it('should dispatch an event on toggle', () => {
    const dispatchEventSpy = jest.spyOn(window, 'dispatchEvent');
    const { result } = renderHook(() => useClinicalMode());

    act(() => {
      result.current.toggleClinicalMode();
    });

    expect(dispatchEventSpy).toHaveBeenCalledWith(expect.any(Event));
    expect((dispatchEventSpy.mock.calls[0][0] as Event).type).toBe('pillmind_clinical_mode_changed');
  });

  it('should sync state across components when event is dispatched', () => {
    const { result: result1 } = renderHook(() => useClinicalMode());
    const { result: result2 } = renderHook(() => useClinicalMode());

    expect(result1.current.isClinicalMode).toBe(false);
    expect(result2.current.isClinicalMode).toBe(false);

    act(() => {
      result1.current.toggleClinicalMode();
    });

    expect(result1.current.isClinicalMode).toBe(true);
    expect(result2.current.isClinicalMode).toBe(true);
  });

  it('should handle missing window gracefully (SSR)', () => {
    const originalWindow = global.window;
    // Simulate SSR by temporarily removing window
    // @ts-expect-error simulating SSR environment
    delete global.window;

    const { result } = renderHook(() => useClinicalMode());

    expect(result.current.isClinicalMode).toBe(false);

    act(() => {
      result.current.toggleClinicalMode();
    });

    expect(result.current.isClinicalMode).toBe(true); // State updates locally

    // Restore window
    global.window = originalWindow;
  });
});
