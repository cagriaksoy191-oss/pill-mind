/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { useDrugSelector } from '../hooks/useDrugSelector';
import { Drug } from '../lib/interactions';

const mockDrugs: Drug[] = [
  { id: '1', name: 'Parasetamol', activeIngredient: 'Paracetamol', category: 'Analgesic' },
  { id: '2', name: 'Ibuprofen', activeIngredient: 'Ibuprofen', category: 'NSAID' },
  { id: '3', name: 'Aspirin', activeIngredient: 'Acetylsalicylic acid', category: 'NSAID' },
  { id: '4', name: 'Amoksisilin', activeIngredient: 'Amoxicillin', category: 'Antibiotic' },
];

describe('useDrugSelector', () => {
  let onSelectMock: jest.Mock;

  beforeEach(() => {
    onSelectMock = jest.fn();
  });

  it('initializes with default values and filters selected drugs correctly', () => {
    const { result } = renderHook(() =>
      useDrugSelector({
        drugs: mockDrugs,
        selected: ['1'],
        onSelect: onSelectMock,
      })
    );

    expect(result.current.query).toBe('');
    expect(result.current.isOpen).toBe(false);
    expect(result.current.activeIndex).toBe(-1);
    expect(result.current.announcement).toBe('');
    expect(result.current.selectedDrugs).toEqual([mockDrugs[0]]);
    expect(result.current.filtered).toEqual([mockDrugs[1], mockDrugs[2], mockDrugs[3]]);
  });

  it('filters available drugs using fuzzy search when query is set', () => {
    const { result } = renderHook(() =>
      useDrugSelector({
        drugs: mockDrugs,
        selected: [],
        onSelect: onSelectMock,
      })
    );

    act(() => {
      result.current.setQuery('Ibu');
    });

    expect(result.current.query).toBe('Ibu');
    expect(result.current.filtered).toHaveLength(1);
    expect(result.current.filtered[0].id).toBe('2');
  });

  it('adds a drug correctly with announcement and focus reset', () => {
    const inputElement = document.createElement('input');
    const focusSpy = jest.spyOn(inputElement, 'focus');

    const { result } = renderHook(() =>
      useDrugSelector({
        drugs: mockDrugs,
        selected: ['1'],
        onSelect: onSelectMock,
      })
    );

    // Set inputRef.current manually
    (result.current.inputRef as React.MutableRefObject<HTMLInputElement | null>).current = inputElement;

    act(() => {
      result.current.setIsOpen(true);
      result.current.setQuery('Ibu');
      result.current.setActiveIndex(0);
      result.current.addDrug('2');
    });

    expect(onSelectMock).toHaveBeenCalledWith(['1', '2']);
    expect(result.current.announcement).toBe('Ibuprofen ilacı kutuya eklendi.');
    expect(result.current.query).toBe('');
    expect(result.current.isOpen).toBe(false);
    expect(result.current.activeIndex).toBe(-1);
    expect(focusSpy).toHaveBeenCalled();
  });

  it('handles adding a drug that does not exist gracefully', () => {
    const { result } = renderHook(() =>
      useDrugSelector({
        drugs: mockDrugs,
        selected: ['1'],
        onSelect: onSelectMock,
      })
    );

    act(() => {
      result.current.addDrug('non-existent');
    });

    expect(onSelectMock).toHaveBeenCalledWith(['1', 'non-existent']);
    expect(result.current.announcement).toBe('');
  });

  it('removes a drug correctly with announcement', () => {
    const { result } = renderHook(() =>
      useDrugSelector({
        drugs: mockDrugs,
        selected: ['1', '2'],
        onSelect: onSelectMock,
      })
    );

    act(() => {
      result.current.removeDrug('2');
    });

    expect(onSelectMock).toHaveBeenCalledWith(['1']);
    expect(result.current.announcement).toBe('Ibuprofen ilacı kutudan kaldırıldı.');
  });

  it('handles removing a drug that does not exist in drug map', () => {
    const { result } = renderHook(() =>
      useDrugSelector({
        drugs: mockDrugs,
        selected: ['1', 'unknown'],
        onSelect: onSelectMock,
      })
    );

    act(() => {
      result.current.removeDrug('unknown');
    });

    expect(onSelectMock).toHaveBeenCalledWith(['1']);
    expect(result.current.announcement).toBe('');
  });

  describe('Keyboard navigation (handleKeyDown)', () => {
    it('opens dropdown on ArrowDown or Enter when closed', () => {
      const { result } = renderHook(() =>
        useDrugSelector({
          drugs: mockDrugs,
          selected: [],
          onSelect: onSelectMock,
        })
      );

      const arrowDownEvent = { key: 'ArrowDown' } as React.KeyboardEvent<HTMLInputElement>;
      act(() => {
        result.current.handleKeyDown(arrowDownEvent);
      });
      expect(result.current.isOpen).toBe(true);

      act(() => {
        result.current.setIsOpen(false);
      });

      const enterEvent = { key: 'Enter' } as React.KeyboardEvent<HTMLInputElement>;
      act(() => {
        result.current.handleKeyDown(enterEvent);
      });
      expect(result.current.isOpen).toBe(true);
    });

    it('navigates through filtered items with ArrowDown and ArrowUp when open', () => {
      const { result } = renderHook(() =>
        useDrugSelector({
          drugs: mockDrugs,
          selected: [],
          onSelect: onSelectMock,
        })
      );

      act(() => {
        result.current.setIsOpen(true);
      });

      const preventDefaultMock = jest.fn();
      const arrowDownEvent = { key: 'ArrowDown', preventDefault: preventDefaultMock } as unknown as React.KeyboardEvent<HTMLInputElement>;

      // ArrowDown to index 0
      act(() => {
        result.current.handleKeyDown(arrowDownEvent);
      });
      expect(preventDefaultMock).toHaveBeenCalled();
      expect(result.current.activeIndex).toBe(0);

      // ArrowDown to index 1
      act(() => {
        result.current.handleKeyDown(arrowDownEvent);
      });
      expect(result.current.activeIndex).toBe(1);

      // ArrowUp back to index 0
      const arrowUpEvent = { key: 'ArrowUp', preventDefault: preventDefaultMock } as unknown as React.KeyboardEvent<HTMLInputElement>;
      act(() => {
        result.current.handleKeyDown(arrowUpEvent);
      });
      expect(result.current.activeIndex).toBe(0);

      // ArrowUp wraps around to last element (index 3)
      act(() => {
        result.current.handleKeyDown(arrowUpEvent);
      });
      expect(result.current.activeIndex).toBe(mockDrugs.length - 1);

      // ArrowDown wraps back to index 0
      act(() => {
        result.current.handleKeyDown(arrowDownEvent);
      });
      expect(result.current.activeIndex).toBe(0);
    });

    it('selects active drug or first match on Enter when open', () => {
      const { result } = renderHook(() =>
        useDrugSelector({
          drugs: mockDrugs,
          selected: [],
          onSelect: onSelectMock,
        })
      );

      act(() => {
        result.current.setIsOpen(true);
        result.current.setActiveIndex(1); // Ibuprofen
      });

      const preventDefaultMock = jest.fn();
      const enterEvent = { key: 'Enter', preventDefault: preventDefaultMock } as unknown as React.KeyboardEvent<HTMLInputElement>;

      act(() => {
        result.current.handleKeyDown(enterEvent);
      });

      expect(preventDefaultMock).toHaveBeenCalled();
      expect(onSelectMock).toHaveBeenCalledWith(['2']); // Selected '2' (Ibuprofen)

      // Reset and test Enter with activeIndex = -1 selecting first match
      onSelectMock.mockClear();
      act(() => {
        result.current.setIsOpen(true);
        result.current.setActiveIndex(-1);
      });

      act(() => {
        result.current.handleKeyDown(enterEvent);
      });

      expect(onSelectMock).toHaveBeenCalledWith(['1']); // First available drug '1' (Parasetamol)
    });

    it('closes dropdown and resets activeIndex on Escape or Tab when open', () => {
      const { result } = renderHook(() =>
        useDrugSelector({
          drugs: mockDrugs,
          selected: [],
          onSelect: onSelectMock,
        })
      );

      act(() => {
        result.current.setIsOpen(true);
        result.current.setActiveIndex(1);
      });

      const preventDefaultMock = jest.fn();
      const escapeEvent = { key: 'Escape', preventDefault: preventDefaultMock } as unknown as React.KeyboardEvent<HTMLInputElement>;

      act(() => {
        result.current.handleKeyDown(escapeEvent);
      });

      expect(preventDefaultMock).toHaveBeenCalled();
      expect(result.current.isOpen).toBe(false);
      expect(result.current.activeIndex).toBe(-1);

      // Test Tab key
      act(() => {
        result.current.setIsOpen(true);
        result.current.setActiveIndex(2);
      });

      const tabEvent = { key: 'Tab' } as React.KeyboardEvent<HTMLInputElement>;
      act(() => {
        result.current.handleKeyDown(tabEvent);
      });

      expect(result.current.isOpen).toBe(false);
      expect(result.current.activeIndex).toBe(-1);
    });
  });

  describe('Outside click handling', () => {
    it('closes dropdown when clicking outside wrapper element', () => {
      const wrapperDiv = document.createElement('div');
      const outsideDiv = document.createElement('div');
      document.body.appendChild(wrapperDiv);
      document.body.appendChild(outsideDiv);

      const { result } = renderHook(() =>
        useDrugSelector({
          drugs: mockDrugs,
          selected: [],
          onSelect: onSelectMock,
        })
      );

      // Attach wrapperRef
      (result.current.wrapperRef as React.MutableRefObject<HTMLDivElement | null>).current = wrapperDiv;

      act(() => {
        result.current.setIsOpen(true);
        result.current.setActiveIndex(1);
      });

      // Dispatch mousedown on outside element
      act(() => {
        outsideDiv.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      });

      expect(result.current.isOpen).toBe(false);
      expect(result.current.activeIndex).toBe(-1);

      document.body.removeChild(wrapperDiv);
      document.body.removeChild(outsideDiv);
    });

    it('does not close dropdown when clicking inside wrapper element', () => {
      const wrapperDiv = document.createElement('div');
      const insideDiv = document.createElement('div');
      wrapperDiv.appendChild(insideDiv);
      document.body.appendChild(wrapperDiv);

      const { result } = renderHook(() =>
        useDrugSelector({
          drugs: mockDrugs,
          selected: [],
          onSelect: onSelectMock,
        })
      );

      (result.current.wrapperRef as React.MutableRefObject<HTMLDivElement | null>).current = wrapperDiv;

      act(() => {
        result.current.setIsOpen(true);
        result.current.setActiveIndex(1);
      });

      act(() => {
        insideDiv.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      });

      expect(result.current.isOpen).toBe(true);
      expect(result.current.activeIndex).toBe(1);

      document.body.removeChild(wrapperDiv);
    });
  });
});
