# PillMind - Final Freeze Summary (Son Dondurma Özeti)

Bu belge, PillMind projesi sahneye çıkmadan önce hiçbir şekilde değiştirilmeyecek **son kilitlenmiş gerçekleri** içerir. Ekipteki herkes bu belgeye uygun konuşmalıdır.

## 🎯 Pitch (1 Cümle)
"PillMind, sağlık verilerindeki karmaşayı çözen, küratörlü etkileşim verilerini yapay zeka yardımıyla hastaların kolayca kavrayabileceği bir dilde açıklayan bir güvenlik aracıdır."

## 🔬 Jüriye Karşı Veri Sınırı Cümlesi
"Mimariyi kanıtlamak için, milyonlarca kontrolsüz veri yerine, resmi ve saygın klinik kaynaklardan teyit edilmiş sınırlı bir demo veri seti ile test yaptık."

## 🧩 Kilitlenen Demo Kombinasyonları
* **🔴 Kırmızı (Yüksek Etkileşim):** `Aspirin` + `Warfarin`
* **🟡 Sarı (Orta Etkileşim):** `İbuprofen` + `Enalapril`
* **⚪ Nötr (Bilinen Etkileşim Yok):** `Parasetamol` + `Amoksisilin`

## 🧠 Ekibin Sahneye Çıkmadan Önce Ezbere Bilmesi Gereken 5 Madde
1. **Biz tanı koymuyoruz**, sadece etkileşim verisini hastanın anlayacağı dile çeviriyoruz.
2. **Yapay zeka tıbbi karar vermez**, kararı sistemden alır sadece açıklamasını yapar.
3. Kalıcı kullanıcı profili veya veri tabanı tutulmaz. Seçilen ilaçlar analiz için anlık işlenir.
4. "Güvenli" ibaresini asla kullanmıyoruz; yerine "Sistemimizde etkileşim kaydı bulunmadı ancak bu, etkileşimi olmadığı anlamına gelmez" diyoruz.
5. Bir şeyler ters gider ve API hata verirse gülümseyip "İşte bu sistemin fallback güvenlik mekanizmasıdır, sistem çökmedi" diyerek krizi şova çeviriyoruz.

## 🚫 Asla Söylenmeyecek 5 İfade
1. ❌ "Uygulamamız hasta bilgilerini gizli bir ortamda saklıyor." (Kalıcı veri tutulmaz).
2. ❌ "Bu iki ilaç tamamen güvenlidir, içebilirsiniz."
3. ❌ "Gemini yapay zekası size hangi ilacı içmeniz gerektiğini söyler."
4. ❌ "Binlerce ilaçlık dev bir veri tabanımız var."
5. ❌ "Sistemimiz server olmadan, tamamen offline çalışıyor." (API Route var, stateless demek ile offline demek aynı değildir).
