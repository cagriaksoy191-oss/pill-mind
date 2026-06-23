"use client";

import { useState } from "react";

interface SavePillboxModalProps {
  selectedDrugIds: string[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function SavePillboxModal({ selectedDrugIds, onClose, onSuccess }: SavePillboxModalProps) {
  const [saveName, setSaveName] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);

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

      onSuccess();
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Kutu kaydedilirken bir hata oluştu.";
      alert(errMsg);
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 backdrop-blur-md bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="backdrop-blur-2xl bg-slate-900/90 border border-white/10 p-6 sm:p-8 rounded-3xl w-full max-w-md shadow-2xl relative">
        <button
          onClick={onClose}
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
  );
}
