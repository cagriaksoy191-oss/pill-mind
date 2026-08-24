"use client";

import { SavedPillbox } from "@/hooks/useUserPanel";

interface SavedPillboxesListProps {
  savedBoxes: SavedPillbox[];
  listBoxesLoading: boolean;
  onLoadPillbox: (drugIds: string[]) => void;
  onDeleteBox: (id: string) => void;
  onCloseDropdown: () => void;
}

export default function SavedPillboxesList({
  savedBoxes,
  listBoxesLoading,
  onLoadPillbox,
  onDeleteBox,
  onCloseDropdown,
}: SavedPillboxesListProps) {
  if (listBoxesLoading) {
    return <div className="py-3 text-center text-xs text-slate-500">Yükleniyor...</div>;
  }

  if (savedBoxes.length === 0) {
    return <p className="text-[11px] text-slate-500 italic py-2">Bulutta kayıtlı kutunuz bulunmuyor.</p>;
  }

  return (
    <ul className="space-y-2 max-h-48 overflow-y-auto pr-1">
      {savedBoxes.map((box) => (
        <li
          key={box.id}
          className="flex items-center justify-between p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-left"
        >
          <div className="min-w-0 flex-1 pr-2">
            <p className="text-xs font-bold text-white truncate">{box.name}</p>
            <p className="text-[9px] text-slate-400 mt-0.5">
              {box.drugIds.length} İlaç • {new Date(box.createdAt).toLocaleDateString("tr-TR")}
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => {
                onLoadPillbox(box.drugIds);
                onCloseDropdown();
              }}
              className="px-2 py-1 bg-indigo-500/20 hover:bg-indigo-500 text-indigo-300 hover:text-white font-bold text-[10px] rounded-lg transition-colors cursor-pointer"
            >
              Yükle
            </button>
            <button
              onClick={() => onDeleteBox(box.id)}
              className="p-1 text-slate-500 hover:text-red-400 text-xs transition-colors cursor-pointer"
              title="Sil"
            >
              ✕
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
