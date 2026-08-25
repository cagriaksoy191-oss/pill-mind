import { CheckResult } from "@/lib/interactions";
import { getDrugSeverityGlow } from "@/lib/pillboxUtils";
import { VirtualPillboxDrugCard } from "./VirtualPillboxDrugCard";

export interface Drug {
  id: string;
  name: string;
  activeIngredient: string;
  category: string;
}

interface VirtualPillboxGridProps {
  selectedDrugs: Drug[];
  newlyAddedId: string | null;
  interactions: CheckResult[];
  onRemove: (id: string) => void;
}

export function VirtualPillboxGrid({
  selectedDrugs,
  newlyAddedId,
  interactions,
  onRemove,
}: VirtualPillboxGridProps) {
  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 gap-4"
      style={{ transform: "translateZ(15px)" }}
    >
      {selectedDrugs.map((drug) => (
        <VirtualPillboxDrugCard
          key={drug.id}
          drug={drug}
          isNew={drug.id === newlyAddedId}
          severityGlow={getDrugSeverityGlow(drug.id, interactions)}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}
