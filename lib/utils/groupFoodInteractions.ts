import type {FoodInteractionResult} from "@/lib/interactions/types";

/** Group repeated substances without removing any drug-specific warning. */
export function groupFoodInteractions(items: FoodInteractionResult[]) {
  const groups = new Map<string, FoodInteractionResult[]>();
  for (const item of items) {
    const key = `${item.kind ?? "interaction"}:${item.substance.trim().toLocaleLowerCase("tr-TR")}`;
    const group = groups.get(key) ?? [];
    group.push(item);
    groups.set(key, group);
  }
  return [...groups.values()].map(entries => ({
    substance: entries[0].substance,
    isUsage: entries[0].kind === "usage",
    isHigh: entries.some(entry => entry.severity === "high"),
    entries,
  }));
}
