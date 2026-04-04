import Link from "next/link";
import Disclaimer from "@/components/Disclaimer";

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Header */}
      <header className="w-full py-4 px-6 border-b border-slate-200/60 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
              P
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              PillMind
            </h1>
          </div>
          <p className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100 uppercase tracking-wider">
            Hackathon MVP
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center grow max-w-5xl mx-auto w-full px-6 pt-20 pb-24">
        {/* Hero Section */}
        <section className="text-center max-w-3xl mb-24">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-xs font-medium mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Klinik Kaynaklardan Derlenmiş Ön İzleme Verisi
          </div>
          
          <h2 className="text-5xl sm:text-6xl font-extrabold tracking-tight text-slate-900 mb-6 leading-[1.15]">
            İlaç Etkileşimlerinde <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-linear-to-r from-indigo-600 to-cyan-500">
              Yapay Zeka Destekli Analiz
            </span>
          </h2>
          
          <p className="text-lg text-slate-600 mb-10 px-4 leading-relaxed max-w-2xl mx-auto">
            Güvenilir klinik kaynaklardan derlenen demo verilerle ilaçlarınız arasındaki potansiyel etkileşimleri saniyeler içinde kontrol edin. Google Gemini desteğiyle tıbbi terminolojiyi daha anlaşılır bir dilde okuyun.
          </p>
          
          <Link
            href="/kontrol"
            className="inline-flex items-center justify-center px-8 py-4 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-500/25 ring-1 ring-inset ring-indigo-500/20 text-lg group"
          >
            İlaçları Kontrol Et
            <svg className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
          
          <p className="mt-5 text-sm text-slate-500 flex items-center justify-center gap-1.5 font-medium">
            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Kalıcı kullanıcı profili veya veri tabanı tutmuyoruz.
          </p>
        </section>

        {/* Features / Value Prop */}
        <section className="grid sm:grid-cols-3 gap-6 sm:gap-8 w-full mt-8">
          <FeatureCard
            icon="🛡️"
            title="Güvenilir Veri Seti"
            description="Etkileşim sonuçları FDA prospektüsleri ve halka açık klinik kaynaklardan derlenmiştir."
          />
          <FeatureCard
            icon="🧠"
            title="Gemini Açıklaması"
            description="Karmaşık tıbbi bildirimleri AI yardımıyla anlaşılır şekilde okuyun ve doktorunuza bilinçli danışın."
          />
          <FeatureCard
            icon="⚡"
            title="Anında Sonuçlar"
            description="Sadece ilaçlarınızı seçin ve saniyeler içinde etkileşim raporunuza ve AI açıklamalarına ulaşın."
          />
        </section>
      </main>

      <Disclaimer />
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
    <div className="bg-white p-8 rounded-2xl border border-slate-200/60 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-32 bg-linear-to-bl from-indigo-50/50 to-transparent rounded-full -mr-16 -mt-16 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative z-10">
        <div className="text-3xl mb-5 p-3 bg-slate-50 border border-slate-100 rounded-xl inline-block shadow-sm">
          {icon}
        </div>
        <h3 className="text-lg font-extrabold text-slate-800 mb-2">{title}</h3>
        <p className="text-slate-500 text-sm leading-relaxed font-medium">{description}</p>
      </div>
    </div>
  );
}
