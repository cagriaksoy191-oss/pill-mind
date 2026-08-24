"use client";

import { User, SavedPillbox } from "@/hooks/useUserPanel";
import SavedPillboxesList from "./SavedPillboxesList";

interface UserDropdownProps {
  user: User;
  showDropdown: boolean;
  setShowDropdown: (show: boolean) => void;
  savedBoxes: SavedPillbox[];
  listBoxesLoading: boolean;
  onLoadPillbox: (drugIds: string[]) => void;
  onDeleteBox: (id: string) => void;
  onLogout: () => void;
}

export default function UserDropdown({
  user,
  showDropdown,
  setShowDropdown,
  savedBoxes,
  listBoxesLoading,
  onLoadPillbox,
  onDeleteBox,
  onLogout,
}: UserDropdownProps) {
  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 px-3.5 py-2 rounded-xl border border-white/5 hover:border-white/10 transition-all duration-200 cursor-pointer"
      >
        👤 {user.email.split("@")[0]}
        <span className="text-[10px] opacity-60">▼</span>
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-72 backdrop-blur-2xl bg-slate-900/95 border border-white/10 rounded-2xl p-4 shadow-2xl z-50 animate-slide-down">
          <div className="pb-3 border-b border-white/5">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Aktif Oturum</p>
            <p className="text-xs font-semibold text-white truncate mt-0.5">{user.email}</p>
          </div>

          <div className="py-3">
            <h4 className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">💾 Kayıtlı Kutularım</h4>
            <SavedPillboxesList
              savedBoxes={savedBoxes}
              listBoxesLoading={listBoxesLoading}
              onLoadPillbox={onLoadPillbox}
              onDeleteBox={onDeleteBox}
              onCloseDropdown={() => setShowDropdown(false)}
            />
          </div>

          <button
            onClick={onLogout}
            className="w-full mt-2 py-2 bg-red-500/10 hover:bg-red-500 text-red-300 hover:text-white font-bold text-xs rounded-xl border border-red-500/20 hover:border-red-500 transition-colors cursor-pointer"
          >
            🚪 Çıkış Yap
          </button>
        </div>
      )}
    </div>
  );
}
