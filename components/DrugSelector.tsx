"use client";

import { useState, useRef, useEffect } from "react";
import { fuzzySearchDrugs } from "@/lib/fuzzySearch";
import { Drug } from "@/lib/interactions";
import DrugList from "./DrugList";

interface DrugSelectorProps {
  drugs: Drug[];
  selected: string[];
  onSelect: (drugIds: string[]) => void;
}

export default function DrugSelector({
  drugs,
  selected,
  onSelect,
}: DrugSelectorProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Exclude already selected drugs, then fuzzy search
  const selectedSet = new Set(selected);
  const availableDrugs = drugs.filter((d) => !selectedSet.has(d.id));
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
    onSelect([...selected, drugId]);
    setQuery("");
    setIsOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  }

  function removeDrug(drugId: string) {
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

  const selectedDrugs = drugs.filter((d) => selectedSet.has(d.id));

  return (
    <div ref={wrapperRef} className="w-full relative z-30">
      {/* Selected drug chips - premium responsive design */}
      {selectedDrugs.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4" aria-live="polite">
          {selectedDrugs.map((drug) => (
            <span
              key={drug.id}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-50/90 to-purple-50/90 dark:from-indigo-950/40 dark:to-purple-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/40 rounded-xl text-sm font-semibold shadow-sm transition-all duration-200 hover:scale-[1.02]"
            >
              <span className="text-base">💊</span>
              <span>{drug.name}</span>
              <button
                onClick={() => removeDrug(drug.id)}
                className="ml-1 w-4 h-4 rounded-full flex items-center justify-center bg-indigo-200/60 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200 font-bold text-xs hover:bg-red-500 hover:text-white cursor-pointer transition-all duration-150"
                aria-label={`${drug.name} ilacını arama kutusundan kaldır`}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input section with premium glassmorphic border and glow */}
      <div className="relative">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400 text-lg">
          🔍
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="İlaç adı, etken madde veya marka yazın... (Örn: Koraspin, Asprn)"
          className="w-full pl-12 pr-4 py-4 rounded-2xl text-base bg-white/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 backdrop-blur-md shadow-inner text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-label="İlaç Arama ve Ekleme Kutusu"
        />

        {/* Dropdown - Premium Glassmorphism with transitions */}
        {isOpen && (
          <DrugList
            filtered={filtered}
            query={query}
            activeIndex={activeIndex}
            onAddDrug={addDrug}
          />
        )}
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fadeIn 0.15s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
