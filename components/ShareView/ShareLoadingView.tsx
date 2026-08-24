"use client";

export default function ShareLoadingView() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center font-sans">
      <div className="relative flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        <span className="absolute text-xs font-bold text-indigo-400">P</span>
      </div>
      <p className="mt-4 text-xs font-semibold text-slate-400 tracking-wider">
        Güvenli Klinik Rapor Yükleniyor...
      </p>
    </div>
  );
}
