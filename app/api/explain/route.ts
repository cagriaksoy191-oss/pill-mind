import { NextResponse } from "next/server";
import {
  callGeminiForCoverage,
  callGeminiForInteraction,
  getCoverageContext,
  getInteractionContext,
  shouldUseFallback,
} from "@/lib/gemini";
import { redis } from "@/lib/redis";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DISCLAIMER =
  "Bu açıklama bilgilendirme amaçlıdır ve tıbbi tavsiye niteliği taşımaz.";

function getErrorReason(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("429") || message.toLowerCase().includes("quota")) {
    return "rate_limited";
  }

  if (
    message.toLowerCase().includes("timeout") ||
    message.includes("AbortError")
  ) {
    return "timeout";
  }

  return "api_error";
}

function jsonNoStore(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      interactionId?: string;
      drugIds?: string[];
    };

    if (shouldUseFallback()) {
      const reason = process.env.GOOGLE_API_KEY ? "demo_mode" : "missing_api_key";

      return jsonNoStore(
        {
          error: "Canlı AI açıklaması şu anda kullanılamıyor.",
          source: "error" as const,
          reason,
          disclaimer: DISCLAIMER,
        },
        503
      );
    }

    if (body.interactionId) {
      const ctx = getInteractionContext(body.interactionId);

      if (!ctx) {
        return jsonNoStore(
          {
            error: "Bu etkileşim için canlı açıklama üretilemedi.",
            source: "error" as const,
            reason: "unknown_interaction",
            disclaimer: DISCLAIMER,
          },
          404
        );
      }

      const cacheKey = `explanation:v1:interaction:${body.interactionId}`;

      // Redis Önbellek Kontrolü
      if (redis) {
        try {
          const cached = await redis.get<{ explanation: string; generatedAt: string }>(cacheKey);
          if (cached) {
            console.info(`[Redis] Cache HIT for interaction: ${body.interactionId}`);
            return jsonNoStore({
              explanation: cached.explanation,
              source: "cache" as const, // Or "gemini_live" with a separate flag, but "cache" is cleaner. Let's return "cache"
              generatedAt: cached.generatedAt,
              disclaimer: DISCLAIMER,
            });
          }
        } catch (err) {
          console.warn("[Redis] Cache read error, continuing to live AI:", err);
        }
      }

      try {
        const result = await callGeminiForInteraction(ctx);

        // Redis'e Kaydetme
        if (redis) {
          try {
            await redis.set(
              cacheKey,
              { explanation: result.explanation, generatedAt: result.generatedAt },
              { ex: 60 * 60 * 24 * 7 } // 7 Gün TTL
            );
            console.info(`[Redis] Cache WRITE for interaction: ${body.interactionId}`);
          } catch (err) {
            console.warn("[Redis] Cache write error:", err);
          }
        }

        return jsonNoStore({
          explanation: result.explanation,
          source: "gemini_live" as const,
          generatedAt: result.generatedAt,
          disclaimer: DISCLAIMER,
        });
      } catch (error) {
        return jsonNoStore(
          {
            error: "Canlı AI açıklaması şu anda üretilemedi.",
            source: "error" as const,
            reason: getErrorReason(error),
            disclaimer: DISCLAIMER,
          },
          503
        );
      }
    }

    if (Array.isArray(body.drugIds) && body.drugIds.length >= 2) {
      const ctx = getCoverageContext(body.drugIds);

      if (!ctx) {
        return jsonNoStore(
          {
            error: "Bu kombinasyon için canlı kapsam açıklaması üretilemedi.",
            source: "error" as const,
            reason: "unknown_drugs",
            disclaimer: DISCLAIMER,
          },
          404
        );
      }

      // Benzersiz ve sıralı ilaç kimlikleriyle cache anahtarı oluşturma
      const sortedIds = [...body.drugIds].sort().join(":");
      const cacheKey = `explanation:v1:coverage:${sortedIds}`;

      // Redis Önbellek Kontrolü
      if (redis) {
        try {
          const cached = await redis.get<{ explanation: string; generatedAt: string }>(cacheKey);
          if (cached) {
            console.info(`[Redis] Cache HIT for coverage: ${sortedIds}`);
            return jsonNoStore({
              explanation: cached.explanation,
              source: "cache" as const,
              generatedAt: cached.generatedAt,
              disclaimer: DISCLAIMER,
            });
          }
        } catch (err) {
          console.warn("[Redis] Cache read error, continuing to live AI:", err);
        }
      }

      try {
        const result = await callGeminiForCoverage(ctx);

        // Redis'e Kaydetme
        if (redis) {
          try {
            await redis.set(
              cacheKey,
              { explanation: result.explanation, generatedAt: result.generatedAt },
              { ex: 60 * 60 * 24 * 7 } // 7 Gün TTL
            );
            console.info(`[Redis] Cache WRITE for coverage: ${sortedIds}`);
          } catch (err) {
            console.warn("[Redis] Cache write error:", err);
          }
        }

        return jsonNoStore({
          explanation: result.explanation,
          source: "gemini_live" as const,
          generatedAt: result.generatedAt,
          disclaimer: DISCLAIMER,
        });
      } catch (error) {
        return jsonNoStore(
          {
            error: "Canlı AI açıklaması şu anda üretilemedi.",
            source: "error" as const,
            reason: getErrorReason(error),
            disclaimer: DISCLAIMER,
          },
          503
        );
      }
    }

    return jsonNoStore(
      { error: "interactionId veya en az 2 drugId gereklidir." },
      400
    );
  } catch {
    return jsonNoStore(
      { error: "Açıklama oluşturulurken bir hata oluştu." },
      500
    );
  }
}

