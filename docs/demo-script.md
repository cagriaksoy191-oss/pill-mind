# PillMind - Hackathon Demo Akışı 🚀

Bu doküman, jüriye yapılacak canli demo için kilitlenmiş, saniye-saniye akış planıdır.

**Hedef:** Güvenli, hatasız ve etkileyici bir akış sağlamak. Tıbbi iddialarda bulunmadan, uygulamanın teknik ve UX gücünü göstermek.

---

## 🎭 Ön Hazırlık
- `npm run dev` çalışıyor olmalı.
- Google Chrome'da `http://localhost:3000` tam ekran açılmış olmalı.
- Sekmeler temiz, bildirimler kapalı.

## ⏱️ Adım Adım Akış (Önerilen Süre: 90 Saniye)

### [00:00 - 00:15] Bölüm 1: Ana Sayfa ve "Hook"
* (Ekranda Ana Sayfa açık. Farenizle yavaşça "Klinik Kaynaklardan Derlenmiş Ön İzleme Verisi" ibaresini gösterin.)
* **Sunucu:** "PillMind'a hoş geldiniz. Hasta güvenliği için tasarladığımız ilaç etkileşim aracımız. Hackathon için tıbbi doğruluğunu resmi ve saygın klinik kaynaklardan teyit ettiğimiz özel bir demo veri seti ile çalışıyoruz. Sistemi görelim."
* **Eylem:** 'İlaçları Kontrol Et' butonuna tıkla.

### [00:15 - 00:40] Bölüm 2: Kırmızı Senaryo (Yüksek Risk)
* **Sunucu:** "Örneğin, hastamızın diş ağrısı için Aspirin ve kalp rahatsızlığı için Warfarin (Coumadin) kullandığını varsayalım."
* **Eylem:** Arama barından **Aspirin** ve **Warfarin** seç.
* **Eylem:** 'Kontrol Et (2 ilaç seçildi)' butonuna bas.
* **Sunucu:** "Arka planda sistemimiz küratörlü demo veri setimizi tarıyor..." (Yükleme anında kısa bir es)
* (Sonuç kırmızı kart olarak gelir)
* **Sunucu:** "Sistem küratörlü verimizdeki eşleşmeyi buldu ve yüksek etkileşim potansiyeli nedeniyle uyarıyı verdi. Bu noktada hastanın karmaşık medikal jargonu anlaması zor olabilir. İşte burada server-side API katmanımızda Google Gemini devreye giriyor."
* **Eylem:** 'Detayı gör ▼' butonuna tıkla.
* **Sunucu:** "Gemini, hastayı paniğe sevk etmeden, anlaşılır bir Türkçe ile etkileşimin 'nedenini' açıklıyor. Alt kısımda ise jürinin en çok önemsediği konuyu, verimizin kaynağının transparan bir şekilde hastaya gösterildiğini görüyorsunuz."

### [00:40 - 00:60] Bölüm 3: Sarı Senaryo (Orta Risk)
* **Eylem:** (En alttaki) 'Yeni Kontrol Yap' butonuna tıkla. Ardından **İbuprofen** ve **Enalapril** seç.
* **Sunucu:** "Farklı bir kombinasyon deneyelim. Tansiyon ilacıyla alınan sıradan bir ağrı kesici."
* **Eylem:** 'Kontrol Et (2 ilaç seçildi)' butonuna bas.
* (Sonuç sarı kart olarak gelir)
* **Sunucu:** "Bu kez 'Sarı' uyarı alıyoruz. Etkileşim var ama doğrudan hayati tehlike yerine, doktor tarafından izlenmesi gereken bir durum (tansiyon düşürücü etkinin azalması). AI bunu yine empatiyle açıklıyor."

### [00:60 - 01:15] Bölüm 4: Boş Senaryo (Nötr)
* **Eylem:** 'Yeni Kontrol Yap' butonuna tıkla. Ardından **Parasetamol** ve **Amoksisilin** seç.
* **Eylem:** 'Kontrol Et (2 ilaç seçildi)' butonuna bas.
* (Sonuç bilgi kartı veya boş veri döner)
* **Sunucu:** "İşte en kritik nokta. Tıbbi araçlarda 'Bu kombinasyon güvenli!' demek çok risklidir. Bu yüzden ekranda 'Güvenli' yerine 'Sistemimizde kayıtlı bilinen bir etkileşim bulunamadı' mesajı ve 'Bu, etkileşim olmadığı anlamına gelmez' uyarısı çıkıyor. Hiçbir zaman sahte bir tıbbi kesinlik sunmuyoruz."

### [01:15 - 01:30] Bölüm 5: Kapanış
* **Sunucu:** "PillMind, etkileşim analizini küratörlü verilerden yapıyor, açıklamayı yapay zekaya bırakıp hastayı anlayan güvenilir bir katman sunuyor. Dinlediğiniz için teşekkürler."

---

## ⚠️ Demo Sırasında SÖYLENMEMESİ GEREKENLER (Yasaklı Kelimeler)
- ❌ "Sistemimiz teşhis koyar."
- ❌ "Bu iki ilaç tamamen güvenli."
- ❌ "Aspirin ve Warfarin alırsanız ölürsünüz."
- ❌ "Veri setimizde milyonlarca ilaç var." (Dürüst olun, demo setinde 10 ilaç var)
- ❌ "Google Cloud Vision kullanıyoruz." (Eklenmediyse, sormadıkları sürece bahsetmeyin)

## 💡 Alternatif / Yedek İlaçlar
- Sarı Kart yedeği: `Aspirin` + `Enalapril`
- Kırmızı Kart yedeği: `İbuprofen` + `Aspirin`
