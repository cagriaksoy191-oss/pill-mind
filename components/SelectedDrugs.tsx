import { Drug } from "@/lib/interactions";

interface SelectedDrugsProps {
  selectedDrugs: Drug[];
  onRemoveDrug: (drugId: string) => void;
}

export default function SelectedDrugs({ selectedDrugs, onRemoveDrug }: SelectedDrugsProps) {
  if (selectedDrugs.length === 0) return null;

  return (
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
            onClick={() => onRemoveDrug(drug.id)}
            className="ml-1 w-4 h-4 rounded-full flex items-center justify-center bg-indigo-200/60 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200 font-bold text-xs hover:bg-red-500 hover:text-white cursor-pointer transition-all duration-150"
            aria-label={`${drug.name} ilacını arama kutusundan kaldır`}
          >
            ✕
          </button>
        </span>
      ))}
    </div>
  );
}
