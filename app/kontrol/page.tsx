"use client";

import { useState } from "react";
import { useInteractions } from "@/hooks/useInteractions";
import { getAllDrugs, Drug } from "@/lib/interactions";
import DrugSelector from "@/components/DrugSelector";
import VirtualPillbox from "@/components/VirtualPillbox";
import Disclaimer from "@/components/Disclaimer";
import StatusHeader from "@/components/StatusHeader";
import InteractionList from "@/components/InteractionList";
import CoveragePanel from "@/components/CoveragePanel";
import PatientProfileBar, { PatientContext } from "@/components/PatientProfileBar";

export default function KontrolPage() {
  const [drugs] = useState<Drug[]>(() => getAllDrugs());
  const [selectedDrugIds, setSelectedDrugIds] = useState<string[]>([]);
  const [patientContext, setPatientContext] = useState<PatientContext>({
    isPregnant: false,
    isBreastfeeding: false,
    ageGroup: "adult",
    renalRisk: false,
    hepaticRisk: false,
    diseases: []
  });

  const {
    interactions,
    setInteractions,
    accumulationWarnings,
    foodInteractions,
    contraindications,
    polypharmacyReport,
    isChecking,
    checkingError,
    explanations,
    loadingExplanations,
    coverageExplanation,
    setCoverageExplanation,
    isCoverageLoading,
    showCoveragePanel,
    setShowCoveragePanel,
    isOffline,
    handleExplainRequested,
    handleRequestCoverageExplanation,
  } = useInteractions(selectedDrugIds, patientContext);

  // Convert selected drug IDs to complete Drug object array
  const selectedDrugs = drugs.filter((d) => selectedDrugIds.includes(d.id));





  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 font-sans selection:bg-indigo-500/30 selection:text-indigo-200 relative overflow-hidden flex flex-col justify-between">
      {/* Background Ambient Glows */}
      <div className="absolute top-[10%] left-[10%] w-[30rem] h-[30rem] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none animate-pulse-slow"></div>
      <div className="absolute bottom-[20%] right-[10%] w-[35rem] h-[35rem] rounded-full bg-purple-500/10 blur-[130px] pointer-events-none animate-pulse-slow"></div>
      <div className="absolute top-[40%] right-[20%] w-[25rem] h-[25rem] rounded-full bg-emerald-500/5 blur-[100px] pointer-events-none"></div>

      <StatusHeader
        selectedDrugIds={selectedDrugIds}
        isChecking={isChecking}
        interactions={interactions}
        onLoadPillbox={setSelectedDrugIds}
        isOffline={isOffline}
      />

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
                              {res.interaction.mechanisms.map((m: any, idx: number) => (
                                <li key={idx}>- {m.type}: {m.mechanism}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {res.interaction.evidences && res.interaction.evidences.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-slate-200">
                            <span className="font-semibold text-slate-700">Bilimsel Referanslar:</span>
                            <ul className="list-none flex flex-col gap-1.5 mt-1">
                              {res.interaction.evidences.map((e: any, idx: number) => (
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

      {/* Main Workspace */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 pt-10 pb-16 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 print:hidden">

        {/* Left Side: Interaksiyon Arama ve Kutu Yönetimi */}
        <section className="lg:col-span-7 flex flex-col gap-6" aria-label="İlaç Seçim ve Ekleme Paneli">
          <div className="backdrop-blur-xl bg-white/40 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-20 group">
            <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
              <div className="absolute top-0 right-0 p-32 bg-gradient-to-bl from-indigo-500/10 to-transparent rounded-full -mr-20 -mt-20" />
            </div>

            <div className="relative z-10">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-950 dark:text-white tracking-tight leading-tight">
                İlaç Etkileşim <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-cyan-500 dark:from-indigo-400 dark:to-cyan-400">
                  Canlı Tarama Paneli
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed max-w-lg">
                Fuzzy Search teknolojisi ile Türkçe karakter veya yazım hatası fark etmeksizin ilaçlarınızı arayın, sanal kutunuza ekleyerek etkileşimleri anında denetleyin.
              </p>

              <div className="mt-8">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2.5">
                  🔍 İlaç Arama ve Giriş Alanı
                </label>
                <DrugSelector
                  drugs={drugs}
                  selected={selectedDrugIds}
                  onSelect={setSelectedDrugIds}
                />
                {isOffline && (
                  <p className="mt-3 text-xs text-amber-600 dark:text-amber-400 font-semibold bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 leading-relaxed animate-slide-down">
                    ⚠️ Yerel koruma aktif. Canlı AI açıklaması çevrimdışı kullanılamaz; temel tarama yapılır. Veri snapshot tarihi: 2026.06.26
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Patient Risk Profile Bar */}
          <PatientProfileBar context={patientContext} onChange={setPatientContext} />

          {/* 3D Virtual Pillbox Container */}
          <div className="w-full relative z-10">
            <VirtualPillbox
              selectedDrugs={selectedDrugs}
              onRemove={(id) => setSelectedDrugIds((prev) => prev.filter((x) => x !== id))}
              interactions={interactions}
              accumulationWarnings={accumulationWarnings}
            />
          </div>
        </section>

        {/* Right Side: Raporlar ve Klinik Analiz Sonuçları */}
        <section className="lg:col-span-5 flex flex-col gap-6" aria-label="Klinik Tarama Raporları">

          {/* Header for Results */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
              📊 Tarama Raporları
              {selectedDrugIds.length >= 2 && !isChecking && (
                <span className="text-xs px-2 py-0.5 rounded-md bg-slate-200/50 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-500 dark:text-slate-400">
                  {interactions.length} Etkileşim
                </span>
              )}
            </h3>

            {/* Print and Clear Buttons */}
            <div className="flex items-center gap-2 print:hidden">
              {selectedDrugIds.length >= 2 && !isChecking && (
                <button
                  onClick={() => window.print()}
                  className="text-xs font-bold text-indigo-500 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-500/20 transition-all cursor-pointer flex items-center gap-1"
                >
                  <span>🖨️</span> PDF İndir
                </button>
              )}
              {selectedDrugIds.length > 0 && (
                <button
                  onClick={() => {
                    setSelectedDrugIds([]);
                    setInteractions([]);
                    setCoverageExplanation(null);
                    setShowCoveragePanel(false);
                  }}
                  className="text-xs font-bold text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-500/10 px-3 py-1.5 rounded-lg border border-transparent hover:border-red-500/20 transition-all cursor-pointer"
                >
                  Kutuyu Sıfırla
                </button>
              )}
            </div>
          </div>

          {/* Results State Machine */}
          <div className="flex-1 flex flex-col gap-4">
            {selectedDrugIds.length < 2 ? (
              // Welcome / Instruction State
              <div className="backdrop-blur-md bg-white/40 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 rounded-3xl p-8 text-center flex flex-col items-center justify-center py-20 shadow-lg min-h-[350px]">
                <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-3xl mb-4 animate-pulse-slow">
                  🩺
                </div>
                <h4 className="font-bold text-slate-800 dark:text-white text-base">Tarama Başlatmak İçin İlaç Ekleyin</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mt-2 leading-relaxed">
                  İlaç-ilaç etkileşim denetimini başlatmak için sol panelden en az iki ilaç aratıp Sanal İlaç Kutusu&apos;na eklemeniz gerekmektedir.
                </p>
                <div className="mt-6 flex flex-wrap gap-2 justify-center">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 px-2.5 py-1 rounded-md">
                    Levenshtein Fuzzy Match
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 px-2.5 py-1 rounded-md">
                    Deterministik DB Sorgusu
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 px-2.5 py-1 rounded-md">
                    Gemini Canlı AI
                  </span>
                </div>
              </div>
            ) : isChecking ? (
              // Loading Shimmer State
              <div className="flex flex-col gap-4">
                {[1, 2].map((i) => (
                  <div key={i} className="bg-white/5 border border-white/5 rounded-2xl p-5 animate-pulse flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-slate-800 rounded-full"></div>
                      <div className="w-24 h-4 bg-slate-800 rounded"></div>
                    </div>
                    <div className="w-3/4 h-6 bg-slate-800 rounded mt-1"></div>
                    <div className="w-full h-4 bg-slate-800 rounded mt-2"></div>
                    <div className="w-5/6 h-4 bg-slate-800 rounded"></div>
                  </div>
                ))}
              </div>
            ) : checkingError ? (
              // API Error State
              <div className="backdrop-blur-md bg-red-500/5 border border-red-500/20 rounded-3xl p-6 text-center">
                <span className="text-3xl mb-3 inline-block">⚠️</span>
                <h4 className="font-bold text-red-200 text-sm">Klinik Servis Bağlantı Hatası</h4>
                <p className="text-xs text-red-400/80 mt-1 max-w-sm mx-auto leading-relaxed">
                  {checkingError}
                </p>
                <button
                  onClick={() => setSelectedDrugIds([...selectedDrugIds])}
                  className="mt-4 px-4 py-2 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Yeniden Dene
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {/* 1. Contraindications (Tıbbi Uyumsuzluk) Uyarıları */}
                {contraindications.length > 0 && (
                  <div className="flex flex-col gap-3 mb-2 animate-slide-down">
                    {contraindications.map((contra, idx) => (
                      <div
                        key={idx}
                        className="backdrop-blur-xl border border-red-500/30 bg-red-500/10 text-red-200 rounded-2xl p-4 shadow-lg flex gap-3 items-start"
                      >
                        <span className="text-xl shrink-0 mt-0.5">❌</span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="font-extrabold text-[10px] uppercase tracking-wider text-white">
                              Tıbbi Uyumsuzluk (Kontrendikasyon)
                            </h4>
                            <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 shrink-0">
                              Kritik Uyarısı
                            </span>
                          </div>
                          <p className="text-xs font-bold mt-1.5 text-white">
                            {contra.drugName} &amp; {contra.diseaseName || contra.diseaseIcd || "Klinik Profil"} Uyuşmazlığı
                          </p>
                          <p className="text-xs mt-1 leading-relaxed text-red-200/90 font-medium">
                            {contra.message}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 2. Polifarmasi & Beers Kriteri Göstergesi */}
                {polypharmacyReport && (polypharmacyReport.score >= 4 || polypharmacyReport.beersWarnings.length > 0) && (
                  <div className="backdrop-blur-xl bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 shadow-lg flex flex-col gap-2.5 mb-2 animate-slide-down">
                    <div className="flex items-start gap-3">
                      <span className="text-xl shrink-0 mt-0.5">📊</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-extrabold text-xs uppercase tracking-wider text-amber-500">
                            Çoklu İlaç ve Beers Analizi
                          </h4>
                          <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30`}>
                            {polypharmacyReport.level === "high" ? "Yüksek Risk" : "Orta Risk"}
                          </span>
                        </div>
                        <p className="text-xs mt-1.5 leading-relaxed text-amber-200 dark:text-amber-200/95 font-medium">
                          {polypharmacyReport.message}
                        </p>
                      </div>
                    </div>
                    
                    {polypharmacyReport.beersWarnings.length > 0 && (
                      <div className="border-t border-amber-500/10 pt-2 flex flex-col gap-1.5">
                        {polypharmacyReport.beersWarnings.map((warn: string, idx: number) => (
                          <div key={idx} className="flex items-start gap-2 text-[11px] text-amber-200/80 leading-relaxed font-bold">
                            <span className="shrink-0 text-xs">👴</span>
                            <div>{warn}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Accumulation & Overdose Warnings */}
                {accumulationWarnings.length > 0 && (
                  <div className="flex flex-col gap-3 mb-2 animate-slide-down">
                    {accumulationWarnings.map((warning, index) => {
                      const isHigh = warning.severity === "high";
                      const cardBg = isHigh
                        ? "bg-red-500/10 border-red-500/30 text-red-200"
                        : "bg-amber-500/10 border-amber-500/30 text-amber-200";
                      const icon = isHigh ? "🚨" : "⚠️";
                      const title = isHigh ? "Aşırı Doz / Çift İlaç Çakışması" : "Farmakolojik Sınıf Birikimi";
                      
                      return (
                        <div
                          key={index}
                          className={`backdrop-blur-xl border rounded-2xl p-4 shadow-lg flex gap-3 items-start ${cardBg}`}
                        >
                          <span className="text-xl shrink-0 mt-0.5">{icon}</span>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h4 className="font-extrabold text-xs uppercase tracking-wider text-white">
                                {title}
                              </h4>
                              <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                isHigh 
                                  ? "bg-red-500/20 text-red-300 border border-red-500/30" 
                                  : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              }`}>
                                {isHigh ? "Yüksek Risk" : "Orta Risk"}
                              </span>
                            </div>
                            <p className="text-xs font-semibold mt-1.5 leading-relaxed">
                              {warning.message}
                            </p>
                            {warning.detail && (
                              <p className="text-[11px] text-slate-400 mt-1">
                                {warning.detail}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {interactions.length === 0 ? (
                  /* Reassuring Emerald Green Safe State (Clean check, no interactions) */
                  <div className="flex flex-col gap-6">
                    <div
                      className="backdrop-blur-xl bg-emerald-500/5 border border-emerald-500/20 dark:border-emerald-500/20 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden"
                      style={{ boxShadow: "inset 0 1px 0 0 rgba(255, 255, 255, 0.05)" }}
                    >
                      <div className="absolute top-0 right-0 p-16 bg-gradient-to-bl from-emerald-500/10 to-transparent rounded-full pointer-events-none" />

                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-2xl shrink-0">
                          💚
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 tracking-wider uppercase bg-emerald-500/10 border border-emerald-500/20 rounded px-2 py-0.5 inline-block mb-2.5">
                            Kayıtlı Veri Setinde Bilinen Etkileşim Saptanmadı (Klinik Temiz Rapor)
                          </div>
                          <h4 className="font-bold text-slate-800 dark:text-white text-base sm:text-lg">Kayıtlı veri setinde bilinen etkileşim saptanmadı</h4>
                          <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80 mt-1.5 leading-relaxed font-medium">
                            Mevcut doğrulanmış veri setinde eklediğiniz ilaçlar (<span className="text-slate-900 dark:text-white">{selectedDrugs.map(d => d.name).join(", ")}</span>) arasında eşleşme bulunmamaktadır, tedavinizi değiştirmeden önce mutlaka hekiminize danışın.
                          </p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-3 font-semibold border-t border-emerald-500/10 pt-2">
                            ⚠️ **Önemli Uyarı:** Hekime göstermek için rapor oluştururken veya raporu hekiminizle paylaşırken kesinlikle tedavinizi/dozunuzu değiştirmeyin.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* AI general coverage deep-dive assistant button */}
                    <div className="backdrop-blur-md bg-white/40 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 rounded-3xl p-6 text-center">
                      <span className="text-2xl mb-2 inline-block">🤖</span>
                      <h4 className="font-bold text-slate-800 dark:text-white text-sm">Yapay Zeka ile Kombinasyon Analizi</h4>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed max-w-xs mx-auto">
                        Kayıtlı veri tabanında bulunmasa dahi bu kombinasyonun olası etkilerini Google Gemini Canlı AI katmanından sorgulayın.
                      </p>
                      <button
                        onClick={handleRequestCoverageExplanation}
                        disabled={isCoverageLoading}
                        className="mt-4 w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs rounded-xl shadow-lg hover:shadow-indigo-500/20 transition-all duration-200 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isCoverageLoading ? (
                          <>
                            <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Analiz Hazırlanıyor...
                          </>
                        ) : (
                          "Canlı AI Kombinasyon Analizini Başlat"
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Risky Interactions Listed State */
                  <InteractionList
                    interactions={interactions}
                    explanations={explanations}
                    loadingExplanations={loadingExplanations}
                    onExplainRequested={handleExplainRequested}
                    handleRequestCoverageExplanation={handleRequestCoverageExplanation}
                    isCoverageLoading={isCoverageLoading}
                  />
                )}

                {/* 3. Gıda ve Besin Etkileşim Uyarıları */}
                {foodInteractions.length > 0 && (
                  <div className="backdrop-blur-xl bg-slate-900/40 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 rounded-3xl p-6 shadow-2xl animate-slide-down flex flex-col gap-4 mt-2">
                    <h4 className="text-sm font-extrabold text-slate-950 dark:text-white flex items-center gap-2">
                      🥗 Gıda ve Besin Etkileşim Uyarıları
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
                        {foodInteractions.length} Uyarı
                      </span>
                    </h4>
                    
                    <div className="flex flex-col gap-3">
                      {foodInteractions.map((fInt, idx) => {
                        const isHigh = fInt.severity === "high";
                        const themeClass = isHigh 
                          ? "bg-red-500/5 dark:bg-red-950/15 border-red-500/20 text-red-800 dark:text-red-200" 
                          : "bg-amber-500/5 dark:bg-amber-950/15 border-amber-500/20 text-amber-800 dark:text-amber-200";
                        return (
                          <div key={idx} className={`p-4 rounded-2xl border ${themeClass} flex gap-3 items-start`}>
                            <span className="text-lg shrink-0 mt-0.5">{isHigh ? "🍊" : "🥦"}</span>
                            <div>
                              <div className="font-extrabold text-xs flex items-center gap-2">
                                <span className="text-slate-950 dark:text-white">{fInt.drugName}</span>
                                <span className="opacity-65">&amp;</span>
                                <span className="text-indigo-600 dark:text-indigo-400">{fInt.substance}</span>
                              </div>
                              <p className="text-xs mt-1.5 leading-relaxed font-semibold">
                                {fInt.effect}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Global Coverage AI Explanation Display Panel */}
            <CoveragePanel
              showCoveragePanel={showCoveragePanel}
              setShowCoveragePanel={setShowCoveragePanel}
              isCoverageLoading={isCoverageLoading}
              coverageExplanation={coverageExplanation}
              handleRequestCoverageExplanation={handleRequestCoverageExplanation}
              interactions={interactions}
            />

          </div>
        </section>
      </main>

      {/* Core Clinical Disclaimer Footer */}
      <footer className="relative z-10 w-full">
        <Disclaimer />
      </footer>

      {/* Global CSS Inject for Animations & Smooth Custom Transitions */}
      <style jsx global>{`
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.8; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.03); }
        }
        .animate-pulse-slow {
          animation: pulse-slow 8s infinite ease-in-out;
        }
        @keyframes slide-down {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-down {
          animation: slide-down 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          header, footer, nav, button, input, .print\:hidden, [role="search"], .bg-slate-950, .pointer-events-none {
            display: none !important;
          }
          section:first-of-type {
            display: none !important;
          }
          section:last-of-type {
            width: 100% !important;
            grid-column: span 12 / span 12 !important;
            display: block !important;
          }
          .min-h-screen {
            background: white !important;
            color: black !important;
            min-height: auto !important;
            padding: 0 !important;
          }
          .backdrop-blur-xl, .backdrop-blur-md {
            background: white !important;
            border: 1px solid #e2e8f0 !important;
            color: black !important;
            box-shadow: none !important;
            border-radius: 12px !important;
            margin-bottom: 16px !important;
            page-break-inside: avoid;
          }
          h3, h4, h5, p, span, a {
            color: black !important;
          }
          .print\:block {
            display: block !important;
          }
          a {
            text-decoration: underline !important;
            color: #1e3a8a !important;
          }
        }
      `}</style>
    </div>
  );
}
