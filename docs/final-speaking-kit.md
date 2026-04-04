# PillMind - Final Konuşma Paketi 🎙️

Bu doküman, sahnede konuşacağınız her şeyin en kısa, doğal ve ezberlenebilir halidir. Tüm uzun cümleler elenmiş, konuşma diline yansıtılmıştır.

---

## A. 20 Saniyelik Ultra Kısa Pitch (Giriş)
"PillMind, hastaların kullandığı ilaçların tehlikeli etkileşimlerini anında bulan bir güvenlik asistanıdır. Kararları resmi klinik verilere dayanır, anlaşılır açıklamaları ise yapay zeka yapar. Kararı veriden alır, açıklamayı anlaşılır hale getirir."

## B. 45 Saniyelik Kısa Pitch (Asansör veya Vakit Daralırsa)
"Her yıl milyonlarca insan ilaç etkileşimleri yüzünden hastanelik oluyor çünkü prospektüsler anlaşılmaz dilde. Biz PillMind'la bunu çözüyoruz. Sistemimiz resmi ve saygın klinik verileri kullanarak etkileşimleri tarar, ardından yapay zeka ile hastaya anlayacağı, panik yapmayacağı bir dilde açıklar. Biz asla tıbbi bir karar vermiyoruz; sadece tıbbi veriyi hastanın anlayacağı seviyeye indiriyoruz. Kesinlik vadetmeden risk görünürlüğünü artırıyoruz."

## C. 90 Saniyelik Demo Anlatımı (UI Akarken)
*(İlaçları Seçerken)*: "Test için Aspirin ve Warfarin'i aynı anda seçiyoruz ve kontrol et diyoruz..."
*(Kırmızı Sonuç Gelince)*: "...Sistemimiz küratörlü veri setindeki eşleşmeyi anında buldu ve yüksek risk uyarısı verdi. Ama medikal jargonu hasta anlayamaz. İşte burada Gemini devreye giriyor."
*(Detayı Gör'e Basarken)*: "...Detayı gör dediğimizde Gemini, hastayı panik yapmadan ve empati kurarak uyarıyor. En altta ise verinin resmi kaynağını şeffafça görüyorsunuz."
*(Nötr Kombinasyon)*: "Parasetamol ve Amoksisilin seçtiğimizde ise iddialı 'Tamamen Güvenli' lafı yerine, çok daha gerçekçi olan 'Kayıtlı bir etkileşim bulunamadı' mesajını veriyoruz."

## D. 5 Dakikalık Tam Sunum Akışı
1. **(0:00-1:00) Problem ve Çözüm:** "Hoş geldiniz. PillMind nedir? Neden karmaşık prospektüsler yerine daha anlaşılır bir sisteme geçmeliyiz?" *(Kanca cümlesini atın).*
2. **(1:00-1:30) Mimari Kuralımız:** "Etkileşim analizi veriden gelir, açıklama Gemini'den gelir. Asla teşhis koymayız."
3. **(1:30-3:00) Canlı Demo:** Yukarıdaki 90 saniyelik Demo (Aspirin+Warfarin ve Nötr deneme).
4. **(3:00-4:00) Güvenlik ve Etik:** "Neden veri tutmuyoruz? Neden '%100 güvenli' demiyoruz? Neden sadece doğrulanmış veri seti kullandık?"
5. **(4:00-5:00) Kapanış & Jüri:** "Biz aracı doktor ile hasta arasındaki teknik bariyeri kaldırdık. Sorularınızı alabiliriz."

## E. 10 Ezberlenmesi Gereken Cümlelik Jüri Cevabı
> **Soru:** Neden sadece 10 ilaçla geldiniz?
> **Cevap:** "Amacımız 24 saatte milyarlarca satır veriyi kopyalamak değil, hata yapmayan, güvenilir bir sistem mimarisi kurgulamaktı."

> **Soru:** Yapay zeka halüsinasyon görürse?
> **Cevap:** "Gemini'ye asla karar verdirmiyoruz. Kararı kendi yerel, doğrulanmış verimizden veriyoruz; Gemini sadece bunu hastaya çeviriyor."

> **Soru:** Siz doktor musunuz?
> **Cevap:** "Hayır, biz tanı veya tedavi önermeyiz. Sadece etkileşimli ilaçları doktora daha iyi sorabilmesi için hastayı hazırlarız."

> **Soru:** Sisteminiz neden Google Cloud'da?
> **Cevap:** "Sunucu katmanında anlık olarak karmaşık medikal metinleri sadeleştirebiliyoruz."

> **Soru:** Yeşil (etkileşim yok) çıkarsa hasta riskte değil mi?
> **Cevap:** "O yüzden asla yeşil renk veya 'Güvenlidir' kelimesi kullanmadık. 'Kayıtlı veri bulunamadı ama doktorunuza danışın' diyoruz."

> **Soru:** Veriyi nasıl güvende tutuyorsunuz?
> **Cevap:** "Kalıcı kullanıcı profili veya arama geçmişi tutmuyoruz; seçilen ilaçlar analiz için anlık işleniyor."

> **Soru:** Ticari olarak bu nasıl satılır?
> **Cevap:** "E-Nabız gibi resmi sistemlere API veya veri destek modülü olarak B2B satılabilir."

> **Soru:** False-positive çıkarsa ne olur?
> **Cevap:** "Etkileşim yokken uyarmak hiç uyarmamaktan iyidir. Asıl tehlikeli olan sessiz kalmaktır; biz bunu veri katı kurallarımızla engelliyoruz."

## F. 30 Saniyelik Kriz (Fallback) Anlatımları
*(Sakin, hafif gülümseyerek, asla "bozuldu" demeden)*
1. **İnternet Gider / Gemini Çökerse:** "Şu an salondaki Wi-Fi nedeniyle yoğunluk yaşıyor gibiyiz. Ancak PillMind tam da bunun için Güvenli Düşüş (Fallback) mimarisine sahip. Dikkat ederseniz sistem çökmedi, AI zaman aşımına uğradığında önceden hazırlanmış yedek bildirimi ekrana yansıttık."
2. **Arayüz Takılır veya Buton Çalışmazsa:** "Hemen sayfayı tazeleyelim. Aslında bu da bize bir fırsat sunuyor: Sistemin asıl değeri arayüzü değil, arkasındaki güvenlik mantığıdır."
3. **Beyaz Ekran / Tam Çökme:** "Gerçek zamanlı sunucumuz şu an bir pürüz yaşıyor. Hiç vakit kaybetmeden masaüstündeki yedek klasörümüzden size saniye-saniye uçtan uca akışı göstereceğim."

## G. Asla Söylenmeyecek 10 İfade
1. ❌ "Hastalık teşhisi koyar / tanılar."
2. ❌ "Bu iki ilaç tamamen güvenli."
3. ❌ "FDA verilerinin tamamını kullanıyoruz."
4. ❌ "Kullanıcı bilgilerini veritabanımıza gizli kaydediyoruz."
5. ❌ "Sistemimiz internet olmadan offline çalışır."
6. ❌ "Gemini ilaç etkileşimini kendi buluyor."
7. ❌ "Doktor yerine geçmeyi hedefliyoruz."
8. ❌ "Klinik onaylı veritabanımız var."
9. ❌ "Milyarlarca kombinasyonu tarıyoruz."
10. ❌ "Kesin tanı."

## H. Sahne Rolleri Konsantrasyonu
- **1 Kişiyse:** Ekrana asla bakma, sadece jüriye bak. Fareyi refleks olarak kullan. Sözlerinle ekranı aynı anda yönet.
- **2 Kişiyse:** Konuşmacı göz temasını hiç bırakmaz. Pilot ise klavye başındadır, konuşmacı "Aspirin" der demez o an girmiş ve butona basmış olmalıdır (Senkron).
- **3 Kişiyse:** 1. Kişi vizyonu (pitch) anlatır. 2. Kişi demoyu (canlı anlatımı) götürür. 3. Kişi tamamen etik, veri ve güvenlik sorularına ("jüri savuşturma") savunmasına odaklanır.
