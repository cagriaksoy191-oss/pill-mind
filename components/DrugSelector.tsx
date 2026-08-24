"use client";

import { Drug } from "@/lib/interactions";
import DrugList from "./DrugList";
import SelectedDrugChips from "./SelectedDrugChips";
import { useDrugSelector } from "@/hooks/useDrugSelector";

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
  const {
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
  } = useDrugSelector({ drugs, selected, onSelect });

  return (
    <div ref={wrapperRef} className="w-full relative z-30">
      {/* Screen reader live announcer */}
      <div className="sr-only" aria-live="assertive" aria-atomic="true">
        {announcement}
      </div>

      {/* Selected drug chips - premium responsive design */}
      <SelectedDrugChips
        selectedDrugs={selectedDrugs}
        onRemove={removeDrug}
      />

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
          role="combobox"
          aria-controls={isOpen ? "drug-select-listbox" : undefined}
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
