"use client";

import { SharedData } from "./types";

interface SharePrintReportProps {
  data: SharedData | null;
}

export default function SharePrintReport({ data }: SharePrintReportProps) {
  return (
    <div className="hidden print:block w-full max-w-4xl mx-auto p-8 bg-white text-slate-950 font-sans">
      <div className="border-b-2 border-slate-900 pb-4 mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">💊 PillMind Klinik İlaç Etkileşim Raporu</h1>
          <p className="text-[11px] text-slate-500 mt-1">
            Oluşturulma Tarihi: {data ? new Date(data.createdAt).toLocaleDateString("tr-TR") : ""} | Güvenli Raporlama Sistemi v3.0
          </p>
        </div>
        <div className="text-right text-[9px] text-slate-400 font-mono tracking-wider">
          CONFIDENTIAL / CLINICAL ANALYSIS REPORT
        </div>
      </div>

      <div className="mb-6 p-4 rounded-xl bg-slate-50 border border-slate-200">
        <h2 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-2">
          Değerlendirilen Sanal İlaç Kutusu İçeriği
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {data?.drugs.map((d) => (
            <div key={d.id} className="text-xs">
              <span className="font-bold text-slate-900">{d.name}</span>
              <span className="text-slate-600 block text-[11px] mt-0.5">{d.activeIngredient} ({d.category})</span>
            </div>
          ))}
        </div>
      </div>

      {data?.accumulationWarnings && data.accumulationWarnings.length > 0 && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900">
          <h3 className="font-bold text-red-800 uppercase tracking-wider text-[10px] mb-2">
            🚨 Aşırı Doz / Farmakolojik Grup Çakışmaları
          </h3>
          <ul className="list-disc pl-4 flex flex-col gap-1.5 font-semibold">
            {data.accumulationWarnings.map((w, i) => (
              <li key={i}>{w.message}</li>
            ))}
          </ul>
        </div>
      )}

      {data?.foodInteractions && data.foodInteractions.length > 0 && (
        <div className="mb-6 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900">
          <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[10px] mb-2">
            🥗 Gıda ve Besin Etkileşim Raporu
          </h3>
          <ul className="list-disc pl-4 flex flex-col gap-1.5 font-medium">
            {data.foodInteractions.map((f, i) => (
              <li key={i}>
                <strong>{f.drugName} &amp; {f.substance}:</strong> {f.effect}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mb-6">
        <h2 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-3">
          Bulunan İlaç Etkileşimleri
        </h2>
        <table className="w-full text-left border-collapse border border-slate-300 text-[11px]">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-300 p-2 font-bold w-[25%]">İlaç Kombinasyonu</th>
              <th className="border border-slate-300 p-2 font-bold w-[20%]">Risk / Kanıt Seviyesi</th>
              <th className="border border-slate-300 p-2 font-bold w-[55%]">Klinik Mekanizma</th>
            </tr>
          </thead>
          <tbody>
            {data?.interactions.map((res, i) => (
              <tr key={i}>
                <td className="border border-slate-300 p-2 font-bold">{res.drug1Name} + {res.drug2Name}</td>
                <td className="border border-slate-300 p-2 uppercase font-semibold">{res.interaction.severity} Risk</td>
                <td className="border border-slate-300 p-2">{res.interaction.summary}</td>
              </tr>
            ))}
            {data?.interactions.length === 0 && (
              <tr>
                <td colSpan={3} className="border border-slate-300 p-4 text-center text-slate-500 italic">
                  Kutuda bulunan ilaçlar arasında bilinen bir klinik etkileşim bulunmamaktadır.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
