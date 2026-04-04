import interactionsData from "@/data/interactions.json";
import drugsData from "@/data/drugs.json";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

interface GeminiResult {
  explanation: string;
  source: "gemini";
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Find the interaction record from curated data. */
export function getInteractionContext(interactionId: string) {
  const interactions = interactionsData as InteractionRecord[];
  const drugs = drugsData as DrugRecord[];

  const interaction = interactions.find((i) => i.id === interactionId);
  if (!interaction) return null;

  const drug1 = drugs.find((d) => d.id === interaction.drug1);
  const drug2 = drugs.find((d) => d.id === interaction.drug2);

  return {
    interaction,
    drug1Name: drug1?.name ?? interaction.drug1,
    drug2Name: drug2?.name ?? interaction.drug2,
    drug1Ingredient: drug1?.activeIngredient ?? "",
    drug2Ingredient: drug2?.activeIngredient ?? "",
  };
}

/** Returns true when Gemini should be skipped entirely. */
export function shouldUseMock(): boolean {
  return DEMO_MODE || !GEMINI_API_KEY;
}

/** Simple output guard — returns true if the text is safe. */
export function isOutputSafe(text: string): boolean {
  const lower = text.toLocaleLowerCase("tr");
  return !UNSAFE_PATTERNS.some((p) => lower.includes(p));
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

  return `Sen bir ilaç bilgilendirme asistanısın. Görevin aşağıdaki iki ilaç arasındaki bilinen etkileşimi sade ve anlaşılır Türkçe ile açıklamak.

KURALLAR:
- Tanı koyma, tedavi önerme, doz önerme, muadil ilaç önerme.
- "Kullanmayın", "bırakın", "kesinlikle güvenli", "kesinlikle tehlikeli" gibi kesin hükümler verme.
- Sadece bilgilendir. Kullanıcıyı doktoruna veya eczacısına danışmaya yönlendir.
- Yanıtı 2-4 kısa paragraf olarak ver.
- Tıbbi jargonu mümkün olduğunca azalt.

İLAÇ 1: ${ctx.drug1Name} (Etken madde: ${ctx.drug1Ingredient})
İLAÇ 2: ${ctx.drug2Name} (Etken madde: ${ctx.drug2Ingredient})
ETKİLEŞİM ŞİDDETİ: ${severityLabel}
KISA ÖZET: ${ctx.interaction.summary}

Lütfen bu etkileşimi sade Türkçe ile açıkla ve sonunda doktoruna/eczacısına danışmasını öner.`;
}

/**
 * Calls Gemini REST API. Returns the explanation text or throws on failure.
 */
export async function callGemini(
  ctx: NonNullable<ReturnType<typeof getInteractionContext>>
): Promise<GeminiResult> {
  const prompt = buildPrompt(ctx);

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 512,
        topP: 0.9,
      },
      safetySettings: [
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      ],
    }),
    signal: AbortSignal.timeout(10_000), // 10s hard timeout
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => "unknown");
    throw new Error(`Gemini API ${res.status}: ${errorBody}`);
  }

  const data = await res.json();

  const text: string | undefined =
    data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text || text.trim().length === 0) {
    throw new Error("Gemini returned empty response");
  }

  return { explanation: text.trim(), source: "gemini" };
}
