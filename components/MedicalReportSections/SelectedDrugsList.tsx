import { Drug } from "@/lib/interactions";

interface SelectedDrugsListProps {
  selectedDrugs: Drug[];
}

export default function SelectedDrugsList({ selectedDrugs }: SelectedDrugsListProps) {
  return (
    <div className="mb-6 p-4 rounded-xl bg-slate-50 border border-slate-200">
      <h2 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-2">
        Değerlendirilen Sanal İlaç Kutusu İçeriği
      </h2>
      <div className="grid grid-cols-2 gap-3">
        {selectedDrugs.map((d) => (
          <div key={d.id} className="text-xs">
            <span className="font-bold text-slate-900">{d.name}</span>
            <span className="text-slate-600 block text-[11px] mt-0.5">{d.activeIngredient} ({d.category})</span>
          </div>
        ))}
      </div>
    </div>
  );
}
