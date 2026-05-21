# PillMind

PillMind, seçilen ilaçlar arasındaki **doğrulanmış etkileşim kayıtlarını** kontrol eden ve sonucu sade Türkçe ile açıklayan bir ilaç güvenliği bilgilendirme aracıdır.

PillMind tanı koymaz, tedavi önermez ve doktorun yerini almaz.

## Nasıl Çalışır?

- **Etkileşim kararı**: `data/interactions.json` içindeki doğrulanmış veri setinden gelir.
- **Canlı açıklama katmanı**: `/api/explain` üzerinden Google Gemini ile her istek için yeniden üretilir.
- **Hazır açıklama cache'i yoktur**: Aynı kombinasyon yeniden seçildiğinde açıklama tekrar canlı üretilir.
- **Kayıt bulunmayan kombinasyonlar**: Sistem yine canlı AI ile, veri setinde doğrulanmış kayıt bulunmadığını açıklayan ayrı bir bilgilendirme üretir.

## Veri Kapsamı

Bu demo sürümü şu anda:

- `10` temel ilacı
- bu ilaçlar arasındaki `12` doğrulanmış etkileşim kaydını

kapsar.

Bu yüzden her kombinasyonda doğrulanmış etkileşim kararı bulunmayabilir. Böyle durumlarda uygulama “etkileşim vardır/yoktur” diye hüküm vermez; yalnızca veri seti kapsamını açıklayan canlı bir AI metni üretir.

## Çalıştırma

```bash
npm install
cp .env.example .env.local
# GOOGLE_API_KEY alanını gerçek anahtar ile doldur

npm run dev
```

Uygulama varsayılan olarak `http://localhost:3000` adresinde açılır.

## Önemli Dosyalar

| Dosya | İçerik |
|---|---|
| `data/drugs.json` | Demo ilaç listesi |
| `data/interactions.json` | Doğrulanmış etkileşim kayıtları |
| `app/api/check/route.ts` | Etkileşim kararını veren deterministik kontrol katmanı |
| `app/api/explain/route.ts` | Canlı AI açıklama katmanı |
| `lib/gemini.ts` | Gemini istekleri ve güvenlik kontrolleri |
| `app/kontrol/page.tsx` | Sonuç ve canlı açıklama akışı |
| `components/ResultCard.tsx` | Etkileşim kartı ve detay açıklaması |

## Notlar

- Gerçek API anahtarları yalnızca `.env.local` içinde tutulur.
- `.env.example` sadece şablondur.
- Bu proje hackathon MVP’sidir; üretim kullanımı için daha geniş tıbbi veri kaynakları gerekir.
