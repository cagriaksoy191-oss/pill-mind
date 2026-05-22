// lib/gemini.ts
import interactionsData from "@/data/interactions.json";
import drugsData from "@/data/drugs.json";

interface InteractionRecord {
  id: string;
  drug1: string;
  drug2: string;
  severity: string;
  summary: string;
  source: string;
}

interface DrugRecord {
  id: string;
  name: string;
  activeIngredient: string;
  category: string;
}

interface InteractionContext {
  interaction: InteractionRecord;
  drug1Name: string;
  drug2Name: string;
  drug1Ingredient: string;
  drug2Ingredient: string;
}

interface CoverageContext {
  drugNames: string[];
  drugIngredients: string[];
}

interface GeminiResult {
  explanation: string;
  generatedAt: string;
}

const GEMINI_API_KEY = process.env.GOOGLE_API_KEY ?? "";
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
const PRIMARY_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash-lite";
const MODEL_CHAIN = Array.from(
  new Set(["gemini-2.5-flash-lite", PRIMARY_MODEL, "gemini-2.5-flash"])
);

const UNSAFE_PATTERNS_RAW = [
  "kullanmayın",
  "bırakın[a-zA-ZıİğĞüşŞöÖçÇ]*",
  "bırakmalı[a-zA-ZıİğĞüşŞöÖçÇ]*",
  "tedaviye başlayın[a-zA-ZıİğĞüşŞöÖçÇ]*",
  "tedavinizi değiştir[a-zA-ZıİğĞüşŞöÖçÇ]*",
  "tanı\\s+koy[a-zA-ZıİğĞüşŞöÖçÇ]*",
  "tanınız[a-zA-ZıİğĞüşŞöÖçÇ]*",
  "reçete[a-zA-ZıİğĞüşŞöÖçÇ]*\\s+(?:yaz|öner|düzenle)[a-zA-ZıİğĞüşŞöÖçÇ]*",
  "doz[a-zA-ZıİğĞüşŞöÖçÇ]*\\s+(?:ayarla|artır|azalt|değiştir)[a-zA-ZıİğĞüşŞöÖçÇ]*",
  "dozu\\s+değiştir[a-zA-ZıİğĞüşŞöÖçÇ]*",
  "kesinlikle\\s+güvenli[a-zA-ZıİğĞüşŞöÖçÇ]*",
  "kesinlikle\\s+tehlikeli[a-zA-ZıİğĞüşŞöÖçÇ]*",
  "muadil\\s+ilaç[a-zA-ZıİğĞüşŞöÖçÇ]*",
  "yerine\\s+.*\\s+kullan[a-zA-ZıİğĞüşŞöÖçÇ]*",
];

export const UNSAFE_PATTERNS = UNSAFE_PATTERNS_RAW.map((pattern) => {
  // ASCII-boundary (\b) fails in JS regular expressions when matching Turkish non-ASCII characters like 'ç' or 'ı'.
  // This helper builds a custom word boundary wrapper tailored for Turkish medical-grade safety standards.
  return new RegExp(
    `(?:^|[^a-zA-Z0-9ıİğĞüşŞöÖçÇ])${pattern}(?:$|[^a-zA-Z0-9ıİğĞüşŞöÖçÇ])`,
    "i"
  );
});

// Pre-compute O(1) lookups at module initialization
const drugsMap = new Map<string, DrugRecord>();
for (const d of drugsData as DrugRecord[]) {
  drugsMap.set(d.id, d);
}

const interactionsMap = new Map<string, InteractionRecord>();
for (const int of interactionsData as InteractionRecord[]) {
  interactionsMap.set(int.id, int);
}

// Gemini Structured Outputs JSON Şeması
const EXPLANATION_SCHEMA = {
  type: "OBJECT",
  properties: {
    girisCumlesi: {
      type: "STRING",
      description: "İlaçların adlarını ve etken maddelerini içeren, hastayı paniğe sevk etmeyen Türkçe giriş cümlesi."
    },
    klinikEtkiAciklamasi: {
      type: "STRING",
      description: "Etkileşimin vücutta nasıl gerçekleştiğini, tıp dilinden uzak, sade bir Türkçe ile anlatan açıklama paragrafı."
    },
    hastalaraOneriler: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "Hastanın dikkat etmesi gereken önemli belirtiler, semptomlar veya pratik tavsiyeler listesi (en az 2 madde)."
    },
    hekimYonlendirmesi: {
      type: "STRING",
      description: "Hastayı doktoruna veya eczacısına danışması yönünde ikna eden, kesinlikle panik havası yaratmayan son yönlendirme cümlesi."
    }
  },
  required: ["girisCumlesi", "klinikEtkiAciklamasi", "hastalaraOneriler", "hekimYonlendirmesi"]
};

export function getInteractionContext(interactionId: string): InteractionContext | null {
  const interaction = interactionsMap.get(interactionId);
  if (!interaction) return null;

  const drug1 = drugsMap.get(interaction.drug1);
  const drug2 = drugsMap.get(interaction.drug2);

  return {
    interaction,
    drug1Name: drug1?.name ?? interaction.drug1,
    drug2Name: drug2?.name ?? interaction.drug2,
    drug1Ingredient: drug1?.activeIngredient ?? "",
    drug2Ingredient: drug2?.activeIngredient ?? "",
  };
}

export function getCoverageContext(drugIds: string[]): CoverageContext | null {
  const drugs = drugsData as DrugRecord[];
  const selected = drugs.filter((drug) => drugIds.includes(drug.id));

  if (selected.length < 2) {
    return null;
  }

  return {
    drugNames: selected.map((drug) => drug.name),
    drugIngredients: selected.map((drug) => drug.activeIngredient),
  };
}

export function shouldUseFallback(): boolean {
  return DEMO_MODE || !GEMINI_API_KEY;
}

function normalizeExplanation(text: string) {
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

function isExplanationComplete(text: string): boolean {
  const normalized = text.replace(/\s+/g, " ").trim();

  if (normalized.length < 100) return false;
  if (normalized.split(" ").filter(Boolean).length < 15) return false;

  return true;
}

/**
 * Çift Ajanlı Güvenlik Modeli - Klinik Doğruluk ve Güvenlik Denetleme Ajanı (Reviewer Agent)
 * Üretilen tıbbi metinde hekim yönlendirmesini sabote edecek klinik veya kesin yönlendirmeler olup olmadığını denetler.
 */
async function runReviewerAgent(text: string, model: string = PRIMARY_MODEL): Promise<boolean> {
  const prompt = `Sen Sağlık Bilgi Sistemleri Yöneticisi ve Yapay Zeka Güvenliği Mühendisiyisin.
Görevin, aşağıdaki Türkçe ilaç açıklamasının hastanın güvenliği için tamamen uygun olup olmadığını denetlemektir.

Açıklamada şunlar bulunuyorsa süreç onaylanmamalıdır (HAYIR döndürülmelidir):
1. "İlacı kesinlikle kullanmayın", "kullanımı durdurun", "bırakın", "dozu değiştirin" gibi hekim kararı yerine geçen kesin klinik emirler.
2. Tedaviyi değiştirme veya sonlandırma tavsiyeleri.
3. Teşhis, tanı veya muadil ilaç önerisi.
4. "Kesinlikle güvenlidir", "hiçbir tehlikesi yoktur" gibi yanlış klinik güvenceler.

Eğer açıklama GÜVENLİ ise yalnızca "EVET" yaz. Eğer en ufak bir klinik yönlendirme riski varsa yalnızca "HAYIR" yaz. Başka hiçbir şey yazma.

Denetlenecek Açıklama:
"${text}"

Yanıt:`;

  try {
    const payload = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1, // Sıfıra yakın yaratıcılık, kesin karar doğruluğu
        maxOutputTokens: 10,
        responseMimeType: "text/plain"
      }
    });

    // We dynamically query the same model that succeeded in the primary step to guarantee model availability and API key validity.
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      signal: AbortSignal.timeout(8_000),
    });

    if (!response.ok) {
      console.warn(`[PillMind AI Safety] Reviewer Agent (${model}) bağlantısı kurulamadı. Regex kontrolüne güvenilerek [SAFETY SHIELD DEGRADED] moduyla devam ediliyor.`);
      return true; 
    }

    const data = await response.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim().toUpperCase() ?? "";
    
    console.info(`[PillMind AI Safety] Reviewer Agent (${model}) kararı: ${reply}`);
    return reply.includes("EVET");
  } catch (err) {
    console.warn(`[PillMind AI Safety] Reviewer Agent (${model}) denetimi sırasında hata, [SAFETY SHIELD DEGRADED] moduyla devam ediliyor:`, err);
    return true; 
  }
}

function buildInteractionPrompt(ctx: InteractionContext) {
  const severityLabel =
    ctx.interaction.severity === "high"
      ? "yüksek"
      : ctx.interaction.severity === "medium"
        ? "orta"
        : "düşük";

  return `Sen Sağlık İletişim Asistanı ve Tıbbi Yapay Zeka Güvenlik Uzmanısın.
Görevin, doğrulanmış ilaç etkileşim özetini hastanın anlayacağı sade Türkçe ile açıklamak.

HAYATİ KURALLAR:
- Asla "Merhaba" veya hitap cümlesi kullanma.
- Tıbbi jargonu basit dille açıkla.
- Teşhis koyma, tedavi önerme, doz önerme, muadil önerme.
- "kesinlikle güvenli", "kullanmayın", "bırakın" gibi hekim yerine geçen kesin klinik yönlendirmeler ASLA yapma.
- Son cümlede mutlaka doktor veya eczacıya danışılması gerektiğini belirt.

İlaç 1: ${ctx.drug1Name} (Etken madde: ${ctx.drug1Ingredient})
İlaç 2: ${ctx.drug2Name} (Etken madde: ${ctx.drug2Ingredient})
Şiddet Derecesi: ${severityLabel}
Doğrulanmış Tıbbi Özet: ${ctx.interaction.summary}

Şimdi, tanımlanan JSON şemasındaki alanları yukarıdaki kurallara tam olarak uyarak doldur.`;
}

function buildCoveragePrompt(ctx: CoverageContext) {
  return `Sen Sağlık İletişim Asistanı ve Tıbbi Yapay Zeka Güvenlik Uzmanısın.
Görevin: Aşağıdaki ilaç kombinasyonu için doğrulanmış demo veri setimizde hazır bir etkileşim kaydı bulunmadığını kullanıcıya sade Türkçe ile açıklamak.

HAYATİ KURALLAR:
- Gerçek hayatta bu ilaçlar arasında etkileşim vardır veya yoktur diye hüküm verme.
- Risk değerlendirmesi uydurma.
- Teşhis, tanı veya doz önerisi yapma.
- "kullanmayın", "bırakın" gibi hekim kararı yerine geçen kesin klinik emirler verme.
- Şunu net olarak anlat: Bu kombinasyon mevcut sınırlı doğrulanmış demo veri setimizde kayıtlı değil, bu yüzden sistem kesin bir tıbbi yorum yapmıyor.
- Son cümlede mutlaka hekime veya eczacıya danışılması gerektiğini belirt.

Seçilen ilaçlar: ${ctx.drugNames.join(", ")}
Etken maddeler: ${ctx.drugIngredients.join(", ")}

Şimdi, tanımlanan JSON şemasındaki alanları yukarıdaki kurallara tam olarak uyarak doldur.`;
}


function buildGeminiPayload(prompt: string): string {
  return JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.75,
      maxOutputTokens: 512,
      topP: 0.92,
      responseMimeType: "application/json",
      responseSchema: EXPLANATION_SCHEMA
    },
    safetySettings: [
      {
        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
        threshold: "BLOCK_MEDIUM_AND_ABOVE",
      },
      {
        category: "HARM_CATEGORY_HARASSMENT",
        threshold: "BLOCK_MEDIUM_AND_ABOVE",
      },
    ],
  });
}

async function executeGeminiRequest(model: string, payload: string): Promise<string> {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent` +
    `?key=${GEMINI_API_KEY}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "unknown");
    throw new Error(`API Error ${response.status}: ${errorBody}`);
  }

  const data = await response.json();
  const candidate = data?.candidates?.[0];
  const finishReason: string | undefined = candidate?.finishReason;

  const rawText = (candidate?.content?.parts ?? [])
    .map((part: { text?: string }) => typeof part?.text === "string" ? part.text : "")
    .filter(Boolean)
    .join("");

  if (!rawText) {
    throw new Error("Modelden boş yanıt alındı.");
  }

  if (finishReason && finishReason !== "STOP") {
    throw new Error(`Model yanıtı tamamlanamadı (${finishReason})`);
  }

  return rawText;
}

function parseGeminiResponse(rawText: string): any {
  let cleanText = rawText.trim();

  // Strip markdown json blocks if returned by the model under any edge conditions
  if (cleanText.startsWith("```")) {
    cleanText = cleanText.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
  }

  try {
    return JSON.parse(cleanText);
  } catch {
    throw new Error("Model çıktısı geçerli bir JSON formatında değil.");
  }
}

function formatExplanation(parsedJSON: any): string {
  const giris = normalizeExplanation(parsedJSON.girisCumlesi || "");
  const klinik = normalizeExplanation(parsedJSON.klinikEtkiAciklamasi || "");

  // Resilient parsing for patient advice list to avoid type crashes if model outputs non-array values
  let rawOneriler = parsedJSON.hastalaraOneriler;
  if (!Array.isArray(rawOneriler)) {
    if (typeof rawOneriler === "string") {
      rawOneriler = [rawOneriler];
    } else {
      rawOneriler = [];
    }
  }
  const oneriler: string[] = rawOneriler
    .map((o: any) => normalizeExplanation(String(o || "")))
    .filter(Boolean);

  const hekim = normalizeExplanation(parsedJSON.hekimYonlendirmesi || "");

  return `
${giris}

${klinik}

**Önemli Belirtiler ve Öneriler:**
${oneriler.map((o) => `• ${o}`).join("\n")}

${hekim}
`.trim();
}

async function callGeminiWithPrompt(prompt: string): Promise<GeminiResult> {
  const payload = buildGeminiPayload(prompt);
  let lastError: Error | null = null;

  for (const model of MODEL_CHAIN) {
    try {
      const rawText = await executeGeminiRequest(model, payload);
      const parsedJSON = parseGeminiResponse(rawText);
      const compiledExplanation = formatExplanation(parsedJSON);

      // 2. Güvenlik Denetimi: Deterministik Regex Filtresi
      if (!isOutputSafe(compiledExplanation)) {
        throw new Error("AI çıktısı klinik güvenlik kurallarını (regex) ihlal ediyor.");
      }

      // 3. Güvenlik Denetimi: Çift Ajanlı LLM Reviewer Kontrolü (Pass the successful model dynamically)
      const safetyCheckResult = await runReviewerAgent(compiledExplanation, model);
      if (!safetyCheckResult) {
        throw new Error("AI çıktısı klinik güvenlik kurallarını (Reviewer Agent) ihlal ediyor.");
      }

      if (!isExplanationComplete(compiledExplanation)) {
        throw new Error("Üretilen klinik açıklama yetersiz uzunlukta.");
      }

      return {
        explanation: compiledExplanation,
        generatedAt: new Intl.DateTimeFormat("tr-TR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }).format(new Date()),
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`[GEMINI] Model ${model} başarısız oldu: ${lastError.message}`);
    }
  }

  throw lastError ?? new Error("Tüm Gemini modelleri başarısız oldu.");
}

export async function callGeminiForInteraction(
  ctx: InteractionContext
): Promise<GeminiResult> {
  return callGeminiWithPrompt(buildInteractionPrompt(ctx));
}

export async function callGeminiForCoverage(
  ctx: CoverageContext
): Promise<GeminiResult> {
  return callGeminiWithPrompt(buildCoveragePrompt(ctx));
}
