import { useState, useRef, useEffect, useMemo, RefObject } from "react";
import { fuzzySearchDrugs } from "@/lib/fuzzySearch";
import { Drug } from "@/lib/interactions";
import { useFocusTrap } from "@/hooks/useFocusTrap";

interface UseDrugSelectorOptions {
  drugs: Drug[];
  selected: string[];
  onSelect: (drugIds: string[]) => void;
}

interface UseDrugSelectorReturn {
  query: string;
  setQuery: (query: string) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  activeIndex: number;
  setActiveIndex: React.Dispatch<React.SetStateAction<number>>;
  announcement: string;
  wrapperRef: RefObject<HTMLDivElement | null>;
  inputRef: RefObject<HTMLInputElement | null>;
  selectedDrugs: Drug[];
  filtered: Drug[];
  addDrug: (drugId: string) => void;
  removeDrug: (drugId: string) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export function useDrugSelector({
  drugs,
  selected,
  onSelect,
}: UseDrugSelectorOptions): UseDrugSelectorReturn {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [announcement, setAnnouncement] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Trap focus inside dropdown when open
  useFocusTrap(wrapperRef, isOpen);

  const drugMap = useMemo(() => {
    const map = new Map<string, Drug>();
    for (const d of drugs) {
      map.set(d.id, d);
    }
    return map;
  }, [drugs]);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  // Exclude already selected drugs, then fuzzy search
  const availableDrugs = useMemo(
    () => drugs.filter((d) => !selectedSet.has(d.id)),
    [drugs, selectedSet]
  );

  const filtered = query.trim()
    ? fuzzySearchDrugs(query, availableDrugs).map((r) => r.item)
    : availableDrugs;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function addDrug(drugId: string) {
    const drug = drugMap.get(drugId);
    if (drug) {
      setAnnouncement(`${drug.name} ilacı kutuya eklendi.`);
    }
    onSelect([...selected, drugId]);
    setQuery("");
    setIsOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  }

  function removeDrug(drugId: string) {
    const drug = drugMap.get(drugId);
    if (drug) {
      setAnnouncement(`${drug.name} ilacı kutudan kaldırıldı.`);
    }
    onSelect(selected.filter((id) => id !== drugId));
  }

  // Keyboard navigation for WCAG 2.2 AA accessibility
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
          addDrug(filtered[activeIndex].id);
        } else if (filtered.length > 0) {
          addDrug(filtered[0].id); // select first match by default on pressing Enter
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
  };

  const selectedDrugs = useMemo(
    () => drugs.filter((d) => selectedSet.has(d.id)),
    [drugs, selectedSet]
  );

  return {
    query,
    setQuery,
    isOpen,
    setIsOpen,
    activeIndex,
    setActiveIndex,
    announcement,
    wrapperRef,
    inputRef,
    selectedDrugs,
    filtered,
    addDrug,
    removeDrug,
    handleKeyDown,
  };
}
