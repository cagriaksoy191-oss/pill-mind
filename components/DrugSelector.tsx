"use client";

import { useState, useRef, useEffect } from "react";
import { fuzzySearchDrugs } from "@/lib/fuzzySearch";

interface Drug {
  id: string;
  name: string;
  activeIngredient: string;
  category: string;
}

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
  const availableDrugs = drugs.filter((d) => !selected.includes(d.id));
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
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset active keyboard focus when query or open status changes
  useEffect(() => {
    setActiveIndex(-1);
  }, [query, isOpen]);

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
        break;
      case "Tab":
        setIsOpen(false);
        break;
    }
  };

  const selectedDrugs = drugs.filter((d) => selected.includes(d.id));

  return (
    <div ref={wrapperRef} className="w-full relative z-30">
      {/* Selected drug chips - premium responsive design */}
      {selectedDrugs.length > 0 && (
        <div 
          className="flex flex-wrap gap-2 mb-4"
          aria-live="polite"
        >
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
          <div 
            className="absolute z-40 w-full mt-2 rounded-2xl bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xl overflow-hidden max-h-72 overflow-y-auto animate-fade-in divide-y divide-slate-100 dark:divide-slate-900"
            role="listbox"
          >
            {filtered.length === 0 ? (
              <div className="px-5 py-4 text-sm text-slate-400 dark:text-slate-500 italic text-center">
                {query ? "Eşleşen herhangi bir ilaç bulunamadı" : "Tüm ilaçlar kutuya eklendi"}
              </div>
            ) : (
              filtered.map((drug, index) => {
                const isHighlighted = index === activeIndex;
                return (
                  <button
                    key={drug.id}
                    onClick={() => addDrug(drug.id)}
                    className={`w-full text-left px-5 py-3.5 transition-all duration-200 flex items-center justify-between cursor-pointer ${
                      isHighlighted
                        ? "bg-indigo-500/10 dark:bg-indigo-500/20 border-l-4 border-indigo-500 pl-4"
                        : "hover:bg-slate-50 dark:hover:bg-slate-900/50 border-l-4 border-transparent"
                    }`}
                    role="option"
                    aria-selected={isHighlighted}
                  >
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="font-bold text-slate-800 dark:text-slate-100 text-sm md:text-base truncate flex items-center gap-1.5">
                        <span>💊</span>
                        <span>{drug.name}</span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
                        Etken Madde: <span className="font-semibold text-slate-600 dark:text-slate-300">{drug.activeIngredient}</span>
                      </div>
                    </div>
                    <div className="text-[10px] md:text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border border-slate-200/40 dark:border-slate-700/40 shrink-0">
                      {drug.category}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.15s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
