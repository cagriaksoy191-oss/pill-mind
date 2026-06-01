// app/global-error.tsx
"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="tr">
      <body className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
        {/* Arka Plan Işıma Efektleri */}
        <div className="absolute top-1/4 left-1/4 w-[30rem] h-[30rem] rounded-full bg-red-500/5 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />

        {/* Cam Kart Arayüzü */}
        <div
          className="backdrop-blur-xl bg-white/[0.03] border border-white/10 rounded-3xl p-8 sm:p-12 shadow-2xl max-w-lg w-full text-center relative z-10 overflow-hidden"
          style={{
            boxShadow:
              "0 20px 50px -15px rgba(239, 68, 68, 0.15), inset 0 1px 0 0 rgba(255, 255, 255, 0.05)",
          }}
        >
          {/* Glow Sınır Çizgisi */}
          <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-red-500/30 to-transparent" />
          </div>

          {/* Tıbbi Uyarı İkonu */}
          <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-4xl mx-auto mb-6 shadow-inner animate-pulse">
            🚨
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
            Kritik Sunucu <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-indigo-400">
              Arayüz Hatası
            </span>
          </h2>

          <p className="text-sm text-slate-400 mt-4 leading-relaxed">
            Sistemin kök katmanında (Root Layout) beklenmeyen bir uyuşmazlık
            saptandı. Sorun çözümü için Sentry üzerinden geliştirici ekibimiz
            bilgilendirilmiştir.
          </p>

          <div className="mt-6 bg-slate-900/50 rounded-xl p-4 border border-white/5 text-left text-xs font-mono text-slate-400 max-h-24 overflow-y-auto">
            <span className="text-red-400/80 font-bold block mb-1">
              Durum Kodu (Digest):
            </span>
            {error.digest || "Kök Katman Hatası"}
            <span className="text-slate-500 block mt-2">
              Detay: {error.message || "Root layout execution mismatch."}
            </span>
          </div>

          {/* Aksiyon Butonları */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => reset()}
              className="px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm rounded-xl shadow-lg hover:shadow-indigo-500/20 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
            >
              🔄 Sistemi Yeniden Yükle
            </button>
          </div>

          <div className="mt-6 text-[10px] text-slate-500 leading-relaxed font-medium">
            Tıbbi uyuşmazlık kontrollerinde hekim kararı her zaman önceliklidir.
          </div>
        </div>
      </body>
    </html>
  );
}
