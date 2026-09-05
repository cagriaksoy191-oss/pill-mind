import { getGeminiApiKey, getPrimaryModel } from "./config";

const UNSAFE_PATTERNS_RAW = [
  "kullanmayın",
  "bırakın[a-zA-ZıİğĞüşŞöÖçÇ]*",
  "bırakmalı[a-zA-ZıİğĞüşŞöÖçÇ]*",
  "bırak[a-zA-ZıİğĞüşŞöÖçÇ]*",
  "kesmeyin[a-zA-ZıİğĞüşŞöÖçÇ]*",
  "kesmeli[a-zA-ZıİğĞüşŞöÖçÇ]*",
  "kesinlikle\\s+kes",
  "tedavi[a-zA-ZıİğĞüşŞöÖçÇ]*\\s+kes[a-zA-ZıİğĞüşŞöÖçÇ]*",
  "ilaç[a-zA-ZıİğĞüşŞöÖçÇ]*\\s+kes[a-zA-ZıİğĞüşŞöÖçÇ]*",
  "kullanım[a-zA-ZıİğĞüşŞöÖçÇ]*\\s+kes[a-zA-ZıİğĞüşŞöÖçÇ]*",
  "alımı[a-zA-ZıİğĞüşŞöÖçÇ]*\\s+kes[a-zA-ZıİğĞüşŞöÖçÇ]*",
  "sonlandır[a-zA-ZıİğĞüşŞöÖçÇ]*",
  "ara ver[a-zA-ZıİğĞüşŞöÖçÇ]*",
  "tedaviye başlayın[a-zA-ZıİğĞüşŞöÖçÇ]*",
  "tedaviye başla[a-zA-ZıİğĞüşŞöÖçÇ]*",
  "tedavinizi değiştir[a-zA-ZıİğĞüşŞöÖçÇ]*",
  "tanı\\s+koy[a-zA-ZıİğĞüşŞöÖçÇ]*",
  "tanınız[a-zA-ZıİğĞüşŞöÖçÇ]*",
  "hastalığınız[a-zA-ZıİğĞüşŞöÖçÇ]*",
  "reçete[a-zA-ZıİğĞüşŞöÖçÇ]*\\s+(?:yaz|öner|düzenle|reçete)[a-zA-ZıİğĞüşŞöÖçÇ]*",
  "doz[a-zA-ZıİğĞüşŞöÖçÇ]*\\s+(?:ayarla|artır|azalt|değiştir|kullan|dozda)[a-zA-ZıİğĞüşŞöÖçÇ]*",
  "dozu[a-zA-ZıİğĞüşŞöÖçÇ]*",
  "günde\\s+\\w+\\s+doz[a-zA-ZıİğĞüşŞöÖçÇ]*",
  "yarıya\\s+indir[a-zA-ZıİğĞüşŞöÖçÇ]*",
  "iki\\s+katına[a-zA-ZıİğĞüşŞöÖçÇ]*",
  "mg\\s+(?:artır|azalt|yükselt|düşür)[a-zA-ZıİğĞüşŞöÖçÇ]*",
  "kesinlikle\\s+güvenli[a-zA-ZıİğĞüşŞöÖçÇ]*",
  "tamamen\\s+güvenli[a-zA-ZıİğĞüşŞöÖçÇ]*",
  "hiç\\s+risk\\s+yok[a-zA-ZıİğĞüşŞöÖçÇ]*",
  "kesin\\s+zararlı[a-zA-ZıİğĞüşŞöÖçÇ]*",
  "kesinlikle\\s+tehlikeli[a-zA-ZıİğĞüşŞöÖçÇ]*",
  "muadil\\s+ilaç[a-zA-ZıİğĞüşŞöÖçÇ]*",
  "muadili[a-zA-ZıİğĞüşŞöÖçÇ]*",
  "yerine\\s+kullan[a-zA-ZıİğĞüşŞöÖçÇ]*",
  "yerine\\s+.*\\s+kullan[a-zA-ZıİğĞüşŞöÖçÇ]*",
];

const UNSAFE_PATTERNS = UNSAFE_PATTERNS_RAW.map((pattern) => {
  return new RegExp(
    `(?:^|[^a-zA-Z0-9ıİğĞüşŞöÖçÇ])${pattern}(?:$|[^a-zA-Z0-9ıİğĞüşŞöÖçÇ])`,
    "i"
  );
});

export function normalizeExplanation(text: string) {
  return text
    .replace(/\r/g, "")
    .replace(/^merhaba[,!\s]*/i, "")
    .replace(/^selam[,!\s]*/i, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function isOutputSafe(text: string): boolean {
  return !UNSAFE_PATTERNS.some((pattern) => pattern.test(text));
}

export function isExplanationComplete(text: string): boolean {
  const normalized = text.replace(/\s+/g, " ").trim();

  if (normalized.length < 100) return false;
  if (normalized.split(" ").filter(Boolean).length < 15) return false;

  return true;
}

export async function runReviewerAgent(
  text: string,
  model: string = getPrimaryModel()
): Promise<boolean> {
  const prompt = `Sen Sağlık Bilgi Sistemleri Yöneticisi ve Yapay Zeka Güvenliği Mühendisiyisin.
Görevin, aşağıdaki Türkçe ilaç açıklamasının hastanın güvenliği ve doğrulanmış klinik kaynaklara sadakati (grounding) açısından tamamen uygun olup olmadığını denetlemektir.

Açıklamada şunlar bulunuyorsa süreç onaylanmamalıdır (HAYIR döndürülmelidir):
1. "İlacı kesinlikle kullanmayın", "kullanımı durdurun", "bırakın", "dozu değiştirin" gibi hekim kararı yerine geçen kesin klinik emirler.
2. Tedaviyi değiştirme veya sonlandırma tavsiyeleri (ara verme, kesme vb.).
3. Teşhis, tanı, hastalık adı atfetme ("hastalığınız") veya muadil ilaç önerisi.
4. "Kesinlikle güvenlidir", "hiçbir tehlikesi yoktur", "kesin zararlıdır" gibi yanlış veya sahte klinik güvenceler.
5. Doğrulanmış veritabanı kaynaklarının dışına çıkan, uydurma veya doğrulanmamış tıbbi iddialar (RAG grounding ihlali).

İşte referans alabileceğin örnek kararlar (Few-Shot Examples):

Örnek 1 (GÜVENLİ DEĞİL - Klinik müdahale içeriyor):
Metin: "Bu kombinasyon risklidir. İlacı hemen bırakın ve doktorunuza danışın."
Karar: HAYIR

Örnek 2 (GÜVENLİ - Klinik müdahale içermiyor, hekime danışma öneriyor):
Metin: "Bu iki ilaç arasında etkileşim potansiyeli vardır. İlaçlarınızı düzenli almaya devam etmeniz ve durum hakkında doktorunuza danışmanız önerilir."
Karar: EVET

Örnek 3 (GÜVENLİ DEĞİL - Dozaj önerisi içeriyor):
Metin: "Aspirin dozunu yarıya indirerek kullanabilirsiniz. Doktorunuza haber veriniz."
Karar: HAYIR

Örnek 4 (GÜVENLİ - Klinik müdahale yok):
Metin: "Aspirin ve Enalapril birlikte tansiyon düşürücü etkiyi azaltabilir. Lütfen tedavi planınızı değiştirmeden önce hekiminize veya eczacınıza danışın."
Karar: EVET

Eğer denetlenen metin tamamen GÜVENLİ ve grounding kurallarına uygun ise yalnızca "EVET" yaz. Eğer en ufak bir klinik yönlendirme, dozaj müdahale riski veya uydurma kaynak iddiası varsa yalnızca "HAYIR" yaz. Başka hiçbir şey yazma.

Denetlenecek Açıklama:
"${text}"

Yanıt:`;

  try {
    const payload = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1, // Sıfıra yakın yaratıcılık, kesin karar doğruluğu
        maxOutputTokens: 10,
        responseMimeType: "text/plain",
      },
    });

    const apiKey = getGeminiApiKey();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      signal: AbortSignal.timeout(8_000),
    });

    if (!response.ok) {
      console.warn(
        `[PillMind AI Safety] Reviewer Agent (${model}) bağlantısı kurulamadı. Regex kontrolüne güvenilerek [SAFETY SHIELD DEGRADED] moduyla devam ediliyor.`
      );
      return true;
    }

    const data = await response.json();
    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim().toUpperCase() ?? "";

    console.info(`[PillMind AI Safety] Reviewer Agent (${model}) kararı: ${reply}`);
    return reply.includes("EVET");
  } catch (err) {
    console.warn(
      `[PillMind AI Safety] Reviewer Agent (${model}) denetimi sırasında hata, [SAFETY SHIELD DEGRADED] moduyla devam ediliyor:`,
      err
    );
    return true;
  }
}
