# PillMind Veri Doğrulama Raporu

> **Tarih**: 2026-04-04
> **Durum**: ✅ 10 ilaç, 12 etkileşim — tamamı doğrulandı

## Doğrulama Yöntemi

Her ilaç ve etkileşim kaydı şu kaynak hiyerarşisiyle doğrulanmıştır:
1. FDA onaylı prospektüsler (prescribing information / labels)
2. Resmi sağlık kurumu kaynakları (NIH, NHS, ACC, ESC, AHA)
3. Saygın klinik referans veritabanları (Drugs.com, Patient.info, Pharmacy Times)

**LLM çıktısı kaynak olarak kullanılmamıştır.** Aramalar doğrudan web üzerinden birincil ve ikincil tıbbi kaynaklara yönlendirilmiştir.

## Doğrulanan İlaçlar (10/10)

| İlaç | Etken Madde | Kategori | Durum |
|---|---|---|---|
| Aspirin | Asetilsalisilik Asit | NSAID / Antitrombosit | ✅ |
| Coumadin (Warfarin) | Warfarin Sodyum | Antikoagülan | ✅ |
| Metformin | Metformin HCl | Antidiyabetik | ✅ |
| Enalapril | Enalapril Maleat | ACE İnhibitörü | ✅ |
| Amoksisilin | Amoksisilin Trihidrat | Antibiyotik (Penisilin) | ✅ |
| Omeprazol | Omeprazol | Proton Pompası İnhibitörü | ✅ |
| İbuprofen | İbuprofen | NSAID | ✅ |
| Diklofenak | Diklofenak Sodyum | NSAID | ✅ |
| Metoprolol | Metoprolol Tartarat | Beta Bloker | ✅ |
| Parasetamol | Parasetamol (Asetaminofen) | Analjezik / Antipiretik | ✅ |

## Doğrulanan Etkileşimler (12/12)

| ID | İlaçlar | Şiddet | Birincil Kaynak | Durum |
|---|---|---|---|---|
| aspirin-warfarin | Aspirin + Warfarin | 🔴 Yüksek | FDA Warfarin Label | ✅ |
| ibuprofen-warfarin | İbuprofen + Warfarin | 🔴 Yüksek | FDA İbuprofen Label | ✅ |
| ibuprofen-aspirin | İbuprofen + Aspirin | 🔴 Yüksek | FDA NSAID Guidance | ✅ |
| diklofenak-warfarin | Diklofenak + Warfarin | 🔴 Yüksek | FDA Diklofenak Label | ✅ |
| diklofenak-aspirin | Diklofenak + Aspirin | 🔴 Yüksek | NIH PubMed | ✅ |
| ibuprofen-enalapril | İbuprofen + Enalapril | 🟡 Orta | FDA Enalapril Label | ✅ |
| diklofenak-enalapril | Diklofenak + Enalapril | 🟡 Orta | FDA NSAID Label | ✅ |
| omeprazol-warfarin | Omeprazol + Warfarin | 🟡 Orta | FDA Prilosec Label | ✅ |
| aspirin-enalapril | Aspirin + Enalapril | 🟡 Orta | AHA Journals | ✅ |
| ibuprofen-metformin | İbuprofen + Metformin | 🟡 Orta | Drugs.com + Patient.info | ✅ |
| metformin-enalapril | Metformin + Enalapril | 🟢 Düşük | Drugs.com + NIH | ✅ |
| aspirin-metoprolol | Aspirin + Metoprolol | 🟢 Düşük | Drugs.com + NIH | ✅ |

## Çıkarılan Kayıtlar

**Hiçbir kayıt çıkarılmamıştır.** 12 etkileşimin tamamı birincil veya saygın ikincil kaynaklarla doğrulanmıştır.

## Demo Golden Path (Önerilen Sunum Akışı)

| Adım | İlaçlar | Beklenen Sonuç | Neden |
|---|---|---|---|
| 1. Kırmızı ✦ | Aspirin + Warfarin | 🔴 Bilinen önemli etkileşim | En klasik, en iyi belgelenmiş etkileşim |
| 2. Sarı ✦ | İbuprofen + Enalapril | 🟡 Dikkat edilmesi gereken etkileşim | Farklı mekanizma (NSAID + ACEi) |
| 3. Yeşil ✦ | Parasetamol + Amoksisilin | 🟢 Etkileşim bulunamadı | Veritabanında kayıt yok = güvenli demo |

## Jüriye Söylenecek Dürüst Veri Sınırı Cümlesi

> "Veri setimiz 10 yaygın ilaç ve 12 bilinen etkileşim içermektedir. Her kayıt FDA prospektüsleri ve NIH/Drugs.com gibi birincil tıbbi kaynaklarla doğrulanmıştır. Sistem karar vermek için AI kullanmaz — etkileşim kararları küratörlü veriden gelir, AI sadece açıklama üretir. Bu bir bilgilendirme aracıdır, tıbbi tavsiye sunmaz."

## Güvenli Dil Kontrolü

Tüm summary ve mock açıklamalarda:
- ✅ "artabilir", "etkileyebilir", "azaltabilir" gibi olasılık ifadeleri kullanılmıştır
- ✅ Hiçbir yerde "kesin", "tehlikeli", "güvenli" gibi kesin hükümler yoktur
- ✅ Tanı, tedavi, doz, reçete önerisi içeren ifade yoktur
- ✅ Her açıklama doktora/eczacıya yönlendirme ile sonlanır
