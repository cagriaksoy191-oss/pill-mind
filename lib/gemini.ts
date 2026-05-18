import interactionsData from "../data/interactions.json" with { type: "json" };
import drugsData from "../data/drugs.json" with { type: "json" };
import type { Interaction, Drug } from "./interactions";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GeminiResult {
  explanation: string;
  source: "gemini_live";
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const GEMINI_API_KEY = process.env.GOOGLE_API_KEY ?? "";
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash-lite";
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

/** Words that should never appear in a user-facing medical explanation. */
const UNSAFE_PATTERNS = [
  "kullanmayın",
  "bırakın",
  "bırakmalısınız",
  "tedavi",
  "tanı koy",
  "tanı kon",
  "reçete",
  "doz ayarla",
  "doz artır",
  "doz azalt",
  "dozu değiştir",
  "kesinlikle güvenli",
  "kesinlikle tehlikeli",
  "muadil ilaç",
  "yerine şunu kullan",
];

/** Quality gate constants for AI-generated explanations. */
const MIN_EXPLANATION_CHAR_COUNT = 120;
const MIN_EXPLANATION_WORD_COUNT = 18;
const MIN_LENGTH_FOR_GREETING_RESPONSE = 180;
const END_PUNCTUATION_PATTERN = /[.!?…]["')\]]*\s*$/u;
const GREETING_START_PATTERN = /^(merhaba|selam|tabii|elbette|tabi)\b/iu;

// ---------------------------------------------------------------------------
// Indexed Data for O(1) Lookups
// ---------------------------------------------------------------------------

const INTERACTIONS_MAP = new Map(
  (interactionsData as Interaction[]).map((i) => [i.id, i])
);
const DRUGS_MAP = new Map(
  (drugsData as Drug[]).map((d) => [d.id, d])
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Find the interaction record from curated data. */
export function getInteractionContext(
  interactionId: string,
  interactionsMap = INTERACTIONS_MAP,
  drugsMap = DRUGS_MAP
) {
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

/** Returns true when Gemini should be skipped entirely. */
export function shouldUseFallback(
  demoMode = DEMO_MODE,
  apiKey = GEMINI_API_KEY
): boolean {
  return demoMode || !apiKey;
}

/** Simple output guard — returns true if the text is safe. */
export function isOutputSafe(text: string): boolean {
  const lower = text.toLocaleLowerCase("tr");
  return !UNSAFE_PATTERNS.some((p) => lower.includes(p));
}

/** Heuristic quality gate for user-facing AI explanations. */
export function isExplanationComplete(text: string): boolean {
  const normalized = text.replace(/\s+/g, " ").trim();

  if (normalized.length < MIN_EXPLANATION_CHAR_COUNT) return false;
  if (normalized.split(" ").filter(Boolean).length < MIN_EXPLANATION_WORD_COUNT) {
    return false;
  }
  if (!END_PUNCTUATION_PATTERN.test(normalized)) return false;

  if (
    GREETING_START_PATTERN.test(normalized) &&
    normalized.length < MIN_LENGTH_FOR_GREETING_RESPONSE
  ) {
    return false;
  }

  return true;
}

// ---------------------------------------------------------------------------
// Gemini API (REST — no SDK dependency)
// ---------------------------------------------------------------------------

function buildPrompt(ctx: NonNullable<ReturnType<typeof getInteractionContext>>): string {
  const severityLabel =
    ctx.interaction.severity === "high"
      ? "yüksek"
      : ctx.interaction.severity === "medium"
        ? "orta"
        : "düşük";

  return `Sen deneyimli bir sağlık iletişim asistanısın. Görevin, tıbbi verilerden gelen ilaç etkileşim uyarılarını hastanın anlayabileceği sade, güven verici ve anlaşılır bir Türkçe ile hasta diline çevirmek.

KURALLAR:
- Kesinlikle kendi inisiyatifinle tanı koyma, tedavi önerme, dozaj belirtme veya muadil önerme.
- "Kullanmayın", "bırakın", "kesinlikle güvenlidir", "tehlikelidir" gibi hastayı paniğe sevk edecek kesin hükümler verme.
- Konuyu mekanik bir robot gibi özetlemekten kaçın; empatik ve doğal bir insan gibi konuş.
- Yanıtları 2 veya en fazla 3 kısa cümleden oluşan paragraflar halinde yaz.
- Tüm tıbbi jargonu (örn. agregasyon, metabolizma inhibisyonu, izoenzim) sıradan bir insanın anlayabileceği gibi izah et.
- Metnin sonuna doktor veya eczacıya danışılması gerektiğini nazikçe ekle.

İLAÇ 1: ${ctx.drug1Name} (Etken madde: ${ctx.drug1Ingredient})
İLAÇ 2: ${ctx.drug2Name} (Etken madde: ${ctx.drug2Ingredient})
ETKİLEŞİM ŞİDDETİ: ${severityLabel}
KISA ETKİLEŞİM ÖZETİ: ${ctx.interaction.summary}

Açıklama:`;
}

/**
 * Calls Gemini REST API. Returns the explanation text or throws on failure.
 */
export async function callGemini(
  ctx: NonNullable<ReturnType<typeof getInteractionContext>>
): Promise<GeminiResult> {
  const prompt = buildPrompt(ctx);

  const bodyPayload = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 384,
      topP: 0.9,
      thinkingConfig: {
        thinkingBudget: 0,
      },
    },
    safetySettings: [
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
    ],
  });

  const baseModels = [
    GEMINI_MODEL,
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-flash-lite-latest",
    "gemini-2.0-flash-lite",
  ].filter(Boolean) as string[];
  
  const uniqueModels = Array.from(new Set(baseModels));

  let lastError: Error | null = null;

  for (const model of uniqueModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
      
      let res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: bodyPayload,
        signal: AbortSignal.timeout(12_000),
      });

      if (res.status === 429) {
        // Backoff and retry once for this model
        await new Promise((resolve) => setTimeout(resolve, 2000));
        res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: bodyPayload,
          signal: AbortSignal.timeout(12_000),
        });
      }

      if (!res.ok) {
        const errorBody = await res.text().catch(() => "unknown");
        throw new Error(`API Error ${res.status}: ${errorBody}`);
      }

      const data = await res.json();
      const candidate = data?.candidates?.[0];
      const finishReason: string | undefined = candidate?.finishReason;
      const text = (candidate?.content?.parts ?? [])
        .map((part: { text?: string }) =>
          typeof part?.text === "string" ? part.text : ""
        )
        .filter(Boolean)
        .join("\n\n")
        .trim();

      if (!text) {
        throw new Error("Empty response from model");
      }

      if (finishReason && finishReason !== "STOP") {
        throw new Error(`Incomplete response from model (${finishReason})`);
      }

      if (!isExplanationComplete(text)) {
        throw new Error("Incomplete response from model");
      }

      return { explanation: text, source: "gemini_live" };
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      console.warn(`[GEMINI] Model ${model} failed, trying next. Error: ${lastError.message}`);
    }
  }

  throw lastError ?? new Error("Tüm Gemini modelleri başarısız oldu.");
}
