# PillMind - Sunum Akışı (5 Dakika)

Bu doküman, hackathon jürisine sunum esnasında kullanılacak zihin haritası ve yapılandırılmış özetidir. (Slide kullanacaksanız bu yapıyı kullanabilirsiniz.)

---

## 🎯 Başlık ve "Pitch" (0:30 dk)
- **Başlık:** PillMind - Akıllı İlaç Güvenliği Asistanı
- **Tek Cümlelik Pitch:** "PillMind, sağlık verilerindeki karmaşayı çözen, küratörlü etkileşim verilerini yapay zeka yardımıyla hastaların kolayca kavrayabileceği bir dilde açıklayan bir güvenlik aracıdır."
- **Opening Hook (Kanca):** "Her yıl on binlerce insan, birbirine ters etki yapan ilaçları aynı anda kullandığı için hastanelik oluyor. Peki hastalar o uzun ve karmaşık prospektüsleri gerçekten anlıyor mu?"

## 🚨 Problem Algısı (0:45 dk)
- Hastalar birden fazla ilaç kullandığında olası yan etkilerden korkuyor.
- İnternetteki medikal veriler sıradan bir insanın anlayamayacağı kadar karmaşık (Klinik Jargon).
- Çok fazla yanlış bilgi var.
- İhtiyaç: Tıbbi geçerliliği olan verinin, hastaya "empatiyle" ve "anlaşılır" şekilde sunulabilmesi.

## 💊 Çözüm: PillMind (1:00 dk)
- İlaçları seçin, anında risk analizini görün.
- **Güvenlik Mimarimiz:** "Karar mekanizması doğrudan yapılandırılmış veri setlerinden gelir, yapay zeka ASLA tıbbi bir karar veremez. Yapay zeka sadece klinik veriyi sade Türkçeye çevirmek için kullanılır."
- Görsel ve dilsel olarak hiçbir zaman "tamamen güvendesiniz" vaadi verilmez.

## 🛠️ Teknoloji ve Mimari (0:45 dk)
- **Frontend / Backend:** Next.js (App Router), Tailwind CSS. (Çok modern ve hızlı)
- **AI Katmanı:** Google Gemini API (Sadece çeviri/açıklama rolü üstlenir).
- **Veri Doğrulama:** Mimariyi kanıtlamak için, resmi ve saygın klinik kaynaklardan teyit edilmiş sınırlı bir demo veri seti kurguladık.

## 🛡️ Etik, Güvenlik ve Sınırlar (0:30 dk)
- En gurur duyduğumuz yer burasıdır.
- Bir sağlık uygulamasında "Yeşil = Güvenli" demek felakettir.
- Etkileşim bulamadığımızda "Sistemimizde kayıtlı bilinen bir etkileşim bulunamadı ancak bu, etkileşimi olmadığı anlamına gelmez" diyoruz.
- Uygulama asla tanı koymuyor.

## 💻 Demo Geçişi (0:15 dk)
- "Şimdi size PillMind'ın analizleri nasıl yaptığını canlı olarak gösterelim."
- *(Burada `demo-script.md` dosyasına geçiş yapılır)*

## 🎤 Kapanış (0:15 dk)
- "PillMind, ne hastayı ne de doktoru yalnız bırakmıyor; ikisi arasındaki iletişimi güçlendiriyor. Bu hackathonda sadece kod değil, 'güvenilir bir yaklaşım' inşa ettik. Teşekkürler."

---

### Sunum İpuçları (2-3 Kişilik Ekipler İçin)
- **Kişi 1 (Problem & Çözüm):** Sunuma başlar, enerjiyi yükseltir, problemi anlatır.
- **Kişi 2 (Teknoloji & Demo):** Sözü devralır, mimariyi ve AI katmanını anlatıp demoyu yapar.
- **Kişi 3 (Güvenlik & QA / Varsa):** Etik duruşu ve veri doğrulama işini anlatıp jüri sorularını karşılar.
