# 🗄️ PillMind PostgreSQL ve Supabase Kurulum Kılavuzu

Bu kılavuz, PillMind uygulamasını **Faz 1: Veritabanı ve Klinik Altyapı** kapsamında PostgreSQL (Supabase) veritabanına bağlamak, veritabanı şemasını oluşturmak ve tohum verileriyle doldurmak için yapılması gereken adımları içerir.

---

## 🚀 Adım 1: Supabase Üzerinde Veritabanı Oluşturma

1. [Supabase Console](https://supabase.com) adresine gidin ve giriş yapın.
2. **New Project** (Yeni Proje) butonuna tıklayın.
3. Proje adı olarak `PillMind` yazın, güvenli bir veritabanı şifresi belirleyin ve bölge olarak Türkiye'ye en yakın konumu (örneğin *Frankfurt - eu-central-1*) seçin.
4. Projenin oluşturulması için 1-2 dakika bekleyin.

---

## 🔑 Adım 2: Bağlantı Linklerini Alma ve .env Yapılandırması

Supabase paneline girdikten sonra:

1. Sol menüden **Project Settings** (Proje Ayarları) > **Database** alanına gidin.
2. Sayfayı aşağı kaydırarak **Connection string** alanını bulun.
3. **Prisma** sekmesini seçin:
   * Burada size iki farklı bağlantı linki gösterilecektir: `Transaction` (Pgbouncer kullanan mod) ve `Session/Direct` modları.
4. Proje ana dizinindeki `.env.local` dosyasını açın ve bağlantı linklerini aşağıdaki gibi düzenleyin:

```bash
# Google Cloud API Key (Gemini açıklama katmanı için)
GOOGLE_API_KEY="GERCEK_GEMINI_API_ANAHTARINIZ"

# Demo modu (true = sadece mock yanıtlar, false = Gemini aktif)
NEXT_PUBLIC_DEMO_MODE=false

# Gemini model adı
GEMINI_MODEL=gemini-2.5-flash-lite

# PostgreSQL Veritabanı Bağlantı Linkleri (Supabase / Prisma)
DATABASE_URL="postgresql://postgres.[PROJE_ID]:[SIFRE]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.[PROJE_ID]:[SIFRE]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"
```

> 💡 **Önemli Not:** Şifrenizde özel karakterler (örneğin `@`, `*`, `!`) varsa, bu karakterleri URL formatına uygun olarak kodlamanız gerekebilir (Örn: `@` yerine `%40`).

---

## 🛠️ Adım 3: Bağımlılıkları Yükleme ve Migration Çalıştırma

Projenin kurulu olduğu terminalde aşağıdaki komutları sırasıyla çalıştırın:

### 1. NPM Paketlerini Yükleyin
```bash
npm install
```

### 2. Prisma Şemasını Veritabanına Yansıtın (Migration)
Prisma, oluşturduğumuz `prisma/schema.prisma` dosyasını tarayarak Supabase üzerinde gerekli tüm tabloları, indeksleri ve ilişkileri otomatik oluşturacaktır:

```bash
npx prisma migrate dev --name init
```

Bu komut başarıyla tamamlandığında veritabanınızda `Drug`, `BrandName`, `DrugInteraction`, `FoodInteraction` ve `Contraindication` tabloları hazır olacaktır.

### 3. Tohum Verilerini (Seed) Yükleyin
Lokal JSON dosyalarımızda bulunan 10 temel ilacı, alternatif marka adlarını (örneğin Aspirin için *Coraspin* ve *Ecopirin*), 12 doğrulanmış etkileşim kaydını ve ek olarak besin etkileşimlerini veritabanına yüklemek için:

```bash
npx prisma db seed
```

Komut sonrasında ekranda şu çıktıyı görmelisiniz:
```text
🌱 Veritabanı tohumlama işlemi başladı...
🧹 Eski veriler temizlendi.
   10 adet temel ilaç ve alternatif marka isimleri yüklendi.
🔗 12 adet doğrulanmış ilaç-ilaç etkileşim kaydı yüklendi.
🥗 Warfarin için besin etkileşimleri eklendi.
🏁 Tohumlama başarıyla tamamlandı!
```

---

## 🔍 Adım 4: Gelişmiş Kontrol ve Testler

Uygulamayı geliştirme modunda başlatın:
```bash
npm run dev
```

Artık `/kontrol` sayfasına gidip ilaç seçtiğinizde, sorgular anlık olarak lokal JSON dosyaları yerine **Supabase PostgreSQL** üzerinden çekilecektir. 

### 🛡️ Güvenlik ve Fallback Testi
Eğer herhangi bir sebeple veritabanı bağlantınız koparsa veya `.env.local` içindeki `DATABASE_URL` boş bırakılırsa, yazdığımız esnek fallback sistemi sayesinde uygulama çökmez; otomatik olarak lokal JSON dosyalarından tarama yapmaya devam eder. Terminal loglarında bu geçişi görebilirsiniz:
`[PillMind CMIO Engine] Veritabanı tanımlı değil. Lokal JSON kontrolü yapılıyor.`
