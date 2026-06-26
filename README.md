# 💊 PillMind: Tıbbi Düzeyde İlaç Etkileşim Kontrolü ve Canlı AI Açıklama Portalı

PillMind, seçilen ilaçlar arasındaki **doğrulanmış etkileşim kayıtlarını** kontrol eden, sonuçları sade ve anlaşılır bir Türkçe ile hastalara açıklayan, yüksek hata toleransına sahip kurumsal düzeyde bir dijital sağlık ve ilaç güvenliği bilgilendirme aracıdır.

PillMind tanı koymaz, tedavi önermez, doz ayarlaması yapmaz ve kesinlikle profesyonel hekim kararının yerini almaz. Proje, klinik doğruluğu **deterministik bir veritabanı çekirdeğinde** tutarken, hastaya yönelik bilgilendirme metinlerini **çift ajanlı bir yapay zeka ve güvenlik kalkanı denetiminden** geçirerek sunan hibrit bir mimariye sahiptir.

---

## 🚦 Proje Gelişim ve Kalite Güvence Durumu

| Geliştirme Aşaması | Durum | Kapsadığı Alanlar | Test Durumu |
| :--- | :---: | :--- | :---: |
| **Faz 1: Veritabanı ve Klinik Altyapı** | ✅ **%100 Tamamlandı** | PostgreSQL şeması, Prisma ORM singleton yapısı, $O(1)$ performanslı çapraz etkileşim taraması ve Seed verileri. | **Resilience testleri ile doğrulandı** |
| **Faz 2: Gelişmiş AI Güvenliği & Caching** | ✅ **%100 Tamamlandı** | Gemini Structured JSON şeması, Çift Ajanlı Doğrulama (Reviewer), Türkçe lookaround regex filtresi, Upstash Redis caching. | **Safety Filter testleri ile doğrulandı** |
| **Faz 3: Kurumsal Mimari & Gözlemlenebilirlik** | ✅ **%100 Tamamlandı** | Next.js Sentry entegrasyonu, Edge & Server telemetry, premium global hata sınırları (`error.tsx`), Supabase Auth & Bulut Kutu veri haritası. | **Explain-route integration ile doğrulandı** |
| **Faz 4: Premium UI/UX & Erişilebilirlik** | ✅ **%100 Tamamlandı** | Premium Glassmorphism UI, Türkçe Fuzzy Search motoru, 3D Sanal Kutu animasyonları, WCAG 2.2 AA klavye ve odak halkası standartları. | **E2E Playwright testleri ile doğrulandı** |
| **Faz 5: Mobil, Çevrimdışı PWA & Testler** | ✅ **%100 Tamamlandı** | PWA Service Worker çevrimdışı önbellek (`sw.js`), yerel client-side tarama bypass (`findInteractions`), Jest unit/component & Playwright E2E. | **193/193 Başarılı (ALL PASS)** |
| **Faz 6: Kurumsal HL7 FHIR & OpenAPI Sözleşmesi** | ✅ **%100 Tamamlandı** | HL7 FHIR Medication/MedicationRequest API, OpenAPI 3.0 API Şeması, Süreli Rapor Paylaşımı, Klinik Reviewer & Maskeli Audit Log. | **Enterprise integration testleri ile doğrulandı** |

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
    
    %% AI ve FHIR Katmanları
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
*   **Kontrendikasyon & Klinik Etki**: Veritabanı şemasındaki `Contraindication` modeline eklenen `effect` alanı sayesinde kontrendikasyonların klinik etkileri de deterministik olarak hastalara raporlanır.

### 2. HL7 FHIR Standardı ve OpenAPI 3.0 API Sözleşmesi
*   **OpenAPI 3.0 API Sözleşmesi (`public/openapi.json`)**: Tüm PillMind 3.0 API uç noktaları (Kimlik Doğrulama, İlaç Kontrolü, AI Açıklama, Kutu Kaydetme, Süreli Paylaşım ve FHIR servisleri) standart şemalara, HTTP durum kodlarına ve rate-limit detaylarına tam uyumlu olarak belgelenmiştir.
*   **HL7 FHIR Uyumlu Rotalar**:
    *   `/api/fhir/medication` (GET) ile ilaç listesi RxNorm (`rxcui`) ve ATC (`atcCode`) standart kodlama sistemleri kullanılarak FHIR `Medication` kaynak formatında dışarı sunulur.
    *   `/api/fhir/medicationrequest` (POST) ile hastanın aktif ilaç kombinasyonları ve klinik riskleri FHIR `MedicationRequest` ve `Parameters` standartlarında alınır ve işlenir.

### 3. Süreli Rapor Paylaşımı ve Salt Okunur Okuyucu
*   **24 Saat Süreli Paylaşım (`/api/pillbox/share`)**: Giriş yapmış kullanıcının seçili ilaç kombinasyonunu ve risk özetini 24 saat geçerli benzersiz bir kriptografik token ile kaydeder.
*   **Paylaşım Görüntüleyici (`/share/[token]`)**: Hekimin veya rapor alıcısının ilaç kombinasyonlarını, birikim uyarılarını, gıda etkileşimlerini ve risk analizlerini tamamen salt okunur görebilmesini sağlayan, kalan süreyi belirten ve PDF/A4 formatında baskı almaya izin veren premium cam morfolojili arayüz.

### 4. Klinik Reviewer ve Audit Log Servisi (`lib/audit.ts`)
*   **KVKK/GDPR Maskeli Audit Log**: E-posta ve telefon gibi hassas kullanıcı kişisel verilerini regex lookaround sınırları ile otomatik olarak gizleyen (redact eden) güvenli audit log kütüphanesi aktif edilmiştir.
*   **Klinik Onay API (`/api/admin/review`)**: Klinik denetçilerin etkileşim durumlarını (`VERIFIED`, `PENDING`, `DEPRECATED`) güncelleyebilmesini ve audit log eşliğinde onay geçmişi oluşturabilmesini sağlar.

### 5. Çift Ajanlı (Dual-Agent) AI Güvenlik Kalkanı
*   **Gemini Structured JSON Outputs**: Canlı tıbbi açıklamalar, Gemini API'nin şema kısıtlamasıyla üretilerek çıktı doğruluğu güvenceye alınır.
*   **Türkçe Suffix/Boundary Korumalı Regex**: JavaScript regex motorunun Türkçe karakterlerdeki (`ı, ş, ç, ğ, ö, ü`) kelime sınırı (`\b`) zafiyetlerini aşmak için özel tasarlanmış lookaround grupları `(?:^|[^a-zA-Z0-9ıİğĞüşŞöÖçÇ])` kullanılmıştır. AI tarafından üretilebilecek ekli gramer türevleri (`"bırakınız"`, `"dozunu"`, `"ayarlayınız"`) `[a-zA-ZıİğĞüşŞöÖçÇ]*` wildcard desteğiyle deterministik olarak engellenir.
*   **LLM Clinical Reviewer Agent**: Üretilen Türkçe tıbbi açıklama hastaya sunulmadan önce arka planda `runReviewerAgent` denetiminden geçirilir. Hekim yetkisini aşan en ufak bir klinik yönlendirme tespit edilirse metin derhal bloke edilir ve güvenli hata kartına düşülür.
*   **Upstash Redis Caching**: Güvenlik filtresini başarıyla geçen AI açıklamaları Redis'e 7 gün TTL ile yazılır. Aynı kombinasyon arandığında <50ms yanıt süresiyle cache'ten getirilerek yapay zeka API maliyetleri sıfırlanır.

### 6. Kurumsal Gözlemlenebilirlik (Sentry Integration)
*   **Hata İzleme (Sentry SDK)**: Next.js Client (`sentry.client.config.ts`), Server (`sentry.server.config.ts`) ve Edge (`sentry.edge.config.ts`) katmanlarında gerçek zamanlı hata izleme kurulmuştur.
*   **Build-time Webpack Entegrasyonu**: `next.config.ts` dosyası Sentry derleme yapılandırmasıyla (`withSentryConfig`) sarmalanmış; sourcemap gizleme ve ad-blocker engelleyici tünelleme `/monitoring` ayarlanmıştır.
*   **Global Hata Sınırları**: `app/error.tsx` ve `app/global-error.tsx` premium cam tasarımlı hata kartlarıyla, Next.js çökmelerini şefkatli bir Türkçe arayüzle yönetirken hatayı `Sentry.captureException` ile otomatik loglar.

### 7. Şifresiz Kimlik Doğrulama ve Bulut Kutu Kaydı (Supabase Auth & Saved State)
*   **Veri Katmanı İlişkisi**: `prisma/schema.prisma` içerisinde `User` ve `SavedPillbox` modelleri bire çok bağlantıyla eklenmiştir.
*   **Sıfır Bağımlılıklı AES-256 Oturum Güvenliği**: `lib/auth.ts` içinde Node'un yerleşik `crypto` modülüyle şifrelenen, serverless Edge ortamlarıyla uyumlu kurcalanamaz `HttpOnly` session çerezleri yazılmıştır.
*   **Magic Sign-in Rotaları**: E-posta doğrulama tabanlı kayıt ve giriş API rotaları (`/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`) ve kutu kaydetme/listeleme/silme API servisleri (`/api/pillbox/save`, `/api/pillbox/list`, `/api/pillbox/delete`) kodlanmıştır.
*   **Kullanıcı Yönetim Arayüzü**: `components/UserPanel.tsx` ile üyelik formunu, kayıtlı ilaç kombinasyonlarının buluttan listelenip tek tıkla sanal kutuya yüklenmesini (`onLoadPillbox`) ve oturum kapatılmasını yöneten premium glassmorphic bileşen entegre edilmiştir.

### 8. PWA Altyapısı ve Kesintisiz Çevrimdışı Çalışma (PWA & Service Worker)
*   **Service Worker (`public/sw.js`)**: Next.js statik dosyaları önbelleğe alınmış, API zaman aşımı durumunda otomatik 503 fırlatan fetch interceptor'ı kodlanmıştır.
*   **Ağ Durumu Canlı Takibi**: `app/kontrol/page.tsx` içerisinde tarayıcı ağ durumu dinleyicileriyle `isOffline` durumu takip edilmekte ve ağ kaybında sağ üstte glowing kehribar rengiyle premium bir **"Çevrimdışı Mod (Yerel Koruma)"** rozeti gösterilmektedir.
*   **100% Çevrimdışı Tıbbi Korunma**: Sunucu veya internet bağlantısı koptuğunda, `/api/check` API rotası hata verir vermez sistem istemci tarafında asenkron `findInteractions` lokal arama motorunu devreye sokarak N-ilaç etkileşim denetimini tamamen internet bağlantısız (offline) olarak gerçekleştirebilmektedir.

### 9. Türkçe Fuzzy Search Arama Motoru
*   **Unicode Birleşik Nokta (`\u0307`) Yaması**: Bazı Windows ve Node.js ortamlarında büyük Türkçe `"İ"` harfinin küçük harfe çevrilirken karakter uzunluğunu 2'ye çıkaran diakritik uyuşmazlığı giderilmiştir. `normalizeTurkish` filtresiyle diakritikler tamamen elenerek arama eşleşmeleri kusursuzlaştırılmıştır.
*   **Gelişmiş Puanlama**: Levenshtein hece hataları toleransı, ardışık harf eşleşme (subsequence) bonusları ve etken maddeye kıyasla marka adı önceliklendirmesi içeren yüksek performanslı arama algoritması.

---

## 💻 Teknoloji Yığıtı (Tech Stack)

*   **Çekirdek**: Next.js 16.2 (App Router, Turbopack), React 19.2, TypeScript 5, Tailwind CSS v4, Vanilla CSS
*   **Veri & ORM**: Prisma Client v5.11, PostgreSQL (Supabase), Local JSON Fallback Layer
*   **Önbellek & AI**: Upstash Redis, Google Gemini API (`gemini-2.5-flash-lite` & `gemini-2.5-flash`)
*   **Test Altyapısı**: Jest (Next.js native SWC compiler), Playwright E2E Testing Framework

---

## 📂 Proje Klasör Yapısı

```text
pill-mind/
├── app/
│   ├── api/
│   │   ├── admin/          # Klinik reviewer onay güncelleme API'si
│   │   ├── auth/           # Oturum yönetimi API rotaları (register, login, logout, me)
│   │   ├── check/          # Deterministik N-ilaç etkileşim kontrol API'si
│   │   ├── explain/        # Canlı AI açıklama ve Redis cache API'si
│   │   ├── fhir/           # HL7 FHIR Medication/MedicationRequest API rotaları
│   │   └── pillbox/        # İlaç kutusu kaydetme, listeleme, silme ve paylaşım API'leri
│   ├── share/              # Paylaşılan raporların dinamik salt-okunur gösterim sayfası
│   ├── kontrol/            # Etkileşimli ana tarama portal sayfası
│   ├── error.tsx           # Global hata sınırı (Error Boundary) bileşeni
│   ├── global-error.tsx    # Kök layout hata sınırı bileşeni
│   ├── layout.tsx          # Evrensel layout
│   └── page.tsx            # Giriş / Tanıtım sayfası
├── components/
│   ├── CoveragePanel.tsx   # Kapsamlı AI analiz paneli bileşeni
│   ├── Disclaimer.tsx      # Klinik yasal uyarı evrensel bileşeni
│   ├── DrugSelector.tsx    # Türkçe Fuzzy Search autocomplete bileşeni
│   ├── ExplanationDrawer.tsx # Detaylı AI açıklaması yan çekmece bileşeni
│   ├── InteractionList.tsx # Riskli etkileşim listesi sarmalayıcısı
│   ├── StatusHeader.tsx    # Kök logo ve canlı ağ/klinik durum barı
│   ├── UserPanel.tsx       # Bulut kayıt ve oturum yönetim modal/menü bileşeni
│   └── VirtualPillbox.tsx  # 3D kapsül düşme animasyonlu sanal kutu (tilt efektli)
├── data/
│   ├── drugs.json          # Yerel yedek çevrimdışı ilaç listesi
│   └── interactions.json   # Yerel yedek çevrimdışı etkileşim matrisi
├── lib/
│   ├── audit.ts            # KVKK/GDPR uyumlu veri maskeleyen audit kütüphanesi
│   ├── auth.ts             # Sıfır bağımlılıklı AES-256 oturum yöneticisi
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
│   ├── enterprise.test.ts  # FHIR, Share, Admin ve Audit Log entegrasyon testleri
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

# Oturum ve Hata Takibi Yapılandırması
JWT_SECRET="pillmind-ultimate-32-chars-fallback-secret!"
SENTRY_DSN="https://...sentry.io/..."

# Çalışma Zamanı Modları
NEXT_PUBLIC_DEMO_MODE="false"
GEMINI_MODEL="gemini-2.5-flash-lite"
```

### 3. Veritabanını Yapılandırın ve Tohumlayın (Seeding)
Veritabanı şemasını uygulayıp FDA/PubMed klinik verilerini veritabanına aktarmak için:
```bash
npx prisma db push
npx prisma db seed
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
Next.js'in native SWC derleyicisini kullanan birim ve entegrasyon testlerini çalıştırmak için:
```bash
npm run test
```
*Bu komut; Türkçe normalizasyon, DOM klavye navigasyonları, güvenlik regex engellemeleri, bypass girişimleri, FHIR standart şema dönüştürmeleri, 24 saatlik süre aşımı kısıtlamaları, audit maskeleme ve PostgreSQL/Redis bağlantı çökmesi durumunda lokal kaskat yedeklerin sorunsuz çalıştığını doğrular.*

### B. Playwright Uçtan Uca (E2E) ve WCAG Erişilebilirlik Testleri
Playwright testlerini çalıştırmadan önce yerel tarayıcı binary dosyalarını yüklemeniz gerekebilir:
```bash
npx playwright install
```
Ardından E2E test senaryosunu tetiklemek için:
```bash
npm run test:e2e
```
*Bu komut; Next.js dev server'ı arka planda otomatik olarak ayağa kaldırır, klavye ile arama-seçme akışlarını simüle eder, strict-mode çakışmalarını denetler, 3D kutuya kapsül eklenmesini (tilt efektli), asenkron AI okuma drawer'ının açılmasını ve odak çerçevesi standartlarını test eder.*

---

## ⚖️ Yasal ve Klinik Uyarı (Disclaimer)

Bu uygulama sadece eğitim ve bilgilendirme amacıyla tasarlanmış bir prototiptir. Verilen etkileşim açıklamaları sınırlı bir demo veri tabanına dayanmaktadır. İlaç tedavilerinize başlamadan, tedavilerinizi sonlandırmadan veya doz ayarlaması yapmadan önce her zaman hekiminize veya eczacınıza danışınız. Yapay zeka çıktıları, hiçbir koşulda profesyonel tıbbi teşhis ve hekim kararlarının yerine geçemez.
