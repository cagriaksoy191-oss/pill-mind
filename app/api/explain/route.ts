import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import {
  callGeminiForCoverage,
  callGeminiForInteraction,
  getCoverageContext,
  getInteractionContext,
  shouldUseFallback,
} from "@/lib/gemini";
import { redis } from "@/lib/redis";
import { getClientIp } from "@/lib/ip";

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

async function handleInteraction(interactionId: unknown) {
  if (
    typeof interactionId !== "string" ||
    interactionId.trim() === "" ||
    interactionId.length > 100
  ) {
    return jsonNoStore(
      { error: "Geçersiz veya aşırı uzun interactionId." },
      400,
    );
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
      404,
    );
  }

  const cacheKey = `explanation:v1:interaction:${interactionId}`;

  // Redis Cache Check (with fail-safe wrapper)
  if (redis) {
    try {
      const cached = await redis.get<{
        explanation: string;
        generatedAt: string;
      }>(cacheKey);
      if (cached) {
        return jsonNoStore({
          explanation: cached.explanation,
          source: "cache" as const,
          generatedAt: cached.generatedAt,
          disclaimer: DISCLAIMER,
        });
      }
    } catch (err) {
      Sentry.captureException(err, { tags: { redis: "read_error" } });
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
          { ex: 60 * 60 * 24 * 7 }, // 7-day TTL
        );
      } catch (err) {
        Sentry.captureException(err, { tags: { redis: "write_error" } });
      }
    }

    return jsonNoStore({
      explanation: result.explanation,
      source: "gemini_live" as const,
      generatedAt: result.generatedAt,
      disclaimer: DISCLAIMER,
    });
  } catch (error) {
    console.warn(
      "Detailed explanation fallback failed, using basic format:",
      error,
    );
    return NextResponse.json(
      { result: "Etkileşim analizi yapılamadı. Lütfen doktorunuza danışın." },
      { status: 500 },
    );
  }
}

async function handleCoverage(drugIds: unknown) {
  if (
    !Array.isArray(drugIds) ||
    drugIds.length < 2 ||
    drugIds.length > 10 ||
    !drugIds.every(
      (id) => typeof id === "string" && id.trim() !== "" && id.length <= 50,
    )
  ) {
    return jsonNoStore(
      {
        error:
          "drugIds 2 ila 10 adet geçerli kimlik içeren bir dizi olmalıdır.",
      },
      400,
    );
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
      404,
    );
  }

  const sortedIds = [...drugIds].sort().join(":");
  const cacheKey = `explanation:v1:coverage:${sortedIds}`;

  // Redis Cache Check (with fail-safe wrapper)
  if (redis) {
    try {
      const cached = await redis.get<{
        explanation: string;
        generatedAt: string;
      }>(cacheKey);
      if (cached) {
        return jsonNoStore({
          explanation: cached.explanation,
          source: "cache" as const,
          generatedAt: cached.generatedAt,
          disclaimer: DISCLAIMER,
        });
      }
    } catch (err) {
      Sentry.captureException(err, { tags: { redis: "read_error" } });
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
          { ex: 60 * 60 * 24 * 7 }, // 7-day TTL
        );
      } catch (err) {
        Sentry.captureException(err, { tags: { redis: "write_error" } });
      }
    }

    return jsonNoStore({
      explanation: result.explanation,
      source: "gemini_live" as const,
      generatedAt: result.generatedAt,
      disclaimer: DISCLAIMER,
    });
  } catch (error) {
    console.warn(
      "Detailed explanation fallback failed, using basic format:",
      error,
    );
    return NextResponse.json(
      { result: "Etkileşim analizi yapılamadı. Lütfen doktorunuza danışın." },
      { status: 500 },
    );
  }
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
        // Security Fix: Mitigated IP Spoofing via Insecure x-forwarded-for Header Access by centrally validating and extracting the correct IP.
        // Secure IP resolution, avoiding untrusted headers like x-forwarded-for or x-real-ip
        const ip = getClientIp(request);
        const rateLimitKey = `ratelimit:explain:${ip}`;

        const currentRequests = await redis.incr(rateLimitKey);
        if (currentRequests === 1) {
          await redis.expire(rateLimitKey, 60); // 1-minute window
        }

        if (currentRequests > 15) {
          // Limit to 15 requests per minute
          Sentry.captureMessage(
            `[Security Alert] Rate limit exceeded for IP: ${ip}`,
            "warning",
          );
          return jsonNoStore(
            {
              error: "Çok fazla istek gönderildi. Lütfen bir dakika bekleyin.",
              source: "error" as const,
              reason: "rate_limited",
            },
            429,
          );
        }
      } catch (redisErr) {
        // Fail-safe: If Redis is down, log it but let the application continue
        Sentry.captureException(redisErr, {
          tags: { redis: "rate_limit_error" },
        });
      }
    }

    // 3. Fallback Check (Demo Mode / API Key Availability)
    if (shouldUseFallback()) {
      const reason = process.env.GOOGLE_API_KEY
        ? "demo_mode"
        : "missing_api_key";
      return jsonNoStore(
        {
          error: "Canlı AI açıklaması şu anda kullanılamıyor.",
          source: "error" as const,
          reason,
          disclaimer: DISCLAIMER,
        },
        503,
      );
    }

    // 4. Strict Validation for interactionId
    if (interactionId !== undefined) {
      return await handleInteraction(interactionId);
    }

    // 5. Strict Validation for drugIds
    if (drugIds !== undefined) {
      return await handleCoverage(drugIds);
    }

    return jsonNoStore(
      { error: "interactionId veya en az 2 drugId alanı gereklidir." },
      400,
    );
  } catch (error) {
    Sentry.captureException(error, { tags: { route: "explain_crash" } });
    return jsonNoStore(
      {
        error: "Açıklama oluşturulurken beklenmeyen bir sunucu hatası oluştu.",
      },
      500,
    );
  }
}
