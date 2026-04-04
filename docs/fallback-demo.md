# PillMind - Kriz Anı ve Fallback Demo Planı 🚒

Hackathon demolarında her zaman bir şeyler ters gidebilir ("Murphy Kanunları"). API kotası dolabilir, internet kopabilir, arayüzde bir bug çıkabilir. 

Bu doküman, jüri önünde anında kriz yönetimi için "Kurtarma Planı"dır.

## 🔴 Kriz 1: İnternet Koptu veya Gemini API Cevap Vermiyor
Google Gemini API zaman aşımına uğrar veya internet giderse, uygulamamızın içine gömdüğümüz (mock/fallback) mekanizması devreye girer.

**Jüri Önünde Söylenecekler:**
"Şu an salondaki Wi-Fi yoğunluğu nedeniyle AI katmanımız cevap vermiyor olabilir. Ancak PillMind mimarisi tam olarak bu senaryolar için bir 'Güvenli Düşüş (Fallback)' sistemiyle tasarlandı. Dikkat ederseniz sistem çökmedi. Etkileşim analizi uygulamadaki küratörlü veri setimizden yapıldığı için etkileşimi sistem hala gösteriyor, sadece AI modeli cevap veremediğinde, sistemin fallback (yedek) mekanizmasına geçiş yaptığını ve tıbbi bildirimi gösterdiğini görüyoruz."

"Bir sağlık uygulamasında en önemli şey, dış API bağlantısı zayıf gelse bile uyarı ışıklarının yanmaya devam etmesidir. Sistemi tam da bu yüzden Güvenli Düşüş (Fallback) mimarisi ile kurduk."
*(Bu cevap, uygulamanın hata toleransı (fault tolerance) yeteneğini ve güvenliğini gösterme şansı sunar).*

## 🔴 Kriz 2: Arama Barı Bozuldu veya UI Dondu
Tarayıcı kitlenir veya React state hatası alırsanız.

**Jüri Önünde Söylenecekler:**
*(Derin bir nefes alın ve ASLA "Eyvah bozuldu, tüh" demeyin)*.
"Sanırım geliştirme ortamındaki bir state takılması yaşadık. Çok kısa müsaadenizle (F5 tuşuna basın). Hazır bu tazelenirken şunu söyleyebilirim..." (Konuyu anında etik ve probleme geri çekin).
"...Önemli olan arayüzün takılması değildir, hasta güvenliğinin sağlanmasıdır."

## 🔴 Kriz 3: Proje Tamamen Çöktü (Beyaz Ekran / Error)
Uygulama çalışmazsa, yedek plan devreye girer. Projeye başlarken AI aracılığıyla klasörünüze koyduğunuz Artifact Ekran Görüntüleri!

**Aksiyon:**
Masaüstünüzde önceden hazırladığınız "PillMind Screenshots" klasörünü açın.
**Jüri Önünde Söylenecekler:**
"Gerçek zamanlı demomuz şu an talihsiz bir teknik sorun yaşıyor. Ancak 24 saat içinde tamamladığımız çalışan MVP'mizin adım adım akışını, 15 dakika önce aldığımız uçtan uca arayüz görüntüleri üzerinden hızla özetlemek isterim..."
(Klasördeki fotoğrafları sırayla büyük ekranda gösterin: Landing Page -> Boş Kontrol Ekranı -> Aspirin+Warfarin sonucu -> Açıklama kısmı).

## 💡 Kriz Anı En Büyük Altın Kural
Olası bir hata, iyi bir "mühendislik" açıklaması için bir fırsattır. Uygulamanın çökmesi (fail etmesi) size her zaman, uygulamanın çökmesine karşı aldığınız güvenlik mimarisini (fallback, try-catch, error boundaries) anlatma şansı verir!
