"use client";

import Link from "next/link";
import Disclaimer from "@/components/Disclaimer";

interface ShareErrorViewProps {
  statusCode: number;
}

export default function ShareErrorView({ statusCode }: ShareErrorViewProps) {
  const isExpired = statusCode === 410;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative overflow-hidden flex flex-col justify-between items-center py-20 px-6">
      <div className="absolute top-[20%] w-[30rem] h-[30rem] rounded-full bg-red-500/10 blur-[130px] pointer-events-none"></div>

      <div className="max-w-md w-full bg-white/5 border border-white/10 backdrop-blur-xl p-8 rounded-3xl text-center shadow-2xl relative z-10">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-3xl mx-auto mb-6">
          ⚠️
        </div>
        <h2 className="text-xl font-bold text-white mb-3">
          {isExpired ? "Bağlantı Süresi Dolmuş" : "Paylaşım Bulunamadı"}
        </h2>
        <p className="text-xs text-slate-400 leading-relaxed mb-8">
          {isExpired
            ? "Hekim güvenliği ve veri gizliliği (KVKK/GDPR) nedeniyle paylaşılan ilaç raporları 24 saat sonra otomatik olarak silinir."
            : "İstediğiniz güvenli rapor bağlantısı mevcut değil veya sistem yöneticisi tarafından kaldırılmış olabilir."}
        </p>
        <Link
          href="/kontrol"
          className="block w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition shadow-lg hover:shadow-indigo-500/20"
        >
          Yeni İlaç Kutusu Oluştur
        </Link>
      </div>

      <Disclaimer />
    </div>
  );
}
