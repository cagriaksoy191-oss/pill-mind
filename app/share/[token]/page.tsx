// app/share/[token]/page.tsx
"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import Disclaimer from "@/components/Disclaimer";

interface Drug {
  id: string;
  name: string;
  activeIngredient: string;
  category: string;
  pharmacologicalGroup?: string;
}

interface Interaction {
  id: string;
  drug1: string;
  drug2: string;
  severity: "high" | "medium" | "low";
  summary: string;
  source: string;
  sourceLabel?: string;
  verificationStatus?: string;
  evidenceLevel?: string;
  clinicalDetail?: string;
  evidences?: unknown[];
  mechanisms?: { type: string; mechanism: string; pharmacokinetic?: boolean; pharmacodynamic?: boolean; }[];
}

interface CheckResult {
  interaction: Interaction;
  drug1Name: string;
  drug2Name: string;
}

interface AccumulationWarning {
  type: "active_ingredient" | "pharmacological_group";
  severity: "high" | "medium";
  message: string;
  triggerDrugs: string[];
  detail?: string;
}

interface FoodInteraction {
  id: string;
  drugId: string;
  drugName: string;
  substance: string;
  effect: string;
  severity: "high" | "medium" | "low";
}

interface SharedData {
  success: boolean;
  token: string;
  drugIds: string[];
  drugs: Drug[];
  interactions: CheckResult[];
  accumulationWarnings: AccumulationWarning[];
  foodInteractions: FoodInteraction[];
  contraindications: unknown[];
  createdAt: string;
  expiresAt: string;
}

export default function ShareViewPage({
  params: paramsPromise,
}: {
  params: Promise<{ token: string }>;
}) {
  const params = use(paramsPromise);
  const token = params?.token;

  const [data, setData] = useState<SharedData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusCode, setStatusCode] = useState<number>(200);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    if (!token) return;

    fetch(`/api/pillbox/share/${token}`)
      .then(async (res) => {
        setStatusCode(res.status);
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || "Rapor yüklenirken bir hata oluştu.");
        }
        setData(json);
        setError(null);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  // Expiry timer countdown
  useEffect(() => {
    if (!data?.expiresAt) return;

    const interval = setInterval(() => {
      const difference = new Date(data.expiresAt).getTime() - Date.now();
      if (difference <= 0) {
        setTimeLeft("Süre Doldu");
        setError("Bu paylaşım bağlantısının süresi dolmuş.");
        setStatusCode(410);
        clearInterval(interval);
      } else {
        const hours = Math.floor(difference / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        setTimeLeft(`${hours}s ${minutes}d ${seconds}sn`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [data]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
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

  // Handle errors (Expired or Not Found)
  if (error || statusCode !== 200) {
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30 selection:text-indigo-200 relative overflow-hidden flex flex-col justify-between">
      {/* Background Ambient Glows */}
      <div className="absolute top-[10%] left-[10%] w-[30rem] h-[30rem] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none print:hidden"></div>
      <div className="absolute bottom-[20%] right-[10%] w-[35rem] h-[35rem] rounded-full bg-purple-500/10 blur-[130px] pointer-events-none print:hidden"></div>

      {/* Header */}
      <header className="w-full py-4 px-6 border-b border-white/5 bg-slate-950/40 backdrop-blur-md sticky top-0 z-50 print:hidden">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
              P
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              PillMind <span className="text-[10px] text-indigo-400 font-semibold px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 ml-1.5 uppercase">Salt Okunur</span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handlePrint}
              className="text-xs font-bold text-white bg-white/5 border border-white/10 hover:bg-white/10 px-4 py-2 rounded-xl transition"
            >
              Yazdır / PDF
            </button>
            <Link
              href="/"
              className="text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-xl transition shadow-lg hover:shadow-indigo-500/20"
            >
              Kendi Kunu Kontrol Et
            </Link>
          </div>
        </div>
      </header>

      {/* Screen View */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-12 relative z-10 print:hidden">
        {/* Title / Summary Info Card */}
        <section className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-6 mb-6">
            <div>
              <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                Güvenli Paylaşılan Klinik Rapor
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-2">
                İlaç Kutusu Klinik Analiz Raporu
              </h2>
            </div>
            {timeLeft && (
              <div className="text-right">
                <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Kalan Paylaşım Süresi</span>
                <p className="text-sm font-extrabold text-amber-400 font-mono mt-0.5">
                  ⏳ {timeLeft}
                </p>
              </div>
            )}
          </div>

          {/* Drugs List */}
          <div className="mb-8">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
              Kutudaki İlaçlar ({data?.drugs.length || 0})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {data?.drugs.map((d) => (
                <div key={d.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition">
                  <h4 className="font-extrabold text-white text-sm">{d.name}</h4>
                  <p className="text-xs text-slate-400 mt-1 font-semibold">
                    Etken Madde: <span className="text-indigo-300">{d.activeIngredient}</span>
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-wide">
                    {d.category} {d.pharmacologicalGroup ? `| ${d.pharmacologicalGroup}` : ""}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Risk Accumulation Warnings */}
          {data?.accumulationWarnings && data.accumulationWarnings.length > 0 && (
            <div className="mb-6 p-5 rounded-2xl bg-red-950/20 border border-red-500/20 text-red-200">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-red-400 mb-3 flex items-center gap-1.5">
                🚨 Doz Aşımı / Grup Birikim Uyarıları
              </h4>
              <ul className="list-disc pl-5 text-xs flex flex-col gap-2 font-medium">
                {data.accumulationWarnings.map((w, i) => (
                  <li key={i}>
                    <strong>{w.message}</strong>
                    {w.detail && <span className="block text-[11px] text-slate-400 mt-0.5">{w.detail}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Food/Nutrient Interactions */}
          {data?.foodInteractions && data.foodInteractions.length > 0 && (
            <div className="mb-6 p-5 rounded-2xl bg-slate-900/50 border border-white/10">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-1.5">
                🥗 Gıda &amp; Besin Etkileşimleri
              </h4>
              <div className="flex flex-col gap-3">
                {data.foodInteractions.map((f, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-white/5 border border-white/5 text-xs">
                    <p className="font-bold text-white">
                      {f.drugName} &amp; <span className="text-amber-300">{f.substance}</span>
                    </p>
                    <p className="text-slate-300 mt-1 text-[11px] leading-relaxed">
                      {f.effect}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Clinical Interactions List */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
              Klinik Etkileşim Bulguları ({data?.interactions.length || 0})
            </h3>

            {data?.interactions && data.interactions.length === 0 ? (
              <div className="p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 text-emerald-300 flex items-start gap-3">
                <span className="text-xl">💚</span>
                <div>
                  <h5 className="font-bold text-white text-sm">Bilinen Etkileşim Saptanmadı</h5>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Kutuda bulunan ilaçlar arasında veri tabanımızda kayıtlı herhangi bir etkileşim bulunmamaktadır.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {data?.interactions.map((res, idx) => {
                  const isHigh = res.interaction.severity === "high";
                  const isMedium = res.interaction.severity === "medium";
                  const badgeColor = isHigh
                    ? "bg-red-500/20 text-red-300 border border-red-500/30"
                    : isMedium
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    : "bg-green-500/20 text-green-300 border border-green-500/30";

                  return (
                    <div key={idx} className="p-5 rounded-2xl bg-white/5 border border-white/5 flex flex-col gap-3">
                      <div className="flex justify-between items-center border-b border-white/5 pb-3">
                        <h4 className="font-bold text-white text-sm">
                          {res.drug1Name} + {res.drug2Name}
                        </h4>
                        <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${badgeColor}`}>
                          {res.interaction.severity.toUpperCase()} Risk
                        </span>
                      </div>
                      <p className="text-xs text-slate-200 leading-relaxed font-semibold">
                        {res.interaction.summary}
                      </p>
                      {res.interaction.clinicalDetail && (
                        <p className="text-[11px] text-slate-400 bg-black/25 p-3 rounded-lg border border-white/5 mt-1">
                          <strong>Klinik Detay:</strong> {res.interaction.clinicalDetail}
                        </p>
                      )}
                      <p className="text-[9px] text-slate-500 flex items-center gap-1 mt-1 font-semibold">
                        📖 Kaynak: {res.interaction.sourceLabel || res.interaction.source}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Print / PDF view (A4 Medical Template) */}
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

      <Disclaimer />
    </div>
  );
}
