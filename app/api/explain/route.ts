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
    // 1. Safe JSON Extraction
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonNoStore({ error: "Geçersiz JSON gövdesi." }, 400);
    }

    if (typeof body !== "object" || body === null) {
      return jsonNoStore({ error: "Geçersiz istek yapısı." }, 400);
    }

    const { interactionId, drugIds } = body as Record<string, unknown>;

    // 2. IP-based Fail-safe Rate Limiter via Upstash Redis
    if (redis) {
      try {
        const ip = request.headers.get("x-forwarded-for") ||
                   request.headers.get("x-real-ip") ||
                   "127.0.0.1";
        // Clean IP to avoid key injections
        const cleanIp = ip.split(",")[0].trim();
        const rateLimitKey = `ratelimit:explain:${cleanIp}`;

        const currentRequests = await redis.incr(rateLimitKey);
        if (currentRequests === 1) {
          await redis.expire(rateLimitKey, 60); // 1-minute window
        }

        if (currentRequests > 15) { // Limit to 15 requests per minute
          console.warn(`[Security Alert] Rate limit exceeded for IP: ${cleanIp}`);
          return jsonNoStore(
            {
              error: "Çok fazla istek gönderildi. Lütfen bir dakika bekleyin.",
              source: "error" as const,
              reason: "rate_limited"
            },
            429
          );
        }
      } catch (redisErr) {
        // Fail-safe: If Redis is down, log it but let the application continue
        console.warn("[Redis Rate Limiter] Resilient Fallback - Bypass due to Redis error:", redisErr);
      }
    }

    // 3. Fallback Check (Demo Mode / API Key Availability)
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

    // 4. Strict Validation for interactionId
    if (interactionId !== undefined) {
      if (typeof interactionId !== "string" || interactionId.trim() === "" || interactionId.length > 100) {
        return jsonNoStore({ error: "Geçersiz veya aşırı uzun interactionId." }, 400);
      }

      const ctx = await getInteractionContext(interactionId);
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

      const cacheKey = `explanation:v1:interaction:${interactionId}`;

      // Redis Cache Check (with fail-safe wrapper)
      if (redis) {
        try {
          const cached = await redis.get<{ explanation: string; generatedAt: string }>(cacheKey);
          if (cached) {
            console.info(`[Redis] Cache HIT for interaction: ${interactionId}`);
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

      // Gemini Execution
      try {
        const result = await callGeminiForInteraction(ctx);

        if (redis) {
          try {
            await redis.set(
              cacheKey,
              { explanation: result.explanation, generatedAt: result.generatedAt },
              { ex: 60 * 60 * 24 * 7 } // 7-day TTL
            );
            console.info(`[Redis] Cache WRITE for interaction: ${interactionId}`);
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

    // 5. Strict Validation for drugIds
    if (drugIds !== undefined) {
      if (
        !Array.isArray(drugIds) ||
        drugIds.length < 2 ||
        drugIds.length > 10 ||
        !drugIds.every(id => typeof id === "string" && id.trim() !== "" && id.length <= 50)
      ) {
        return jsonNoStore({ error: "drugIds 2 ila 10 adet geçerli kimlik içeren bir dizi olmalıdır." }, 400);
      }

      const ctx = getCoverageContext(drugIds);
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

      const sortedIds = [...drugIds].sort().join(":");
      const cacheKey = `explanation:v1:coverage:${sortedIds}`;

      // Redis Cache Check (with fail-safe wrapper)
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

      // Gemini Execution
      try {
        const result = await callGeminiForCoverage(ctx);

        if (redis) {
          try {
            await redis.set(
              cacheKey,
              { explanation: result.explanation, generatedAt: result.generatedAt },
              { ex: 60 * 60 * 24 * 7 } // 7-day TTL
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

    return jsonNoStore({ error: "interactionId veya en az 2 drugId alanı gereklidir." }, 400);

  } catch (error) {
    console.error("[Severe API Error] Explain route crashed:", error);
    return jsonNoStore({ error: "Açıklama oluşturulurken beklenmeyen bir sunucu hatası oluştu." }, 500);
  }
}
