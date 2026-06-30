/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { useTiltEffect } from '../hooks/useTiltEffect';
import '@testing-library/jest-dom';

describe('useTiltEffect', () => {
  it('initializes with default values', () => {
    const { result } = renderHook(() => useTiltEffect());

    expect(result.current.tilt).toEqual({ x: 0, y: 0 });
    expect(result.current.isHovered).toBe(false);
    expect(result.current.containerRef.current).toBeNull();
  });

  it('updates isHovered on mouse enter and leave', () => {
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

  it('calculates tilt correctly on mouse move', () => {
    const { result } = renderHook(() => useTiltEffect(10));

    const div = document.createElement('div');
    // Mock getBoundingClientRect
    div.getBoundingClientRect = jest.fn().mockReturnValue({
      left: 100,
      top: 100,
      width: 200,
      height: 200,
    });

    // Set the ref
    act(() => {
      (result.current.containerRef as any).current = div;
    });

    // Simulate mouse move to top-left corner
    act(() => {
      result.current.handleMouseMove({
        clientX: 100, // x = 0 within element
        clientY: 100, // y = 0 within element
      } as any);
    });

    // centerX = 100, centerY = 100
    // x = 0, y = 0
    // rotateX = ((100 - 0) / 100) * 10 = 10
    // rotateY = ((0 - 100) / 100) * 10 = -10
    expect(result.current.tilt).toEqual({ x: 10, y: -10 });

    // Simulate mouse move to bottom-right corner
    act(() => {
      result.current.handleMouseMove({
        clientX: 300, // x = 200 within element
        clientY: 300, // y = 200 within element
      } as any);
    });

    // centerX = 100, centerY = 100
    // x = 200, y = 200
    // rotateX = ((100 - 200) / 100) * 10 = -10
    // rotateY = ((200 - 100) / 100) * 10 = 10
    expect(result.current.tilt).toEqual({ x: -10, y: 10 });

    // Simulate mouse move to center
    act(() => {
      result.current.handleMouseMove({
        clientX: 200, // x = 100 within element
        clientY: 200, // y = 100 within element
      } as any);
    });

    // rotateX = 0, rotateY = 0
    expect(result.current.tilt).toEqual({ x: 0, y: 0 });
  });

  it('does nothing on mouse move if containerRef is null', () => {
    const { result } = renderHook(() => useTiltEffect(10));

    act(() => {
      result.current.handleMouseMove({
        clientX: 100,
        clientY: 100,
      } as any);
    });

    // Tilt should remain default
    expect(result.current.tilt).toEqual({ x: 0, y: 0 });
  });

  it('resets tilt on mouse leave', () => {
    const { result } = renderHook(() => useTiltEffect(10));

    const div = document.createElement('div');
    div.getBoundingClientRect = jest.fn().mockReturnValue({
      left: 0, top: 0, width: 100, height: 100,
    });

    act(() => {
      (result.current.containerRef as any).current = div;
    });

    act(() => {
      result.current.handleMouseMove({
        clientX: 10,
        clientY: 10,
      } as any);
    });

    // Tilt should be updated
    expect(result.current.tilt).not.toEqual({ x: 0, y: 0 });

    act(() => {
      result.current.handleMouseLeave();
    });

    // Tilt should be reset
    expect(result.current.tilt).toEqual({ x: 0, y: 0 });
  });
});
