<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# 💊 PillMind: Coded & Verified Project Features

This document tracks all features that are fully implemented, compiled, and tested (both via Jest unit tests and Playwright E2E tests) on the PillMind system. Untested or planned features are strictly excluded.

---

## 🏗️ 1. Klinik Altyapı ve Deterministik Çekirdek (Coded & Verified)
*   **PostgreSQL / Prisma Veri Katmanı**: Prisma ORM ile modellenen ve Supabase üzerinde barındırılan ilişkisel veritabanı yapısı. İlaçlar (`Drug`), etkileşimler (`DrugInteraction`) ve marka isimleri (`BrandName`) tabloları entegre edilmiştir.
*   **Prisma Singleton İstemcisi**: `lib/prisma.ts` içinde sunucu katmanında gereksiz bağlantı birikmesini önleyen kararlı singleton yapısı kurulmuştur.
*   **Tohumlama (Seeding) Mekanizması**: `prisma/seed.ts` dosyası aracılığıyla veri tabanına 10 temel ilaç ve 12 doğrulanmış etkileşim matrisi $O(1)$ çapraz sorgu performansı sağlayacak şekilde tohumlanmıştır.
*   **Çift Katmanlı Arama Motoru**: `lib/interactions.ts` ve `app/api/check/route.ts` rotaları aracılığıyla çoklu etkileşim taraması deterministik olarak sunulur. PostgreSQL bağlantısı aktifken SQL sorgusu, bağlantı koptuğunda ise lokal JSON fallback katmanı otomatik olarak devreye girer.

## 🛡️ 2. Yapay Zeka ve Çift Ajanlı Güvenlik Kalkanı (Coded & Verified)
*   **Structured Outputs (JSON Şeması)**: `lib/gemini.ts` içinde Gemini API ile entegre, tıp dilinden uzak, hastayı paniğe sevk etmeyen Türkçe klinik şema tanımlanmıştır (`girisCumlesi`, `klinikEtkiAciklamasi`, `hastalaraOneriler`, `hekimYonlendirmesi`).
*   **Türkçe Karakter Uyumlu Regex Güvenlik Kalkanı**: `UNSAFE_PATTERNS` regex mimarisiyle, Türkçe ekler ve hecelemeler dahil olmak üzere hekim yetkisini aşan tüm bypass girişimleri (`(?:^|[^a-zA-Z0-9ıİğĞüşŞöÖçÇ])`) lookaround sınırları ile deterministik olarak engellenir.
*   **Klinik Doğrulama Ajanı (Reviewer Agent)**: `runReviewerAgent` metoduyla, üretilen tıbbi metin hastaya gösterilmeden önce ikinci bir uzman ajan tarafından gerçek zamanlı taranır ve "EVET/HAYIR" kararıyla doğrulanır.
*   **Upstash Redis Önbellek Katmanı**: `lib/redis.ts` ve `/api/explain` rotası üzerinden, üretilen ve güvenlik onayından geçen açıklamalar 7 gün TTL ile önbelleğe alınarak sıfır gecikme (<50ms) ve sıfır AI maliyeti ile sunulur.

## 🎨 3. Premium Glassmorphic Arayüz ve 3D Sanal Kutu (Coded & Verified)
*   **Premium Tıp Estetiği**: Tailwind CSS v4 ve derin indigo degrade arka planları (`from-slate-900 to-indigo-950`), cam morfolojisi (`backdrop-blur-xl bg-white/5 border border-white/10`) ve akıcı 3D derinlik algısıyla donatılmış modern Türkçe portal tasarımı.
*   **Türkçe Fuzzy Search Arama Motoru**: `lib/fuzzySearch.ts` içinde Levenshtein mesafesi, ardışık harf subsequence puanlaması, marka/etken madde önceliklendirmesi ve Unicode birleştirici nokta (`\u0307`) temizleme filtreleri içeren gelişmiş arama algoritması.
*   **3D Sanal İlaç Kutusu (Virtual Pillbox)**: `components/VirtualPillbox.tsx` ile eklenen ilaçları görsel kapsüller şeklinde render eden, yerçekimi ve düşme animasyonlarıyla zenginleştirilmiş etkileşimli ilaç kutusu arayüzü.
*   **Katmanlama ve Taşma Kusursuzluğu (Layer & Overflow Perfection)**: Arama kutusu dropdown listesinin, 3D transform kullanan Virtual Pillbox'ın arkasında kalmasını veya üst kartın kırpılma alanı altında gizlenmesini önleyen özel `z-index` katmanlaması (`z-20` / `z-10`) ve `absolute inset-0 rounded-3xl overflow-hidden` kırpıcı ışıma katmanı entegre edilmiştir.
*   **Erişilebilirlik (WCAG 2.2 AA Uyumluluğu)**: Klavye ile gezinme (`Tab`, `ArrowDown`, `ArrowUp`, `Enter`, `Escape`), yüksek görünürlüklü odak halkaları (`focus:ring-indigo-500`) ve dinamik ekran okuyucu seslendirmeleri için `aria-live`, `aria-expanded` etiketleri entegre edilmiştir.

## 🚦 4. Sistem Dayanıklılığı ve Hata Toleransı (Coded & Verified)
*   **PostgreSQL / Supabase Kesinti Resilyansı**: Veritabanı sorgusu koptuğunda veya yavaşladığında, sistemin çökmeden asenkron `try/catch` bloğu üzerinden `data/drugs.json` ve `data/interactions.json` lokal JSON yedek katmanına otomatik geçmesi.
*   **Redis Caching Kesinti Resilyansı**: Redis sunucusu çevrimdışı olduğunda, önbellek okuma/yazma hatalarının `try/catch` ile sessizce loglanması ve doğrudan canlı Gemini API katmanına kesintisiz geçilmesi.
*   **Gemini API Kota ve Hata Yönetimi**: Model `429` (Rate Limit) veya `Timeout` verdiğinde `MODEL_CHAIN` (`gemini-2.5-flash-lite` -> `gemini-2.5-flash`) üzerinden otomatik model geçişi yapılması ve tüm AI katmanları koptuğunda "Canlı AI Şu Anda Kullanılamıyor" hata kartının gösterilmesi.

## 🧪 5. Kalite Güvence ve Test Kapsamı (Coded & Verified)
*   **Birim ve Entegrasyon Testleri (Jest / Next SWC Compiler)**:
    *   `tests/fuzzySearch.test.ts`: Türkçe karakter toleransı, Levenshtein typos, subsequence puanlaması ve boş/nonsense input direnci test edilmiştir.
    *   `tests/safetyFilter.test.ts`: Tıbbi bypass promptları, ekler ve çekim grupları, custom lookaround regex doğrulamaları ve safe-clinical geçişleri test edilmiştir.
    *   `tests/resilience.test.ts`: Asenkron yarış koşullarından arındırılmış, veritabanı kesintisinde deterministik lokal JSON fallback ve Redis kesintisi geçişleri test edilmiştir.
*   **Uçtan Uca (E2E) Testleri (Playwright)**:
    *   `tests/e2e.spec.ts`: Autocomplete klavye gezinimi, seçili chip strict mode yönetimi, dinamik buton ARIA nitelikleri (`button[aria-controls^='explain-drawer-']`), asenkron drawer açılma durumları ve odak halkası standartları test edilmiştir.
