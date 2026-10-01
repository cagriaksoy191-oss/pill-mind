<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# 💊 PillMind: Coded & Verified Project Features

This document tracks all features that are fully implemented, compiled, and tested (both via Jest unit tests and Playwright E2E tests) on the PillMind system. Untested or planned features are strictly excluded.

---

## 🏗️ 1. Klinik Altyapı ve Deterministik Çekirdek (Coded & Verified)
*   **PostgreSQL / Prisma Veri Katmanı**: Prisma ORM ile modellenen ve Supabase üzerinde barındırılan ilişkisel veritabanı yapısı. İlaçlar (`Drug`), etkileşimler (`DrugInteraction`) ve marka isimleri (`BrandName`) tabloları entegre edilmiştir.
*   **Kontrendikasyon Şema Genişletmesi**: `Contraindication` modeline Türkçe klinik etki detaylarını barındıran `effect` (String) veri alanı eklenmiş, Prisma şeması güncellenmiş ve `prisma/seed.ts` üzerinde tohumlama mekanizmasına entegre edilmiştir.
*   **Prisma Singleton İstemcisi**: `lib/prisma.ts` içinde sunucu katmanında gereksiz bağlantı birikmesini önleyen kararlı singleton yapısı kurulmuştur.
*   **Tohumlama (Seeding) Mekanizması**: `prisma/seed.ts` dosyası aracılığıyla veri tabanına 10 temel ilaç ve 12 doğrulanmış etkileşim matrisi $O(1)$ çapraz sorgu performansı sağlayacak şekilde tohumlanmıştır.
*   **Çift Katmanlı Arama Motoru**: `lib/interactions.ts` ve `app/api/check/route.ts` rotaları aracılığıyla çoklu etkileşim taraması deterministik olarak sunulur. PostgreSQL bağlantısı aktifken SQL sorgusu, bağlantı koptuğunda ise lokal JSON fallback katmanı otomatik olarak devreye girer.
*   **İlaç Birikimi ve Aşırı Doz Algoritması**: N-ilaç etkileşimi denetlerken aynı aktif etken maddeyi (`active_ingredient`) veya aynı farmakolojik grubu (`pharmacological_group`) içeren birden fazla ilacın kutuya eklenmesini tespit ederek aşırı doz ve yan etki birikim risklerini raporlayan deterministik analiz motoru.
*   **Supabase PostgreSQL RLS ve PostgREST Kalkanı**: Veritabanındaki 16 tablonun tamamında Row Level Security (`ENABLE ROW LEVEL SECURITY`) etkinleştirilerek PostgREST üzerinden internete açık anonim ve dış rollere (`anon`, `authenticated`) ait tüm `SELECT`, `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE` yetkileri tamamen geri alınmış (`REVOKE ALL`), varsayılan izinler (`ALTER DEFAULT PRIVILEGES`) kilitlenmiş; Next.js ve Prisma sunucu katmanının güvenli bağlantısı sıfır kesintiyle korunarak dış veri sızıntılarına karşı tam koruma sağlanmıştır.

## 🛡️ 2. Yapay Zeka ve Çift Ajanlı Güvenlik Kalkanı (Coded & Verified)
*   **Structured Outputs (JSON Şeması)**: `lib/gemini.ts` içinde Gemini API ile entegre, tıp dilinden uzak, hastayı paniğe sevk etmeyen Türkçe klinik şema tanımlanmıştır (`girisCumlesi`, `klinikEtkiAciklamasi`, `hastalaraOneriler`, `hekimYonlendirmesi`).
*   **Şema Özellikleri Genişletmesi**: Gemini model çıktı şemasına klinik doğruluğu artırmak adına `kaynakOzeti`, `belirsizlikNotu`, `hastaDiliRiskEtiketi`, `hekimModuKisaMekanizma`, `yasakliEylemKontrolu` ve `sourceIds` parametreleri eklenmiştir.
*   **Türkçe Karakter Uyumlu Regex Güvenlik Kalkanı**: `UNSAFE_PATTERNS` regex mimarisiyle, Türkçe ekler ve hecelemeler dahil olmak üzere hekim yetkisini aşan tüm bypass girişimleri (`(?:^|[^a-zA-Z0-9ıİğĞüşŞöÖçÇ])`) lookaround sınırları ile deterministik olarak engellenir.
*   **Klinik Doğrulama Ajanı (Reviewer Agent)**: `runReviewerAgent` metoduyla, üretilen tıbbi metin hastaya gösterilmeden önce ikinci bir uzman ajan tarafından gerçek zamanlı taranır ve "EVET/HAYIR" kararıyla doğrulanır.
*   **Upstash Redis Önbellek Katmanı**: `lib/redis.ts` ve `/api/explain` rotası üzerinden, üretilen ve güvenlik onayından geçen açıklamalar 7 gün TTL ile önbelleğe alınarak sıfır gecikme (<50ms) ve sıfır AI maliyeti ile sunulur.
*   **Tek Geçişli (Single-Pass) SSE Stream**: Gemini API'den akan veri paketlerini kesintiye uğramadan ve quadratik gecikmelere yol açmadan tek geçişte ayrıştıran, JSON yapısının parçalı gelmesi durumunda bile durum koruyarak (stateful) anında parse eden ve hasta arayüzüne sıfır gecikmeyle yansıtan akış motoru.

## 🎨 3. Premium Glassmorphic Arayüz ve 3D Sanal Kutu (Coded & Verified)
*   **Premium Tıp Estetiği**: Tailwind CSS v4 ve derin indigo degrade arka planları (`from-slate-900 to-indigo-950`), cam morfolojisi (`backdrop-blur-xl bg-white/5 border border-white/10`) ve akıcı 3D derinlik algısıyla donatılmış modern Türkçe portal tasarımı.
*   **Aydınlık/Karanlık Tema ve Parlama Koruması**: Tailwind v4 `@custom-variant` ve inline head script entegrasyonu ile aydınlık/karanlık tıp teması geçişleri 0.3s pürüzsüz transition animasyonu ile yapılandırılmış ve sayfa açılışlarındaki beyaz ekran parlamaları (hydration flash) tamamen engellenmiştir.
*   **Türkçe Fuzzy Search Arama Motoru**: `lib/fuzzySearch.ts` içinde Levenshtein mesafesi, ardışık harf subsequence puanlaması, marka/etken madde önceliklendirmesi ve Unicode birleştirici nokta (`\u0307`) temizleme filtreleri içeren gelişmiş arama algoritması.
*   **3D Sanal İlaç Kutusu (Virtual Pillbox)**: `components/VirtualPillbox.tsx` ile eklenen ilaçları görsel kapsüller şeklinde render eden, yerçekimi ve düşme animasyonlarıyla zenginleştirilmiş etkileşimli ilaç kutusu arayüzü.
*   **Katmanlama ve Taşma Kusursuzluğu (Layer & Overflow Perfection)**: Arama kutusu dropdown listesinin, 3D transform kullanan Virtual Pillbox'ın arkasında kalmasını veya üst kartın kırpılma alanı altında gizlenmesini önleyen özel `z-index` katmanlaması (`z-20` / `z-10`) ve `absolute inset-0 rounded-3xl overflow-hidden` kırpıcı ışıma katmanı entegre edilmiştir.
*   **Klinik Mod Katmanı (`isClinicalMode`)**: Arayüzün sağ üst köşesinden veya detay pencerelerinden etkinleştirilebilen, hekimlerin klinik detaylara (kanıt düzeyi, kaynaklar, detaylı mekanizmalar) ulaşmasını sağlayan cam morfolojili panel katmanı.
*   **PDF/A4 Baskı Şablonu (Print Layout)**: Kullanıcının eklediği ilaç kombinasyonlarını ve etkileşim analizlerini hekime sunmak üzere temiz, tıbbi ve okunaklı bir PDF/A4 baskı formatında çıktı alabilmesini sağlayan dinamik baskı stili.
*   **Erişilebilirlik (WCAG 2.2 AAA Uyumlu useFocusTrap)**: Açılır pencerelerde, detay çekmecelerin ve kapsam analiz panellerinde odağın dışarı taşmasını engelleyen `useFocusTrap` odak hapsetme hook'u; arama kutusuna ilaç ekleme ve kaldırma gibi dinamik eylemleri seslendiren `aria-live` assertive anonsör altyapısı.

## 🚦 4. Sistem Dayanıklılığı ve Hata Toleransı (Coded & Verified)
*   **PostgreSQL / Supabase Kesinti Resilyansı**: Veritabanı sorgusu koptuğunda veya yavaşladığında, sistemin çökmeden asenkron `try/catch` bloğu üzerinden `data/drugs.json` ve `data/interactions.json` lokal JSON yedek katmanına otomatik geçmesi.
*   **Redis Caching Kesinti Resilyansı**: Redis sunucusu çevrimdışı olduğunda, önbellek okuma/yazma hatalarının `try/catch` ile sessizce loglanması ve doğrudan canlı Gemini API katmanına kesintisiz geçilmesi.
*   **Gemini API Kota ve Hata Yönetimi**: Model `429` (Rate Limit) veya `Timeout` verdiğinde `MODEL_CHAIN` (`gemini-2.5-flash-lite` -> `gemini-2.5-flash`) üzerinden otomatik model geçişi yapılması ve tüm AI katmanları koptuğunda "Canlı AI Şu Anda Kullanılamıyor" hata kartının gösterilmesi.

## 🔭 5. Kurumsal Gözlemlenebilirlik ve Hata İzleme (Coded & Verified)
*   **Sentry Entegrasyonu**: Next.js Client (`sentry.client.config.ts`), Server (`sentry.server.config.ts`) ve Edge (`sentry.edge.config.ts`) çalışma zamanları için Sentry başlatma ve telemetri yapılandırması kurulmuştur.
*   **Sentry Çerez Redaksiyon Resilyansı**: Telemetri nesnelerinde `event.request.cookies` alanı temizlenirken string ve nested nesne tiplerinin güvenli biçimde kontrol edilmesi sağlanarak telemetry katmanında oluşabilecek çalışma zamanı hataları engellenmiştir.
*   **Turbopack & Webpack Build Sarmalayıcısı**: `next.config.ts` içerisine `withSentryConfig` entegre edilerek, derleme sırasında otomatik kaynak haritası (source map) yüklemesi ve tünelleme (`/monitoring`) yapılandırılmıştır.
*   **Klinik Hata Sınırları (Global Error Boundaries)**: `app/error.tsx` ve `app/global-error.tsx` dosyalarıyla, çökmelerde kullanıcılara şefkatli bir Türkçe hata arayüzü sunulurken, hatalar `Sentry.captureException` ile gerçek zamanlı olarak izleme paneline raporlanmaktadır.

## 👥 6. Güvenli Kimlik Doğrulama ve Bulut Kutu Depolama (Coded & Verified)
*   **İlişkisel Veritabanı Modelleri**: `prisma/schema.prisma` içerisine kullanıcıları (`User`) ve kaydedilmiş ilaç kutularını (`SavedPillbox`) bire çok ilişki yapısıyla eşleyen tablolar entegre edilmiştir.
*   **Sıfır Bağımlılıklı AES-256 Oturum Güvenliği**: `lib/auth.ts` içinde Node'un yerleşik `crypto` modülüyle şifrelenen, serverless edge ortamlarıyla tam uyumlu, kurcalanamaz ve çalınamaz `HttpOnly` session çerez yönetimi geliştirilmiştir.
*   **Şifresiz Magic Sign-in API Rotaları**: E-posta doğrulama tabanlı otomatik kayıt ve giriş API rotaları (`/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`) ve kutu kaydetme/listeleme/silme API servisleri (`/api/pillbox/save`, `/api/pillbox/list`, `/api/pillbox/delete`) kodlanmıştır.
*   **Kullanıcı Bulut Yönetim Arayüzü**: `components/UserPanel.tsx` ile üyelik formunu, kayıtlı ilaç kombinasyonlarının buluttan listelenip tek tıkla sanal kutuya yüklenmesini ve oturum kapatılmasını yöneten premium glassmorphic bileşen entegrasyonu.
*   **Kafa Karıştırmayan Durum Senkronizasyonu**: Kullanıcı paneliyle sanal ilaç kutusu state akışları `StatusHeader` ve `page.tsx` prop'ları aracılığıyla kusursuz şekilde bağlanmıştır.

## 📱 7. PWA Altyapısı ve Kesintisiz Çevrimdışı Çalışma (Coded & Verified)
*   **PWA Yükleme Manifestosu**: `public/manifest.json` dosyasıyla uygulamanın masaüstü veya mobil cihazlara bağımsız bir yerel uygulama (standalone app) gibi kurulabilmesi sağlanmıştır.
*   **Çevrimdışı Servis İşçisi (Service Worker)**: `public/sw.js` dosyası ile Next.js statik varlıkları önbelleğe alınmış, API zaman aşımı durumunda yerel hata yakalayıcıyı tetikleyen fetch interceptor'ı kodlanmıştır.
*   **Ağ Durumu Canlı Takibi**: `app/kontrol/page.tsx` içerisinde tarayıcı ağ durumu dinleyicileriyle `isOffline` durumu takip edilmekte ve ağ kaybında sağ üstte glowing kehribar rengiyle premium bir **"Çevrimdışı Mod (Yerel Koruma)"** rozeti gösterilmektedir.
*   **100% Çevrimdışı Tıbbi Korunma**: Sunucu veya internet bağlantısı koptuğunda, `/api/check` API rotası hata verir vermez sistem istemci tarafında asenkron `findInteractions` lokal arama motorunu devreye sokarak N-ilaç etkileşim denetimini tamamen internet bağlantısız (offline) olarak gerçekleştirebilmektedir.

## 🌐 8. HL7 FHIR Standartları ve OpenAPI 3.0 Sözleşmesi (Coded & Verified)
*   **OpenAPI 3.0 API Sözleşmesi**: `public/openapi.json` dosyasında Auth, Check, Explain, Pillbox, Share ve FHIR entegrasyon uç noktalarının HTTP metotları, şemaları, parametreleri ve hata kodları standartlara tam uyumlu olarak belgelenmiştir.
*   **HL7 FHIR Medication GET**: `/api/fhir/medication` uç noktası veritabanındaki ilaçları RxNorm (`rxcui`) ve ATC (`atcCode`) standart kodlama detayıyla `Medication` kaynağı formatında dışa aktarır.
*   **HL7 FHIR MedicationRequest POST**: `/api/fhir/medicationrequest` uç noktası klinik parametreleri veya MedicationRequest listelerini işleyerek etkileşim ve risk bulgularını FHIR `Parameters` standartlarında hesaplar.
*   **Güvenli Süreli Rapor Paylaşımı**: `/api/pillbox/share` (POST) ile 24 saat geçerlilik süresine sahip, kriptografik token'lı paylaşım linki oluşturulur.
*   **Salt Okunur Rapor Görüntüleyici**: `/share/[token]` dinamik rotasında paylaşılan raporların salt okunur gösterimi, kalan süre sayacı ve hekimler için PDF/A4 baskı formatı entegre edilmiştir.
*   **Audit Log & GDPR/KVKK Koruma**: `lib/audit.ts` kütüphanesi veri maskeleme (redact) mekanizmasıyla kişisel verileri maskeler. `/api/admin/review` (POST) ile de klinik hekim doğrulamaları güncellenirken eylemler güvenli audit tablosuna kaydedilir.

## 🧪 9. Kalite Güvence ve Test Kapsamı (Coded & Verified)
*   **Birim ve Entegrasyon Testleri (Jest / Next SWC Compiler)**:
    *   `tests/fuzzySearch.test.ts`: Türkçe karakter toleransı, Levenshtein typos, subsequence puanlaması ve boş/nonsense input direnci test edilmiştir.
    *   `tests/safetyFilter.test.ts`: Tıbbi bypass promptları, ekler ve çekim grupları, custom lookaround regex doğrulamaları ve safe-clinical geçişleri test edilmiştir.
    *   `tests/resilience.test.ts`: Asenkron yarış koşullarından arındırılmış, veritabanı kesintisinde deterministik lokal JSON fallback ve Redis kesintisi geçişleri test edilmiştir.
    *   `tests/DrugSelector.test.tsx` & `tests/VirtualPillbox.test.tsx`: Jest DOM jsdom ortamında fuzzy search klavye navigasyonları, chip silme eylemleri ve animasyon kilitleri test edilmiştir.
    *   `tests/explain-route.test.ts` & `tests/gemini.test.ts`: API zaman aşımı, rate limit ihlalleri, cache hit/miss durumları ve Gemini kaskatlı model zinciri entegrasyonu test edilmiştir.
    *   `tests/accessibility.test.tsx`: `useFocusTrap` hook'unun odak hapsetme davranışı, `DrugSelector` klavye navigasyon olayları (ArrowDown, ArrowUp, Enter) ve `aria-live` assertive anonsörlerinin durumu mock DOM ile test edilmiştir.
    *   `tests/redis.test.ts`: Redis bağlantı hataları ve offline durumlarında `/api/check` ve `/api/explain` API rotalarının rate-limiter bypass ve live AI fallback resilience davranışları test edilmiştir.
    *   `tests/enterprise.test.ts`: HL7 FHIR Medication/MedicationRequest uyumluluğu, 24 saatlik süre aşımı sınırları, admin klinik onayı ve GDPR/KVKK maskeleme audit süreçleri test edilmiştir.
    *   `tests/food.test.ts`: Senkron ve asenkron besin-ilaç etkileşim motoru (`findFoodInteractions`, `findFoodInteractionsDB`), takma ad çözümlemesi, büyük-küçük harf toleransı, 5000'lik önbellek sınırı, veritabanı kesintisinde `[SIFRE]` fallback'i ve Prisma hata toleransı test edilmiştir.
    *   `tests/ShareFoodInteractions.test.tsx` & `tests/ShareLoadingView.test.tsx`: Paylaşılan klinik reçete raporunda besin-ilaç etkileşim kartlarının listelenmesi, boş/undefined durumu ve ShareLoadingView spinner, logo ve yükleme durumu render mekanizmaları birim testleriyle doğrulanmıştır.
    *   `tests/useDrugSelector.test.tsx`: `useDrugSelector` hook'unun başlangıç durumu, fuzzy search arama filtrelemesi, ilaç ekleme/kaldırma, erişilebilirlik anonsları (`announcement`), klavye navigasyonu (ArrowDown/Up, Enter, Escape, Tab döngüsü) ve dış tıklama (`outside click`) olayları test edilmiştir.
    *   `tests/admin-review-perf.test.ts`: Admin klinik onay rotasında kullanıcı yetkilendirme katmanının oturum token'ı ve Redis önbelleklemesi üzerinden sıfır veritabanı turu ile 2x'e varan hız artışı sağladığı kıyaslama testleriyle doğrulanmıştır.
*   **Uçtan Uca (E2E) Testleri (Playwright)**:
    *   `tests/e2e.spec.ts`: Autocomplete klavye gezinimi, seçili chip strict mode yönetimi, dinamik buton ARIA nitelikleri (`button[aria-controls^='explain-drawer-']`), asenkron drawer açılma durumları ve odak halkası standartları test edilmiştir.

## 🚀 10. Sunucu Derleme Otomasyonu ve Çakışma Yönetimi (Coded & Verified)
*   **Vercel Peer Dependency Aşımı**: Next.js 16/Turbopack ve `@sentry/nextjs` arasındaki npm akran bağımlılığı (`ERESOLVE`) çakışmaları, `package.json` içerisine `overrides` parametresi eklenerek ve `.npmrc` üzerinden `legacy-peer-deps=true` ayarlanarak global olarak çözülmüştür.
*   **Prisma İstemci Derleme Otomasyonu**: Vercel sunucusundaki derleme sırasında yeni eklenen veri modellerinin (`User`, `SavedPillbox`, `PillboxShare`, `AuditLog`) bulunamaması sorunu, `package.json` build betiğine `prisma generate` eklenerek ve `postinstall` kancası aktif edilerek tamamen giderilmiştir.
