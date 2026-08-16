export default function ReportHeader() {
  return (
    <div className="border-b-2 border-slate-900 pb-4 mb-6 flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-black tracking-tight">💊 PillMind Klinik İlaç Etkileşim Raporu</h1>
        <p className="text-[11px] text-slate-500 mt-1">
          Oluşturulma Tarihi: {new Date().toLocaleDateString("tr-TR")} | Güvenli Raporlama Sistemi v3.0
        </p>
      </div>
      <div className="text-right text-[9px] text-slate-400 font-mono tracking-wider">
        CONFIDENTIAL / CLINICAL ANALYSIS REPORT
      </div>
    </div>
  );
}
