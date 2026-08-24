import React from "react";

export function VirtualPillboxEmptyState() {
  return (
    <div
      className="flex flex-col items-center justify-center py-10 border border-dashed border-white/10 rounded-2xl bg-white/5 transition-all duration-300"
      style={{ transform: "translateZ(10px)" }}
    >
      <span className="text-4xl mb-3 animate-bounce">💊</span>
      <p className="text-slate-400 text-sm italic text-center px-4">
        Kutunuz şu an boş. Üst kısımdan ilaç arayıp ekleyerek anında tarama başlatabilirsiniz.
      </p>
    </div>
  );
}
