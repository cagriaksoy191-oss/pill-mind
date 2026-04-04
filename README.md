# 💊 PillMind — Akıllı İlaç Güvenliği Asistanı

> **Durum**: Kilitlendi ve Sunuma Hazır (Demo-Ready)
> **Aşama**: Hackathon Faz 3 — Jüri Sunumu

## Bu Nedir?

PillMind, kullanıcının seçtiği ilaçlar arasındaki bilinen etkileşimleri kontrol eden ve sonuçları sade Türkçe ile açıklayan bir **ilaç güvenliği bilgilendirme aracı**dır.

**PillMind tanı koymaz, tedavi önermez, doktorun yerini almaz.** Kullanıcıyı bilgilendirerek doktoruyla daha bilinçli konuşmasını sağlar.

## Şu An Ne Çalışıyor?

| Özellik | Durum |
|---|---|
| Landing page | ✅ Çalışıyor |
| İlaç seçimi (autocomplete) | ✅ Çalışıyor |
| Etkileşim kontrolü | ✅ Çalışıyor (küratörlü JSON'dan) |
| Sonuç kartları (🟢🟡🔴) | ✅ Çalışıyor |
| Türkçe açıklamalar | ✅ Gemini API + mock fallback |
| Disclaimer | ✅ Her ekranda |
| Gemini API entegrasyonu | ✅ Aktif (güvenli fallback ile) |
| Cloud Vision OCR | ⏳ Bonus — opsiyonel |

## 🧠 AI Mimarisi

- **Etkileşim kararı**: Küratörlü JSON verisinden — AI karar vermiyor
- **Açıklama katmanı**: Google Gemini API — sadece bilgilendirme üretir
- **Güvenlik**: Gemini çıktısı output guard ile kontrol edilir, riskli ifadeler varsa mock'a düşer
- **Fallback**: API yoksa, hata olursa veya çıktı güvensizse → otomatik mock yanıt
- **API key**: Sadece `.env.local` içinde tutulur (gitignore'da)

## ✅ Veri Doğrulama Durumu

`data/` klasöründeki **10 ilaç** ve **12 etkileşim** kaydının tamamı FDA prospektüsleri, NIH, AHA ve Drugs.com gibi birincil tıbbi kaynaklarla doğrulanmıştır. Detaylı doğrulama raporu: `data/verification-report.md`

> **Not**: Bu veri seti sınırlı kapsamlı bir demo veri setidir. Ticari kullanım için kapsamlı bir ilaç veritabanı gerekir.

## Çalıştırma

```bash
# Bağımlılıkları kur
npm install

# .env.local dosyasını oluştur (gerçek API key burada)
cp .env.example .env.local
# GOOGLE_API_KEY= alanını gerçek key ile doldur

# Geliştirme sunucusu
npm run dev

# Build
npm run build
```

Uygulama varsayılan olarak `http://localhost:3000` adresinde açılır.

> **Not**: `.env.example` sadece şablondur, gerçek anahtarlar `.env.local` içindedir ve commit edilmez.

## Önemli Dosyalar

| Dosya | İçerik |
|---|---|
| `docs/` | Jüri soru-cevapları, demo akışı, sunum özetleri |
| `data/drugs.json` | 10 ilaç — tamamı doğrulanmış demo seti |
| `data/interactions.json` | 12 etkileşim — tamamı kaynaklı |
| `data/mock-responses.json` | Sade Türkçe açıklama mock'ları |
| `data/verification-report.md` | Veri doğrulama raporu |
| `app/api/check/route.ts` | Etkileşim kontrol API (JSON lookup) |
| `app/api/explain/route.ts` | Açıklama API (Gemini + mock fallback) |
| `lib/gemini.ts` | Gemini REST client + prompt + output guard |
| `components/` | DrugSelector, ResultCard, Disclaimer |
| `.env.example` | API key şablonu (gerçek key buraya yazılmaz) |

## Sonraki Adımlar

1. ~~**Gemini API entegrasyonu**~~ ✅ Tamamlandı
2. ~~**Veri doğrulama**~~ ✅ 10 ilaç, 12 etkileşim kaynakla doğrulandı
3. ~~**UI cilalama ve Sunum materyalleri**~~ ✅ Tamamlandı
4. **Cloud Vision** (Opsiyonel / Ekstra) — İlaç kutusu fotoğrafından OCR

## Ekip Dosya Sorumlulukları

| Kişi | Alan |
|---|---|
| Kişi 1 (Frontend) | `app/page.tsx`, `app/kontrol/`, `components/*` |
| Kişi 2 (Backend/AI) | `app/api/*`, `lib/*`, `.env*` |
| Kişi 3 (Ürün/Veri) | `data/*`, `README.md`, sunum |
