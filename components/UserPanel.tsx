// components/UserPanel.tsx
"use client";

import { useState, useEffect } from "react";

interface SavedPillbox {
  id: string;
  name: string;
  drugIds: string[];
  createdAt: string;
}

interface User {
  id: string;
  email: string;
}

interface UserPanelProps {
  selectedDrugIds: string[];
  onLoadPillbox: (drugIds: string[]) => void;
}

export default function UserPanel({
  selectedDrugIds,
  onLoadPillbox,
}: UserPanelProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Saved pillboxes states
  const [savedBoxes, setSavedBoxes] = useState<SavedPillbox[]>([]);
  const [listBoxesLoading, setListBoxesLoading] = useState(false);
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Oturum durumunu sunucudan sorgula
  const checkSession = async () => {
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
  };

  // Kayıtlı ilaç kutularını buluttan çek
  const fetchSavedBoxes = async () => {
    setListBoxesLoading(true);
    try {
      const res = await fetch("/api/pillbox/list");
      if (res.ok) {
        const data = await res.json();
        setSavedBoxes(data.pillboxes || []);
      }
    } catch (err) {
      console.error("[Pillbox List] Çekilirken hata:", err);
    } finally {
      setListBoxesLoading(false);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  // Giriş Yap / Kayıt Ol Akışı
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !emailInput.includes("@")) {
      setErrorMsg("Lütfen geçerli bir e-posta adresi girin.");
      return;
    }

    setAuthLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailInput }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Giriş başarısız.");
      }

      setUser(data.user);
      setShowModal(false);
      setEmailInput("");
      fetchSavedBoxes();
    } catch (err: any) {
      setErrorMsg(err.message || "Giriş yaparken bir hata oluştu.");
    } finally {
      setAuthLoading(false);
    }
  };

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

  // Kutu Kaydetme Akışı
  const handleSavePillbox = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saveName.trim()) return;

    setSaveLoading(true);
    try {
      const res = await fetch("/api/pillbox/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: saveName, drugIds: selectedDrugIds }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Kaydedilemedi.");
      }

      setSaveName("");
      setShowSavePrompt(false);
      fetchSavedBoxes();
    } catch (err: any) {
      alert(err.message || "Kutu kaydedilirken bir hata oluştu.");
    } finally {
      setSaveLoading(false);
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
    }
  };

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

                  {listBoxesLoading ? (
                    <div className="py-3 text-center text-xs text-slate-500">Yükleniyor...</div>
                  ) : savedBoxes.length === 0 ? (
                    <p className="text-[11px] text-slate-500 italic py-2">Bulutta kayıtlı kutunuz bulunmuyor.</p>
                  ) : (
                    <ul className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {savedBoxes.map((box) => (
                        <li
                          key={box.id}
                          className="flex items-center justify-between p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-left"
                        >
                          <div className="min-w-0 flex-1 pr-2">
                            <p className="text-xs font-bold text-white truncate">{box.name}</p>
                            <p className="text-[9px] text-slate-400 mt-0.5">{box.drugIds.length} İlaç • {new Date(box.createdAt).toLocaleDateString("tr-TR")}</p>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => {
                                onLoadPillbox(box.drugIds);
                                setShowDropdown(false);
                              }}
                              className="px-2 py-1 bg-indigo-500/20 hover:bg-indigo-500 text-indigo-300 hover:text-white font-bold text-[10px] rounded-lg transition-colors cursor-pointer"
                            >
                              Yükle
                            </button>
                            <button
                              onClick={() => handleDeleteBox(box.id)}
                              className="p-1 text-slate-500 hover:text-red-400 text-xs transition-colors cursor-pointer"
                              title="Sil"
                            >
                              ✕
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <button
                  onClick={handleLogout}
                  className="w-full mt-2 py-2 bg-red-500/10 hover:bg-red-500 text-red-300 hover:text-white font-bold text-xs rounded-xl border border-red-500/20 hover:border-red-500 transition-colors cursor-pointer"
                >
                  🚪 Çıkış Yap
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* GİRİŞ MODALI */}
      {showModal && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="backdrop-blur-2xl bg-slate-900/90 border border-white/10 p-6 sm:p-8 rounded-3xl w-full max-w-md shadow-2xl relative">
            <button
              onClick={() => {
                setShowModal(false);
                setErrorMsg(null);
                setEmailInput("");
              }}
              className="absolute top-4 right-4 w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white text-xs cursor-pointer transition-colors"
            >
              ✕
            </button>

            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-2xl mx-auto mb-3 shadow-inner">
                🩺
              </div>
              <h3 className="text-xl font-extrabold text-white">PillMind Hesabınıza Giriş Yapın</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                İlaç kutularınızı buluta kaydetmek ve dilediğiniz an erişmek için e-posta adresinizle anında şifresiz giriş yapın.
              </p>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">E-POSTA ADRESİ</label>
                <input
                  type="email"
                  placeholder="isim@örnek.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium text-sm"
                  required
                />
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-300 font-medium">
                  ⚠️ {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm rounded-xl shadow-lg hover:shadow-indigo-500/20 transition-all duration-200 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {authLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  "Giriş Yap / Kaydol"
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* KUTUYU BULUTA KAYDET MODALI */}
      {showSavePrompt && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="backdrop-blur-2xl bg-slate-900/90 border border-white/10 p-6 sm:p-8 rounded-3xl w-full max-w-md shadow-2xl relative">
            <button
              onClick={() => {
                setShowSavePrompt(false);
                setSaveName("");
              }}
              className="absolute top-4 right-4 w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white text-xs cursor-pointer transition-colors"
            >
              ✕
            </button>

            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-2xl mx-auto mb-3 shadow-inner">
                💾
              </div>
              <h3 className="text-xl font-extrabold text-white">İlaç Kutunuzu Kaydedin</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Şu an sanal kutunuzda bulunan {selectedDrugIds.length} ilacı daha sonra kolayca yüklemek için isimlendirip buluta kaydedin.
              </p>
            </div>

            <form onSubmit={handleSavePillbox} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">KUTU ADI / ETİKETİ</label>
                <input
                  type="text"
                  placeholder="Örn: Sabah İlaçlarım, Tansiyon Tedavim"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium text-sm"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={saveLoading}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm rounded-xl shadow-lg hover:shadow-emerald-500/20 transition-all duration-200 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saveLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  "Buluta Kaydet"
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
