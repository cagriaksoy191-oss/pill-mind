import Link from "next/link";

export default function HeroSection() {
  return (
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
  );
}
