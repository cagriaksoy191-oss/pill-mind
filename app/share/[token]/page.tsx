"use client";

import { useEffect, useState, use } from "react";
import Disclaimer from "@/components/Disclaimer";
import ShareHeader from "@/components/ShareView/ShareHeader";
import ShareLoadingView from "@/components/ShareView/ShareLoadingView";
import ShareErrorView from "@/components/ShareView/ShareErrorView";
import ShareDrugsList from "@/components/ShareView/ShareDrugsList";
import ShareAccumulationWarnings from "@/components/ShareView/ShareAccumulationWarnings";
import ShareFoodInteractions from "@/components/ShareView/ShareFoodInteractions";
import ShareClinicalInteractions from "@/components/ShareView/ShareClinicalInteractions";
import SharePrintReport from "@/components/ShareView/SharePrintReport";
import { SharedData } from "@/components/ShareView/types";

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
    return <ShareLoadingView />;
  }

  // Handle errors (Expired or Not Found)
  if (error || statusCode !== 200) {
    return <ShareErrorView statusCode={statusCode} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30 selection:text-indigo-200 relative overflow-hidden flex flex-col justify-between">
      {/* Background Ambient Glows */}
      <div className="absolute top-[10%] left-[10%] w-[30rem] h-[30rem] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none print:hidden"></div>
      <div className="absolute bottom-[20%] right-[10%] w-[35rem] h-[35rem] rounded-full bg-purple-500/10 blur-[130px] pointer-events-none print:hidden"></div>

      {/* Header */}
      <ShareHeader onPrint={handlePrint} />

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
                <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">
                  Kalan Paylaşım Süresi
                </span>
                <p className="text-sm font-extrabold text-amber-400 font-mono mt-0.5">
                  ⏳ {timeLeft}
                </p>
              </div>
            )}
          </div>

          {/* Drugs List */}
          <ShareDrugsList drugs={data?.drugs} />

          {/* Risk Accumulation Warnings */}
          <ShareAccumulationWarnings warnings={data?.accumulationWarnings} />

          {/* Food/Nutrient Interactions */}
          <ShareFoodInteractions interactions={data?.foodInteractions} />

          {/* Clinical Interactions List */}
          <ShareClinicalInteractions interactions={data?.interactions} />
        </section>
      </main>

      {/* Print / PDF view (A4 Medical Template) */}
      <SharePrintReport data={data} />

      <Disclaimer />
    </div>
  );
}
