"use client";

import Link from "next/link";
import Disclaimer from "@/components/Disclaimer";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30 selection:text-indigo-200 relative overflow-hidden flex flex-col justify-between">
      {/* Background Floating Radiant Glows */}
      <div className="absolute top-[15%] left-[20%] w-[35rem] h-[35rem] rounded-full bg-indigo-500/10 blur-[130px] pointer-events-none animate-pulse-slow"></div>
      <div className="absolute bottom-[10%] right-[15%] w-[40rem] h-[40rem] rounded-full bg-purple-500/10 blur-[140px] pointer-events-none animate-pulse-slow"></div>
      <div className="absolute top-[50%] left-[40%] w-[25rem] h-[25rem] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none"></div>

      {/* Floating Header */}
      <header className="w-full py-4 px-6 border-b border-white/5 bg-slate-950/40 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
              P
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              PillMind
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/kontrol"
              className="text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-xl transition-all duration-200 shadow-md hover:shadow-indigo-500/20"
            >
              Giriş Yap
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center max-w-5xl mx-auto w-full px-6 pt-16 pb-24 relative z-10">

        {/* Hero Section */}
        <section className="text-center max-w-3xl mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-slate-300 text-xs font-semibold mb-8 animate-fade-in">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            Güvenilir Klinik Kaynaklı Otomatik Tarama
          </div>

          <h2 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-6 leading-[1.15] animate-slide-up">
            İlaç Etkileşimlerinde <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-emerald-400">
              Yapay Zeka Destekli Klinik Analiz
            </span>
          </h2>

          <p className="text-sm sm:text-lg text-slate-400 mb-10 px-4 leading-relaxed max-w-2xl mx-auto font-medium">
            Güvenilir klinik veritabanları temelinde ilaçlarınız arasındaki potansiyel etkileşimleri saniyeler içinde tarayın. Google Gemini Canlı AI desteğiyle karmaşık tıbbi terminolojiyi en anlaşılır ve sade Türkçe ile okuyun.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/kontrol"
              className="inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-2xl hover:from-indigo-500 hover:to-purple-500 transition-all duration-200 shadow-xl hover:shadow-indigo-500/25 ring-1 ring-inset ring-indigo-500/20 text-base sm:text-lg group w-full sm:w-auto"
            >
              Hemen İlaçları Kontrol Et
              <svg className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </div>

          <p className="mt-5 text-xs text-slate-500 flex items-center justify-center gap-1.5 font-semibold">
            <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Kalıcı hasta profili veya arama geçmişi tutmuyoruz. Verileriniz tamamen güvendedir.
          </p>
        </section>

        {/* Features / Value Prop */}
        <section className="grid sm:grid-cols-3 gap-6 w-full mt-4">
          <FeatureCard
            icon="🛡️"
            title="Deterministik Klinik Çekirdek"
            description="Tüm etkileşim verileri FDA prospektüsleri ve bilimsel farmakoloji veri tabanlarından alınarak doğrulanır."
          />
          <FeatureCard
            icon="🧠"
            title="Çift Ajanlı Canlı AI"
            description="Karmaşık bildirimleri tıbbi olarak onaylanmış, sade ve şefkatli bir Türkçe ile okuyun ve hekiminize bilinçli danışın."
          />
          <FeatureCard
            icon="⚡"
            title="Sanal İlaç Kutusu (3D)"
            description="İlaçlarınızı şık 3D animasyonlu kutunuza sürükleyin, hatalı veya Türkçe karakter eksik yazımlarda bile anında eşleşme yakalayın."
          />
        </section>
      </main>

      <Disclaimer />

      {/* Global CSS for page transitions */}
      <style jsx global>{`
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.8; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.02); }
        }
        .animate-pulse-slow {
          animation: pulse-slow 10s infinite ease-in-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fadeIn 0.4s ease-out forwards;
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="backdrop-blur-xl bg-white/5 border border-white/10 p-8 rounded-3xl shadow-lg hover:shadow-indigo-500/5 hover:border-indigo-500/30 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-32 bg-linear-to-bl from-indigo-500/5 to-transparent rounded-full -mr-16 -mt-16 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative z-10">
        <div className="text-3xl mb-5 p-3 bg-white/5 border border-white/10 rounded-xl inline-block shadow-inner group-hover:scale-110 transition-transform duration-300">
          {icon}
        </div>
        <h3 className="text-lg font-bold text-white mb-2 tracking-tight">{title}</h3>
        <p className="text-slate-400 text-sm leading-relaxed font-medium">{description}</p>
      </div>
    </div>
  );
}
