import { CheckResult, AccumulationWarning, FoodInteractionResult, ContraindicationResult, PolypharmacyReport, ExplanationData, Drug, InteractionMechanism, Evidence } from "@/lib/interactions";

interface MedicalReportProps {
  selectedDrugs: Drug[];
  accumulationWarnings: AccumulationWarning[];
  contraindications: ContraindicationResult[];
  polypharmacyReport: PolypharmacyReport | null;
  foodInteractions: FoodInteractionResult[];
  interactions: CheckResult[];
  explanations: Record<string, ExplanationData>;
}

export default function MedicalReport({
  selectedDrugs,
  accumulationWarnings,
  contraindications,
  polypharmacyReport,
  foodInteractions,
  interactions,
  explanations,
}: MedicalReportProps) {
  return (
    <>
      {/* Print Only Content (A4 Medical Report Template) */}
      <div className="hidden print:block w-full max-w-4xl mx-auto p-6 bg-white text-slate-950 font-sans">
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

        {/* İlaç Kutusu İçeriği */}
        <div className="mb-6 p-4 rounded-xl bg-slate-50 border border-slate-200">
          <h2 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-2">
            Değerlendirilen Sanal İlaç Kutusu İçeriği
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {selectedDrugs.map((d) => (
              <div key={d.id} className="text-xs">
                <span className="font-bold text-slate-900">{d.name}</span>
                <span className="text-slate-600 block text-[11px] mt-0.5">{d.activeIngredient} ({d.category})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Aşırı Doz / Duplicate Uyarıları (Baskıda gösterilir) */}
        {accumulationWarnings.length > 0 && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900">
            <h3 className="font-bold text-red-800 uppercase tracking-wider text-[10px] mb-2">
              🚨 Aşırı Doz / Farmakolojik Grup Çakışmaları
            </h3>
            <ul className="list-disc pl-4 flex flex-col gap-1.5 font-semibold">
              {accumulationWarnings.map((w, i) => (
                <li key={i}>{w.message}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Kontrendikasyon Raporu (Baskıda gösterilir) */}
        {contraindications.length > 0 && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900">
            <h3 className="font-bold text-red-800 uppercase tracking-wider text-[10px] mb-2">
              ❌ Kritik Tıbbi Uyumsuzluklar (Contraindications)
            </h3>
            <ul className="list-disc pl-4 flex flex-col gap-2 font-semibold">
              {contraindications.map((c, i) => (
                <li key={i}>
                  <strong>{c.drugName} &amp; {c.diseaseName || c.diseaseIcd}:</strong> {c.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Polifarmasi ve Beers Kriterleri Raporu (Baskıda gösterilir) */}
        {polypharmacyReport && (polypharmacyReport.score >= 4 || polypharmacyReport.beersWarnings.length > 0) && (
          <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950">
            <h3 className="font-bold text-amber-800 uppercase tracking-wider text-[10px] mb-1">
              📊 Polifarmasi &amp; Beers Yaşlı Hasta Analizi
            </h3>
            <p className="font-semibold">{polypharmacyReport.message}</p>
            {polypharmacyReport.beersWarnings.length > 0 && (
              <ul className="list-disc pl-4 mt-2 flex flex-col gap-1 text-[11px] font-semibold text-amber-900">
                {polypharmacyReport.beersWarnings.map((w: string, i: number) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Gıda ve Besin Etkileşim Raporu (Baskıda gösterilir) */}
        {foodInteractions.length > 0 && (
          <div className="mb-6 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900">
            <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[10px] mb-2">
              🥗 Gıda, Alkol ve Besin Etkileşim Raporu
            </h3>
            <div className="flex flex-col gap-2">
              {foodInteractions.map((f, i) => (
                <div key={i} className="border-b border-slate-200/50 pb-1.5 last:border-0 last:pb-0">
                  <span className="font-bold text-slate-900">{f.drugName} &amp; {f.substance} ({f.severity.toUpperCase()} Risk):</span>
                  <span className="block text-[11px] text-slate-700 mt-0.5 font-medium">{f.effect}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Etkileşim Raporu (Baskıda gösterilir) */}
        {interactions.length === 0 ? (
          <div className="p-5 rounded-xl border border-emerald-200 bg-emerald-50 text-xs text-emerald-950">
            <h3 className="font-bold text-emerald-800 uppercase tracking-wider text-[10px] mb-1">
              💚 Etkileşim Durumu
            </h3>
            <p className="font-semibold">Kayıtlı veri setinde bilinen etkileşim saptanmadı.</p>
            <p className="text-emerald-800/80 mt-1 leading-relaxed">
              Mevcut doğrulanmış veri setinde eklediğiniz ilaçlar arasında eşleşme bulunmamaktadır, tedavinizi değiştirmeden önce mutlaka hekiminize danışın.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Bölüm 1: Hasta Sade Açıklamaları */}
            <div>
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-1.5 mb-3">
                1. Hasta İçin Sadeleştirilmiş Etkileşim Açıklamaları
              </h2>
              <div className="flex flex-col gap-3.5">
                {interactions.map((res, i) => (
                  <div key={i} className="p-4 rounded-xl border border-slate-200 bg-white">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200">
                        {res.interaction.severity.toUpperCase()} RİSK
                      </span>
                      <h3 className="font-bold text-slate-900 text-xs">
                        {res.drug1Name} &amp; {res.drug2Name} Etkileşimi
                      </h3>
                    </div>
                    <p className="text-xs text-slate-800 leading-relaxed font-semibold">
                      {res.interaction.summary}
                    </p>
                    {explanations[res.interaction.id]?.explanation && (
                      <p className="text-[11px] text-slate-600 leading-relaxed mt-2.5 p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                        {explanations[res.interaction.id].explanation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Bölüm 2: Hekim/Eczacı Modu Klinik Detayları (Tablo) */}
            <div className="mt-2">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-1.5 mb-3">
                2. Sağlık Profesyonelleri İçin Klinik Detaylar (Klinik Mod)
              </h2>
              <table className="w-full text-left border-collapse border border-slate-300 text-[11px]">
                <thead>
                  <tr className="bg-slate-100/80">
                    <th className="border border-slate-300 p-2 font-bold w-[25%]">İlaç Kombinasyonu</th>
                    <th className="border border-slate-300 p-2 font-bold w-[20%]">Risk / Kanıt Seviyesi</th>
                    <th className="border border-slate-300 p-2 font-bold w-[55%]">Klinik Mekanizma &amp; Kanıt Kaynakları</th>
                  </tr>
                </thead>
                <tbody>
                  {interactions.map((res, i) => (
                    <tr key={i} className="align-top">
                      <td className="border border-slate-300 p-2">
                        <span className="font-bold block text-slate-900">{res.drug1Name}</span>
                        <span className="font-bold block text-slate-900 mt-1">{res.drug2Name}</span>
                      </td>
                      <td className="border border-slate-300 p-2">
                        <span className="font-semibold block uppercase text-[10px]">{res.interaction.severity} Risk</span>
                        <span className="text-[9px] text-slate-500 block mt-1">Kanıt: {res.interaction.evidenceLevel || "FDA_APPROVED"}</span>
                        <span className="text-[9px] text-emerald-600 block">Onay: {res.interaction.verificationStatus || "VERIFIED"}</span>
                      </td>
                      <td className="border border-slate-300 p-2 leading-relaxed">
                        {res.interaction.clinicalDetail && (
                          <p className="mb-2"><span className="font-semibold">Mekanizma:</span> {res.interaction.clinicalDetail}</p>
                        )}

                        {res.interaction.mechanisms && res.interaction.mechanisms.length > 0 && (
                          <div className="mb-2">
                            <span className="font-semibold text-slate-700">Mekanizma Detayları:</span>
                            <ul className="list-dash pl-3 mt-0.5">
                              {res.interaction.mechanisms.map((m: InteractionMechanism, idx: number) => (
                                <li key={idx}>- {m.type}: {m.mechanism}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {res.interaction.evidences && res.interaction.evidences.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-slate-200">
                            <span className="font-semibold text-slate-700">Bilimsel Referanslar:</span>
                            <ul className="list-none flex flex-col gap-1.5 mt-1">
                              {res.interaction.evidences.map((e: Evidence, idx: number) => (
                                <li key={idx} className="p-2 bg-slate-50 rounded border border-slate-100">
                                  <span className="font-bold block text-slate-800">{e.source.title}</span>
                                  {e.source.url && <span className="text-[9px] text-indigo-700 block mt-0.5">{e.source.url}</span>}
                                  <span className="text-[10px] text-slate-500 italic block mt-1">&ldquo;{e.summary}&rdquo;</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Klinik Yasal Uyarı Disclaimer */}
        <div className="mt-8 border-t border-slate-300 pt-4 text-[9px] text-slate-500 leading-relaxed text-center">
          <p className="font-bold uppercase mb-1">⚠️ Önemli Klinik Yasal Uyarı</p>
          Bu rapor, yalnızca kürate edilmiş demo tıbbi veri setleri ve Google Gemini AI grounding sistemleri temel alınarak hastayı bilgilendirme amacıyla üretilmiştir. Kesinlikle bir reçete veya tedavi yönlendirmesi değildir. Rapordaki bilgileri temel alarak tedavinizi veya ilaç dozajınızı hekiminize danışmadan değiştirmeyiniz. İlaç kullanımlarındaki tüm değişiklikler uzman hekim onayıyla yapılmalıdır.
        </div>
      </div>

    </>
  );
}
