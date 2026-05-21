# 💊 PillMind: Tıbbi Düzeyde İlaç Etkileşim Kontrolü ve Canlı AI Açıklama Portalı

PillMind, seçilen ilaçlar arasındaki **doğrulanmış etkileşim kayıtlarını** kontrol eden, sonuçları sade ve anlaşılır bir Türkçe ile hastalara açıklayan, yüksek hata toleransına sahip kurumsal düzeyde bir dijital sağlık ve ilaç güvenliği bilgilendirme aracıdır.

PillMind tanı koymaz, tedavi önermez, doz ayarlaması yapmaz ve kesinlikle profesyonel hekim kararının yerini almaz. Proje, klinik doğruluğu **deterministik bir veritabanı çekirdeğinde** tutarken, hastaya yönelik bilgilendirme metinlerini **çift ajanlı bir yapay zeka ve güvenlik kalkanı denetiminden** geçirerek sunan hibrit bir mimariye sahiptir.

---

## 🚦 Proje Gelişim ve Kalite Güvence Durumu

| Geliştirme Aşaması | Durum | Kapsadığı Alanlar | Test Durumu |
| :--- | :---: | :--- | :---: |
| **Faz 1: Veritabanı ve Klinik Altyapı** | ✅ **%100 Tamamlandı** | PostgreSQL şeması, Prisma ORM singleton yapısı, $O(1)$ performanslı çapraz etkileşim taraması ve Seed verileri. | **Resilience testleri ile doğrulandı** |
| **Faz 2: Gelişmiş AI Güvenliği & Caching** | ✅ **%100 Tamamlandı** | Gemini Structured JSON şeması, Çift Ajanlı Doğrulama (Reviewer), Türkçe lookaround regex filtresi, Upstash Redis caching. | **Safety Filter testleri ile doğrulandı** |
| **Faz 4: Premium UI/UX & Erişilebilirlik** | ✅ **%100 Tamamlandı** | Premium Glassmorphism UI, Türkçe Fuzzy Search motoru, 3D Sanal Kutu animasyonları, WCAG 2.2 AA klavye ve odak halkası standartları. | **E2E Playwright testleri ile doğrulandı** |
| **Faz 5: Kapsamlı Testler & Dayanıklılık** | ✅ **%100 Tamamlandı** | Jest birim/entegrasyon testleri, Playwright E2E testleri, PostgreSQL ve Redis kesinti simülasyonları, Türkçe Unicode normalizasyon yamaları. | **14/14 Başarılı (ALL PASS)** |

---

## 🏗️ Mimari Yapı ve Yedeklilik Kaskadı (Resilience Cascade)

Kritik sağlık uygulamalarında hiçbir dış bağımlılığın (bulut veritabanı, redis önbelleği, AI API sağlayıcısı) kesintiye uğraması uygulamayı çevrimdışı bırakmamalıdır. PillMind'da uygulanan asenkron yedeklilik akışı aşağıda şematize edilmiştir:

```mermaid
graph TD
    UserQuery([İlaç Kontrol Sorgusu]) --> CheckRoute{/api/check}
    
    %% Veritabanı Yedeklilik Katmanı
    CheckRoute -->|1. Tercih Edilen Yol| PrismaPG[(Supabase PostgreSQL)]
    PrismaPG -->|Bağlantı Başarılı| DBResults[Veritabanı Sonuçları]
    PrismaPG -->|Bağlantı Koptu / Yavaş| PrismaCatch[Prisma try/catch]
    PrismaCatch -->|2. Asenkron Fallback| JSONEngine[Lokal Deterministik JSON Engine]
    JSONEngine -->|Hızlı Yedek Sonuç| FallbackResults[Lokal JSON Sonuçları]
    
    %% AI Canlı Açıklama Katmanı
    ExplainQuery([AI Açıklama Talebi]) --> ExplainRoute{/api/explain}
    ExplainRoute -->|1. Önbellek Kontrolü| RedisCheck{Upstash Redis}
    RedisCheck -->|Cache HIT <50ms| ReturnCache[Önbellek Açıklaması]
    RedisCheck -->|Cache MISS / REDIS DOWN| RedisCatch[Redis try/catch - console.warn]
    
    RedisCatch -->|2. Live AI Stream| GeminiChain{Gemini Model Chain}
    GeminiChain -->|gemini-2.5-flash-lite| GeminiLite[Lite Model]
    GeminiLite -->|Hata/Kota Aşımı 429| GeminiPro[Flash Model]
    
    %% AI Güvenlik Filtresi
    GeminiPro -->|Başarılı Metin| SafetyFilter{Çift Ajanlı Güvenlik Ajanı}
    SafetyFilter -->|Regex + Reviewer Onaylandı| CacheWrite[Redis Önbelleğe Yazma]
    SafetyFilter -->|Regex/Reviewer RED| SafetyBlock[Güvenli Hata Kartı & Hekim Yönlendirmesi]
```

---

## 🛠️ Çekirdek Özellikler ve Mimari Çözümler

### 1. Deterministik Klinik Çekirdek (Database Decoupling)
*   **Prisma ORM & Supabase**: İlaçlar arasındaki etkileşim sorguları kesinlikle yapay zekaya bırakılmaz. SQL veritabanında tohumlanmış (`seed.ts`) FDA ve PubMed onaylı ikili kombinasyon matrisi üzerinden sorgulanır.
*   **Zero-Crash Fallback Katmanı**: Supabase veritabanında bir ağ kesintisi veya aşırı yavaşlama (outage) yaşandığında, `lib/interactions.ts` içindeki `try/catch` bloğu bunu anında yakalar, arka planda loglar ve sıfır gecikmeyle lokal `data/drugs.json` ve `data/interactions.json` dosyalarını okuyarak kullanıcıya kesintisiz hizmet verir.

### 2. Çift Ajanlı (Dual-Agent) AI Güvenlik Kalkanı
*   **Gemini Structured JSON Outputs**: Canlı tıbbi açıklamalar, Gemini API'nin şema kısıtlamasıyla üretilerek çıktı doğruluğu güvenceye alınır.
*   **Türkçe Suffix/Boundary Korumalı Regex**: JavaScript regex motorunun Türkçe karakterlerdeki (`ı, ş, ç, ğ, ö, ü`) kelime sınırı (`\b`) zafiyetlerini aşmak için özel tasarlanmış lookaround grupları `(?:^|[^a-zA-Z0-9ıİğĞüşŞöÖçÇ])` kullanılmıştır. AI tarafından üretilebilecek ekli gramer türevleri (`"bırakınız"`, `"dozunu"`, `"ayarlayınız"`) `[a-zA-ZıİğĞüşŞöÖçÇ]*` wildcard desteğiyle deterministik olarak engellenir.
*   **LLM Clinical Reviewer Agent**: Üretilen Türkçe tıbbi açıklama hastaya sunulmadan önce arka planda `runReviewerAgent` denetiminden geçirilir. Hekim yetkisini aşan en ufak bir klinik yönlendirme tespit edilirse metin derhal bloke edilir ve güvenli hata kartına düşülür.
*   **Upstash Redis Caching**: Güvenlik filtresini başarıyla geçen AI açıklamaları Redis'e 7 gün TTL ile yazılır. Aynı kombinasyon arandığında <50ms yanıt süresiyle cache'ten getirilerek yapay zeka API maliyetleri sıfırlanır.

### 3. Türkçe Fuzzy Search Arama Motoru
*   **Unicode Birleşik Nokta (`\u0307`) Yaması**: Bazı Windows ve Node.js ortamlarında büyük Türkçe `"İ"` harfinin küçük harfe çevrilirken karakter uzunluğunu 2'ye çıkaran diakritik uyuşmazlığı giderilmiştir. `normalizeTurkish` filtresiyle diakritikler tamamen elenerek arama eşleşmeleri kusursuzlaştırılmıştır.
*   **Gelişmiş Puanlama**: Levenshtein hece hataları toleransı, ardışık harf eşleşme (subsequence) bonusları ve etken maddeye kıyasla marka adı önceliklendirmesi içeren yüksek performanslı arama algoritması.

### 4. 3D Sanal İlaç Kutusu (Virtual Pillbox)
*   **3D Kapsül Animasyonları**: Kullanıcı ilaç ekledikçe CSS 3D Transforms ve yerçekimi etkisiyle sanal ilaç kutusuna düşen ve etkileşim durumuna göre renk değiştiren premium cam morfolojisi (glassmorphic) arayüz.
*   **Yerçekimi Kanca Düzeltmesi**: İlaç silme eylemlerinde animasyon zamanlayıcılarının erken tetiklenmesini önleyen `prevCount` durum kilitleriyle stabilite korunmuştur.
*   **Katmanlama ve Z-Index Kusursuzluğu**: Arama kutusu dropdown menüsünün, 3D transform kullanan Virtual Pillbox'ın arkasında kalmasını veya üst kartın `overflow-hidden` özelliği nedeniyle kesilmesini önleyen özel `z-20` / `z-10` katman hiyerarşisi ve kırpıcı ışıma katmanı entegre edilmiştir. Bu sayede açılır liste her zaman pürüzsüzce en ön planda görüntülenir.

### 5. WCAG 2.2 AA Erişilebilirlik Standartları
*   **Klavye Haritası**: Görme veya motor kısıtlı hastaların tüm portalı klavyeyle dolaşabilmesi için `Tab` (sırayla gezinme), `ArrowDown` / `ArrowUp` (fuzzy search listesinde gezinme), `Enter` (ilaç ekleme/çıkarma) ve `Escape` (dropdown kapatma) tuş haritalamaları uygulanmıştır.
*   **ARIA Desteği**: `aria-live="polite"` ekran okuyucu seslendirmeleri, `aria-expanded` ile dinamik AI çekmecesi durum bildirimleri, `role="listbox"` ve `role="option"` semantik standartları.
*   **Yüksek Kontrast**: Yalnızca renk odaklı değil, ikonik göstergelerle desteklenmiş, odaklanıldığında netleşen yüksek görünürlüklü indigo odak halkaları (`focus:ring-indigo-500`).

---

## 💻 Teknoloji Yığıtı (Tech Stack)

*   **Çekirdek**: Next.js 16.2 (App Router), React 19.2, TypeScript 5, Tailwind CSS v4, Vanilla CSS
*   **Veri & ORM**: Prisma Client v5.11, PostgreSQL (Supabase), Local JSON Fallback Layer
*   **Önbellek & AI**: Upstash Redis, Google Gemini API (`gemini-2.5-flash-lite` & `gemini-2.5-flash`)
*   **Test Altyapısı**: Jest (Next.js native SWC compiler), Playwright E2E Testing Framework

---

## 📂 Proje Klasör Yapısı

```text
pill-mind/
├── app/
│   ├── api/
│   │   ├── check/          # Deterministik N-ilaç etkileşim kontrol API'si
│   │   └── explain/        # Canlı AI açıklama ve Redis cache API'si
│   ├── kontrol/            # Etkileşimli ana tarama portal sayfası
│   ├── layout.tsx          # Evrensel layout
│   └── page.tsx            # Giriş / Tanıtım sayfası
├── components/
│   ├── Disclaimer.tsx      # Klinik yasal uyarı evrensel bileşeni
│   ├── DrugSelector.tsx    # Türkçe Fuzzy Search autocomplete bileşeni
│   ├── ResultCard.tsx      # Etkileşim detay kartı ve AI drawer bileşeni
│   └── VirtualPillbox.tsx  # 3D kapsül düşme animasyonlu sanal kutu
├── data/
│   ├── drugs.json          # Yerel yedek çevrimdışı ilaç listesi
│   └── interactions.json   # Yerel yedek çevrimdışı etkileşim matrisi
├── lib/
│   ├── fuzzySearch.ts      # Türkçe normalizasyon ve fuzzy search algoritması
│   ├── gemini.ts           # Gemini entegrasyonu, regex kalkanı ve reviewer ajan
│   ├── interactions.ts     # Veritabanı ve JSON fallback motoru
│   ├── prisma.ts           # Prisma singleton client istemcisi
│   └── redis.ts            # Upstash Redis bağlantı yöneticisi
├── prisma/
│   ├── schema.prisma       # Supabase PostgreSQL veritabanı şeması
│   └── seed.ts             # Klinik veri tohumlama betiği
├── tests/
│   ├── e2e.spec.ts         # Playwright E2E ve WCAG erişilebilirlik testleri
│   ├── fuzzySearch.test.ts # Fuzzy search Türkçe normalizasyon birim testleri
│   ├── resilience.test.ts  # Veritabanı ve Redis kesinti fallback testleri
│   └── safetyFilter.test.ts# Regex kalkanı ve klinik bypass güvenlik testleri
├── jest.config.js          # Next.js SWC Jest konfigürasyonu
└── playwright.config.ts    # Playwright E2E konfigürasyonu
```

---

## 🚀 Kurulum ve Yerel Çalıştırma

### 1. Bağımlılıkları Yükleyin
```bash
npm install
```

### 2. Ortam Değişkenlerini Yapılandırın
Kök dizinde `.env.local` dosyası oluşturun ve aşağıdaki şablonu gerçek API anahtarlarınızla doldurun:
```env
# Veritabanı Bağlantısı (Supabase PostgreSQL)
DATABASE_URL="postgresql://postgres:[SIFRE]@db.supabase.co:5432/postgres"

# Google Gemini Yapay Zeka API Anahtarı
GOOGLE_API_KEY="AIzaSy..."

# Upstash Redis Önbellek Bağlantısı
UPSTASH_REDIS_REST_URL="https://...upstash.io"
UPSTASH_REDIS_REST_TOKEN="..."

# Çalışma Zamanı Modları
NEXT_PUBLIC_DEMO_MODE="false"
GEMINI_MODEL="gemini-2.5-flash-lite"
```

### 3. Veritabanını Yapılandırın ve Tohumlayın (Seeding)
Veritabanı şemasını uygulayıp FDA/PubMed klinik verilerini veritabanına aktarmak için:
```bash
npx prisma db push
npm run seed
```

### 4. Geliştirme Sunucusunu Başlatın
```bash
npm run dev
```
Uygulama yerelde [http://localhost:3000](http://localhost:3000) adresinde çalışacaktır.

---

## 🧪 Testlerin Çalıştırılması

PillMind, kalite güvence standartları gereğince hem birim testlerine (Jest) hem de uçtan uca arayüz testlerine (Playwright) sahiptir.

### A. Jest Birim ve Entegrasyon Testleri (Birim, Güvenlik ve Fallback)
Next.js'in native SWC derleyicisini kullanan birim testlerini çalıştırmak için:
```bash
npm run test
```
*Bu komut; Türkçe normalizasyon, güvenlik regex engellemeleri, bypass girişimleri ve PostgreSQL/Redis bağlantı çökmesi durumunda lokal kaskat yedeklerin sorunsuz çalıştığını doğrular.*

### B. Playwright Uçtan Uca (E2E) ve WCAG Erişilebilirlik Testleri
Playwright testlerini çalıştırmadan önce yerel tarayıcı binary dosyalarını yüklemeniz gerekebilir:
```bash
npx playwright install
```
Ardından E2E test senaryosunu tetiklemek için:
```bash
npm run test:e2e
```
*Bu komut; Next.js dev server'ı arka planda otomatik olarak ayağa kaldırır, klavye ile arama-seçme akışlarını simüle eder, strict-mode çakışmalarını denetler, 3D kutuya kapsül eklenmesini, asenkron AI drawer'ın açılıp kapanmasını ve odak çerçevesi standartlarını test eder.*

---

## ⚖️ Yasal ve Klinik Uyarı (Disclaimer)

Bu uygulama sadece eğitim ve bilgilendirme amacıyla tasarlanmış bir prototiptir. Verilen etkileşim açıklamaları sınırlı bir demo veri tabanına dayanmaktadır. İlaç tedavilerinize başlamadan, tedavilerinizi sonlandırmadan veya doz ayarlaması yapmadan önce her zaman hekiminize veya eczacınıza danışınız. Yapay zeka çıktıları, hiçbir koşulda profesyonel tıbbi teşhis ve hekim kararlarının yerine geçemez.
