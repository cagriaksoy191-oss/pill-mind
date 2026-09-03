import { useState, useEffect, useCallback } from "react";

interface SavedPillbox {
  id: string;
  name: string;
  drugIds: string[];
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
}

export function useUserPanel() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Saved pillboxes states
  const [savedBoxes, setSavedBoxes] = useState<SavedPillbox[]>([]);
  const [listBoxesLoading, setListBoxesLoading] = useState(false);
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Kayıtlı ilaç kutularını buluttan çek
  const fetchSavedBoxes = useCallback(async () => {
    setListBoxesLoading(true);
    try {
      const res = await fetch("/api/pillbox/list?limit=50");
      if (res.ok) {
        const data = await res.json();
        setSavedBoxes(data.pillboxes || []);
      }
    } catch (err) {
      console.error("[Pillbox List] Çekilirken hata:", err);
    } finally {
      setListBoxesLoading(false);
    }
  }, []);

  // Oturum durumunu sunucudan sorgula
  const checkSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated) {
          setUser(data.user);
          fetchSavedBoxes();
        }
      }
    } catch (err) {
      console.error("[PillMind Auth] Oturum kontrolü başarısız:", err);
    } finally {
      setLoading(false);
    }
  }, [fetchSavedBoxes]);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  // Çıkış Yap Akışı
  const handleLogout = async () => {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (res.ok) {
        setUser(null);
        setSavedBoxes([]);
        setShowDropdown(false);
      }
    } catch (err) {
      console.error("[Pillbox Logout] Hata:", err);
    }
  };

  // Kutu Silme Akışı
  const handleDeleteBox = async (id: string) => {
    if (!confirm("Bu kayıtlı ilaç kutusunu silmek istediğinize emin misiniz?")) return;

    try {
      const res = await fetch("/api/pillbox/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (res.ok) {
        fetchSavedBoxes();
      } else {
        const data = await res.json();
        alert(data.error || "Silinemedi.");
      }
    } catch (err) {
      console.error("[Pillbox Delete] Hata:", err);
      alert("İlaç kutusu silinirken bir hata oluştu.");
    }
  };

  return {
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
  };
}
