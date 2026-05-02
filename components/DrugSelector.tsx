"use client";

import { useState, useRef, useEffect, useMemo } from "react";

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
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const searchableDrugs = useMemo(
    () =>
      drugs.map((d) => ({
        ...d,
        lowerName: d.name.toLowerCase(),
        lowerIngredient: d.activeIngredient.toLowerCase(),
      })),
    [drugs]
  );

  const filtered = useMemo(() => {
    const lowerQuery = query.toLowerCase();
    return searchableDrugs.filter(
      (d) =>
        !selectedSet.has(d.id) &&
        (d.lowerName.includes(lowerQuery) ||
          d.lowerIngredient.includes(lowerQuery))
    );
  }, [searchableDrugs, query, selectedSet]);

  const selectedDrugs = useMemo(
    () => drugs.filter((d) => selectedSet.has(d.id)),
    [drugs, selectedSet]
  );

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

  function addDrug(drugId: string) {
    onSelect([...selected, drugId]);
    setQuery("");
    setIsOpen(false);
  }

  function removeDrug(drugId: string) {
    onSelect(selected.filter((id) => id !== drugId));
  }

  return (
    <div ref={wrapperRef} className="w-full">
      {/* Selected drug chips */}
      {selectedDrugs.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {selectedDrugs.map((drug) => (
            <span
              key={drug.id}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium"
            >
              💊 {drug.name}
              <button
                onClick={() => removeDrug(drug.id)}
                className="ml-0.5 text-indigo-600 hover:text-indigo-900 font-bold text-base leading-none cursor-pointer"
                aria-label={`${drug.name} ilaçını kaldır`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="İlaç adı yazarak arayın..."
          className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-base focus:border-indigo-500 focus:outline-none transition-colors bg-white"
        />

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-4 py-3 text-sm text-slate-400">
                {query
                  ? "Eşleşen ilaç bulunamadı"
                  : "Tüm ilaçlar seçildi"}
              </div>
            ) : (
              filtered.map((drug) => (
                <button
                  key={drug.id}
                  onClick={() => addDrug(drug.id)}
                  className="w-full text-left px-4 py-3 hover:bg-indigo-50 transition-colors border-b border-slate-100 last:border-b-0 cursor-pointer"
                >
                  <div className="font-medium text-slate-800">{drug.name}</div>
                  <div className="text-xs text-slate-500">
                    {drug.activeIngredient} · {drug.category}
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
