import { GeminiExplanationResponse } from "./types";
import { normalizeExplanation } from "./safety";

export function parseGeminiResponse(rawText: string): GeminiExplanationResponse {
  let cleanText = rawText.trim();

  // Strip markdown json blocks if returned by the model under any edge conditions
  if (cleanText.startsWith("```")) {
    cleanText = cleanText.replace(/^```(?:json)?\s*/i, "").replace(/```$/, "").trim();
  }

  try {
    return JSON.parse(cleanText) as GeminiExplanationResponse;
  } catch {
    throw new Error("Model çıktısı geçerli bir JSON formatında değil.");
  }
}

export function formatExplanation(parsedJSON: GeminiExplanationResponse): string {
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
  const hekim = normalizeExplanation(parsedJSON.hekimYonlendirmesi || "");

  let onerilerStr = "**Önemli Belirtiler ve Öneriler:**";
  const len = rawOneriler.length;
  if (len > 0) {
    const arr = [];
    for (let i = 0; i < len; i++) {
      const val = normalizeExplanation(String(rawOneriler[i] || ""));
      if (val) {
        arr.push(`• ${val}`);
      }
    }
    if (arr.length > 0) {
      onerilerStr += "\n" + arr.join("\n");
    }
  }

  return [giris, klinik, onerilerStr, hekim].filter(Boolean).join("\n\n");
}
