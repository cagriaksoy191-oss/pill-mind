# PillMind - Jüri Soru & Cevap (Q&A) Stratejisi

Sağlık odaklı ürünlerde jüriler genellikle acımasız ve detaya inen sorular sorarlar. "Kazanma" ile "kaybetme" arasındaki fark, bu sorulara verilecek "dürüst ve sınırlara sadık" cevaplarda yatar. 

Aşağıdaki liste, takımınızın savunmasını hazırlamak için kullanabileceği kilit jüri sorularıdır.

---

### S1: Neden 24 saatte sadece bu kadar az uyuşmazlığı tespit edebildiniz? / Neden büyük bir API (örn: RxList, WebMD) entegre etmediniz?
**Savunma:** "Hackathon odağımız büyük veri kümelerini kopyalamak değil, sağlık verisinin güvenli bir şekilde nasıl işleneceği ve kullanıcıya sunulabileceği mimarisini kanıtlamaktı. Bu yüzden, veri ve güvenlik konseptimizi tasdik edebilmek için resmi ve saygın klinik kaynaklardan doğrulanmış küçük bir demo seti oluşturduk. Mimari esnektir; veri setini büyütmek temelde bir API ve veri mühendisliği entegrasyonu işidir."

### S2: Yapay zekanın (Gemini) sağlıkta kullanılması tehlikeli değil mi? Halüsinasyon (yanlış bilgi uydurma) yaparsa ne olacak?
**Savunma:** "Çok haklısınız. Zaten tam olarak bu yüzden Gemini'ye **tıbbi karar verdirmiyoruz**. Etkileşim var mı, yok mu, şiddeti ne? Bu bilgilerin tamamı uygulamadaki küratörlü veri setinden geliyor. Gemini'ye sadece 'Kanama riski var' bilgisini veriyor ve 'Bunu 6. sınıf seviyesinde empati kurarak açıkla' diyoruz. Ayrıca output güvenlik filtremiz (guard) var; eğer Gemini metninde 'tedavi', 'dozaj' veya 'teşhis' gibi kelimeler kullanırsa sistemi anında güvenli Mock loguna (varsayılan açıklamaya) düşürüyoruz."

### S3: Bir doktorun yerini mi alıyorsunuz?
**Savunma:** "Kesinlikle hayır. Biz bir tanı veya teşhis aracı değiliz. Aksine biz, hastanın elinde reçetelerle doktora gittiğinde 'daha doğru ve sorulması gereken soruları' sorabilmesi için hastayı hazırlayan iletişim asistanıyız. Uygulamanın her köşesinde 'doktorunuza danışın' yazıyor."

### S4: Neden Google Cloud kullandınız?
**Savunma:** "Gemini'nin NLP ve metin özetleme / sadeleştirme (medical text summarization) yetenekleri muazzam. Google Cloud AI API'sini sunucu katmanımızdan doğrudan çağırarak, anlık olarak açıklamaları güvenli şekilde oluşturabildik."

### S5: İki ilaç yazdık ve yeşil (boş) çıktı. Bu hastaya 'Bu ilaçları kesin iç, hiçbir şey olmaz' demek değil mi?
**Savunma:** "Tam da bu yüzden renk ve dil seçimini değiştirdik. Ekranda 'Kullanımı Güvenlidir' gibi dikkatsiz bir ibare bulamazsınız. 'Sistemimizde kayıtlı bilinen bir etkileşim yok ama lütfen doktorunuza danışın' uyarı dilini geliştirdik. Tıpta kesinlik pazarlanamaz."

### S6: Kişisel sağlık verilerini (E-Nabız, sağlık geçmişi vs.) nasıl saklıyorsunuz?
**Savunma:** "Sistemimizde kalıcı bir kullanıcı profili veya sağlık geçmişi veri tabanı dahi yoktur. API çağrılarımız tamamen anlık (stateless) çalışır. Seçilen ilaçlar analiz için anlık işlenir ve istek bitince hiçbir iz kaydedilmez."

### S7: Yanlış pozitif veya yanlış negatif durumlarını nasıl engelliyorsunuz?
**Savunma:** "Yanlış pozitif (etkileşim yokken uyarı verme) durumu, hastayı sadece daha fazla doktoruna sormaya teşvik edeceği için riskli değildir. Asıl tehlikeli olan yanlış negatiftir (etkileşim varken etkileşim yok demek). Bu yüzden yeşil durum dilimiz 'Sistemimizde kayıtlı bilinen bir etkileşim yok' uyarısına dayanır ve veri kontrol mimarimiz sadece doğrulanmış resmi kaynaklardan veri besler."

### S8: Cloud Vision / Kamera tarafında ne yaptınız? / Neden Kamera okuma yok?
**Savunma:** (Eğer yapmadıysanız) "24 saat kısıtlamasında önceliğimizi veri-güvenliği (data-trust) ve LLM guardrails (güvenlik) yapımına harcadık. Prospektüs okumak yerine öncelikle mevcut karmaşık arayüz sorununu çözmeyi temel MVP olarak belirledik."

### S9: Bu ürünü nasıl ölçeklendirmeyi / ticari hale getirmeyi düşünüyorsunuz?
**Savunma:** "API-first mimarisiyle tasarladık. Yarın büyük bir İlaç Etkileşim API'si sağlayıcısı ile (DrubBank vb.) anlaşıp, veri katmanımızı oraya bağlayabiliriz. Hastaneler, eczaneler veya E-nabız sistemlerine B2B API olarak satılabilecek yapıdadır."

### S10: Bu fikrin Rakiplerden (örn: WebMD Interaction Checker) farkı ne?
**Savunma:** "Rakipler tıbbi kelimelerle dolu ansiklopedi gibi sonuç veriyor. Hasta o sonucu Google'da da buluyor ama **anlamıyor**. Bizim farkımız tam bu anlama noktasında: Karmaşık farmakolojik veriyi alıyor ve Gemini katmanı ile empati odaklı, hasta seviyesine indirilmiş bir diyaloğa dönüştürüyoruz."
