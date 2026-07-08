/**
 * @jest-environment jsdom
 */
import { renderHook } from '@testing-library/react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import '@testing-library/jest-dom';

describe('useFocusTrap', () => {
  let container: HTMLDivElement;
  let btn1: HTMLButtonElement;
  let btn2: HTMLButtonElement;
  let link: HTMLAnchorElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

    btn1 = document.createElement('button');
    btn2 = document.createElement('button');
    link = document.createElement('a');
    link.href = '#';

    container.appendChild(btn1);
    container.appendChild(link);
    container.appendChild(btn2);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('does not trap focus when isActive is false', () => {
    const ref = { current: container };
    renderHook(() => useFocusTrap(ref, false));

    btn2.focus();

    // Simulate Tab press on the last element
    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab' });
    container.dispatchEvent(tabEvent);

    // If active, it would focus the first element (btn1). But since inactive, it should do nothing special.
    expect(document.activeElement).toBe(btn2);
  });

  it('does nothing when ref is null', () => {
    const ref = { current: null };
    renderHook(() => useFocusTrap(ref, true));
    // Should render without throwing
  });

  it('traps focus forward when Tab is pressed on the last focusable element', () => {
    const ref = { current: container };
    renderHook(() => useFocusTrap(ref, true));

    btn2.focus(); // focus the last element
    expect(document.activeElement).toBe(btn2);

    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab' });
    const preventDefaultSpy = jest.spyOn(tabEvent, 'preventDefault');

    container.dispatchEvent(tabEvent);

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(document.activeElement).toBe(btn1); // moved to first element
  });

  it('traps focus backward when Shift+Tab is pressed on the first focusable element', () => {
    const ref = { current: container };
    renderHook(() => useFocusTrap(ref, true));

    btn1.focus(); // focus the first element
    expect(document.activeElement).toBe(btn1);

    const shiftTabEvent = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true });
    const preventDefaultSpy = jest.spyOn(shiftTabEvent, 'preventDefault');

    container.dispatchEvent(shiftTabEvent);

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(document.activeElement).toBe(btn2); // moved to last element
  });

  it('allows normal tab progression if not on the boundary elements', () => {
    const ref = { current: container };
    renderHook(() => useFocusTrap(ref, true));

    link.focus(); // focus the middle element
    expect(document.activeElement).toBe(link);

    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab' });
    const preventDefaultSpy = jest.spyOn(tabEvent, 'preventDefault');

    container.dispatchEvent(tabEvent);

    // It should not prevent default because it's not the last element
    expect(preventDefaultSpy).not.toHaveBeenCalled();
    // (In actual browser, default behavior would move focus, but jsdom won't unless we manually simulate it,
    // we just verify we didn't intervene)
  });

  it('prevents default if there are no focusable elements inside', () => {
    // Clear container
    container.innerHTML = '';

    const ref = { current: container };
    renderHook(() => useFocusTrap(ref, true));

    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab' });
    const preventDefaultSpy = jest.spyOn(tabEvent, 'preventDefault');

    container.dispatchEvent(tabEvent);

    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it('does nothing when a key other than Tab is pressed', () => {
    const ref = { current: container };
    renderHook(() => useFocusTrap(ref, true));

    const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
    const preventDefaultSpy = jest.spyOn(enterEvent, 'preventDefault');

    container.dispatchEvent(enterEvent);

    expect(preventDefaultSpy).not.toHaveBeenCalled();
  });

  it('removes event listener on unmount', () => {
    const ref = { current: container };
    const addEventListenerSpy = jest.spyOn(container, 'addEventListener');
    const removeEventListenerSpy = jest.spyOn(container, 'removeEventListener');

    const { unmount } = renderHook(() => useFocusTrap(ref, true));

    expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
  });
});
