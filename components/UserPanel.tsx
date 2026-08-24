"use client";

import AuthModal from "./AuthModal";
import SavePillboxModal from "./SavePillboxModal";
import UserDropdown from "./UserPanelSections/UserDropdown";
import { useUserPanel } from "@/hooks/useUserPanel";

interface UserPanelProps {
  selectedDrugIds: string[];
  onLoadPillbox: (drugIds: string[]) => void;
}

export default function UserPanel({
  selectedDrugIds,
  onLoadPillbox,
}: UserPanelProps) {
  const {
    user,
    setUser,
    loading,
    showModal,
    setShowModal,
    savedBoxes,
    listBoxesLoading,
    showSavePrompt,
    setShowSavePrompt,
    showDropdown,
    setShowDropdown,
    fetchSavedBoxes,
    handleLogout,
    handleDeleteBox,
  } = useUserPanel();

  if (loading) {
    return (
      <div className="w-6 h-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></div>
    );
  }

  return (
    <div className="relative font-sans">
      {/* GİRİŞ YAPILMAMIŞ DURUM */}
      {!user ? (
        <button
          onClick={() => setShowModal(true)}
          className="text-xs font-bold text-indigo-400 hover:text-white bg-indigo-500/10 hover:bg-indigo-600 px-4 py-2 rounded-xl border border-indigo-500/20 hover:border-indigo-500 transition-all duration-200 cursor-pointer"
        >
          🔐 Giriş Yap
        </button>
      ) : (
        /* GİRİŞ YAPILMIŞ DURUM */
        <div className="flex items-center gap-3">
          {/* Kutuyu Kaydet Butonu */}
          {selectedDrugIds.length > 0 && (
            <button
              onClick={() => setShowSavePrompt(true)}
              className="text-xs font-bold text-emerald-400 hover:text-white bg-emerald-500/10 hover:bg-emerald-600 px-3.5 py-2 rounded-xl border border-emerald-500/20 hover:border-emerald-500 transition-all duration-200 cursor-pointer"
            >
              💾 Kutuyu Kaydet
            </button>
          )}

          {/* Profil Butonu ve Dropdown */}
          <UserDropdown
            user={user}
            showDropdown={showDropdown}
            setShowDropdown={setShowDropdown}
            savedBoxes={savedBoxes}
            listBoxesLoading={listBoxesLoading}
            onLoadPillbox={onLoadPillbox}
            onDeleteBox={handleDeleteBox}
            onLogout={handleLogout}
          />
        </div>
      )}

      {/* GİRİŞ MODALI */}
      {showModal && (
        <AuthModal
          onClose={() => setShowModal(false)}
          onSuccess={(userData) => {
            setUser(userData);
            setShowModal(false);
            fetchSavedBoxes();
          }}
        />
      )}

      {/* KUTUYU BULUTA KAYDET MODALI */}
      {showSavePrompt && (
        <SavePillboxModal
          selectedDrugIds={selectedDrugIds}
          onClose={() => setShowSavePrompt(false)}
          onSuccess={() => {
            setShowSavePrompt(false);
            fetchSavedBoxes();
          }}
        />
      )}
    </div>
  );
}
