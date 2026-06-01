import { useState, useMemo } from "react";
import { fuzzySearchDrugs } from "@/lib/fuzzySearch";
import { Drug } from "@/lib/interactions";

export function useDrugSearch(drugs: Drug[], selected: string[]) {
  const [query, setQuery] = useState("");

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const availableDrugs = useMemo(
    () => drugs.filter((d) => !selectedSet.has(d.id)),
    [drugs, selectedSet]
  );

  const filtered = useMemo(() => {
    return query.trim()
      ? fuzzySearchDrugs(query, availableDrugs).map((r) => r.item)
      : availableDrugs;
  }, [query, availableDrugs]);

  return { query, setQuery, filtered, selectedSet };
}
