import { useCallback, Dispatch, SetStateAction, KeyboardEvent } from "react";
import { Drug } from "@/lib/interactions";

interface UseKeyboardNavigationProps {
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  activeIndex: number;
  setActiveIndex: Dispatch<SetStateAction<number>>;
  filtered: Drug[];
  onAddDrug: (drugId: string) => void;
}

export function useKeyboardNavigation({
  isOpen,
  setIsOpen,
  activeIndex,
  setActiveIndex,
  filtered,
  onAddDrug,
}: UseKeyboardNavigationProps) {
  return useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (!isOpen) {
        if (e.key === "ArrowDown" || e.key === "Enter") {
          setIsOpen(true);
        }
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveIndex((prev) => (prev < filtered.length - 1 ? prev + 1 : 0));
          break;
        case "ArrowUp":
          e.preventDefault();
          setActiveIndex((prev) => (prev > 0 ? prev - 1 : filtered.length - 1));
          break;
        case "Enter":
          e.preventDefault();
          if (activeIndex >= 0 && activeIndex < filtered.length) {
            onAddDrug(filtered[activeIndex].id);
          } else if (filtered.length > 0) {
            onAddDrug(filtered[0].id);
          }
          break;
        case "Escape":
          e.preventDefault();
          setIsOpen(false);
          setActiveIndex(-1);
          break;
        case "Tab":
          setIsOpen(false);
          setActiveIndex(-1);
          break;
      }
    },
    [isOpen, activeIndex, filtered, onAddDrug, setIsOpen, setActiveIndex]
  );
}
