# PillMind - Prova Runbook (Rehearsal Runbook) 🎭

Bu belge sahnede sorunsuz bir akış için prova yönergesidir. Son dakikalardaysanız koda, tasarıma veya dokümanlara dokunmayı tamamen bırakın ve bu belgeyle kronometre tutarak prova yapın.

## 👥 Sunum Akışları (Kişi Sayısına Göre)

### 1 Kişi Sunarsa
- **Görev:** Cihaz başında kalır. Bir eli faredeyken (demoyu yürütürken), izleyicilerle göz teması kurarak tüm başlıkları anlatır.
- **Odak:** Tıklamalar ezbere yapılmalı, ekrana bakarak değil jüriye bakarak konuşulmalıdır.

### 2 Kişi Sunarsa
- **Kişi 1 (Konuşmacı):** Ortada durur. Problemi, çözümü, etik duruşu anlatır. Soruları karşılar.
- **Kişi 2 (Pilot/Demo Sorumlusu):** Bilgisayar başındadır. Kişi 1 konuşurken sessizce ve senkronize bir şekilde `Aspirin`, `Warfarin` girer; yeri geldiğinde "Kontrol Et" butonuna basar ve açıklama kartını açar.
- **Odak:** Sunucu ve pilot arasında mükemmel paslaşma olmalıdır.

### 3 Kişi Sunarsa
- **Kişi 1 (Problem & Çözüm):** 0:00 - 1:30 arası konuşur. Pitch ve vizyon kısımlarını sahiplenir.
- **Kişi 2 (Pilot & Demo Anlatıcısı):** 1:30 - 3:30 arası konuşur. Sistemi canlı gösterirken arkadaki mimariyi (Gemini) açıklar.
- **Kişi 3 (Güvenlik, Etik, Veri Sorumlusu & Q&A):** 3:30 - Kapanış arası. Veri setinin güvenliğini ve resmi kaynaklardan doğrulandığını anlatır. Kapanış cümlesini yapar.

---

## ⏱️ Üç Turlu Prova Programı

### Tur 1: Kesintisiz ve Özgür Tur (Amaç Sırayı Hatırlamak)
- Kronometreyi açın. Süreye bakmadan, rahatça baştan sona konuşun. Hata yaparsanız durmayın, toparlayıp devam edin. Demo adımlarını yavaşça uygulayın. 
- *Bu turun sonunda çok uzun konuşan kısımları makaslayın.*

### Tur 2: Hızlı Tur (Speed-Run)
- Toplam süreyi hesaplayın ve normal sürenizden **%20 daha kısa sürede** bitirmeye zorlayın (Örn: 5 dakika süreniz varsa 4 dakikada bitirin). Hızlı düşünme, lafı uzatmama refleksinizi geliştirin. Detaylı teknik açıklamayı silip "Gemini bize server-side API üzerinden açıklama üretiyor" deyip geçin.

### Tur 3: Kriz / Fallback Turu (Murphy Kanunu Pratiği)
- Provanın tam ortasında (Örn: Sarı kart demosu sırasında) pilot farenin çalışmadığını veya ekranın donduğunu hayal etsin.
- Konuşmacı anında "bağlantı sorunu" veya "arayüz kilitlenmesi" cümlesini kursun (Bkz: `docs/fallback-demo.md`). 
- Prova kesinlikle kesilip baştan SOĞUTULMAMALI, kriz toparlanıp final kapanış cümlesiyle "Teşekkürler" denilerek bitirilmelidir.

---

## 🚦 Ne Zaman Durmalı, Ne Zaman Devam Edilmeli?

### Prova SIRASINDA Durmanızı Gerektiren Hatalar:
- Seçilen ilaç kombinasyonu veri dizisiyle veya scriptle alakasız sonuç verirse **(DUR VE NOT AL)**.
- Konuşmacı sahte tıbbi ibare veya "Yeşil ise güvenli, kesin" gibi bir dil kullanırsa **(HEMEN DURDUR VE DÜZELT)**.
- Teknik olarak yanlış cümle söylenirse ("Serverless lokal çalışıyor" gibi) **(DÜZELT)**.

### Sahnede (Canlı) Devam Etmeniz Gereken Durumlar:
- API 2 saniye yerine 5-6 saniyede cevap verirse (Susmayın, o esnada jüriye "Arkada şu an güvenli açıklama oluşturuluyor.." diye boşluğu doldurun).
- Arama kutusunda "İbuprofen" yerine harf hatası yaparsanız (Paniklemeyin, silip düzeltin).
- Bir cümlenizi unuttuysanız (Slayt okumadığınız sürece jüri aslında ne söylemek üzere olduğunuzu bilmiyor. Sessizlik yapmayın, bir sonraki cümleye atlayın). 

Hakem karşısında sadece kendinize olan inancınız ve projenizin güvenilir "düşüş" sistemleri not alacaktır. Başarılar dilerim!
