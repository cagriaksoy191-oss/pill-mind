import { NextResponse } from "next/server";
import {
  callGeminiForCoverage,
  callGeminiForInteraction,
  getCoverageContext,
  getInteractionContext,
  shouldUseFallback,
  streamGeminiContent,
  buildInteractionStreamPrompt,
  buildCoverageStreamPrompt,
  isOutputSafe,
  runReviewerAgent,
} from "@/lib/gemini";
import { redis } from "@/lib/redis";
import { getClientIp } from "@/lib/ip";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SNAPSHOT_VERSION = "2026.06.26";
const SCHEMA_VERSION = "3.0.0";

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

  const isHighSeverity = ctx.interaction.severity === "high" || ctx.interaction.severity === "HIGH";
  const cacheKey = `explanation:v3:interaction:${interactionId}:data:${SNAPSHOT_VERSION}:schema:${SCHEMA_VERSION}:locale:tr`;

  // Redis Cache Check (with fail-safe wrapper)
  if (redis) {
    try {
      const cached = await redis.get<{
        explanation: string;
        generatedAt: string;
        kaynakOzeti?: string;
        belirsizlikNotu?: string;
        hastaDiliRiskEtiketi?: string;
        hekimModuKisaMekanizma?: string;
        yasakliEylemKontrolu?: string;
        sourceIds?: string[];
      }>(cacheKey);
      if (cached) {
        console.info(`[Redis] Cache HIT for interaction: ${interactionId}`);
        return jsonNoStore({
          explanation: cached.explanation,
          source: "cache" as const,
          generatedAt: cached.generatedAt,
          disclaimer: DISCLAIMER,
          kaynakOzeti: cached.kaynakOzeti,
          belirsizlikNotu: cached.belirsizlikNotu,
          hastaDiliRiskEtiketi: cached.hastaDiliRiskEtiketi,
          hekimModuKisaMekanizma: cached.hekimModuKisaMekanizma,
          yasakliEylemKontrolu: cached.yasakliEylemKontrolu,
          sourceIds: cached.sourceIds,
        });
      }
    } catch (err) {
      console.warn("[Redis] Cache read error, continuing to live AI:", err);
    }
  }

  // Gemini Execution
  try {
    const result = await callGeminiForInteraction(ctx);
    const parsedJSON = result.parsedJSON || {};

    if (redis) {
      try {
        await redis.set(
          cacheKey,
          {
            explanation: result.explanation,
            generatedAt: result.generatedAt,
            kaynakOzeti: parsedJSON.kaynakOzeti,
            belirsizlikNotu: parsedJSON.belirsizlikNotu,
            hastaDiliRiskEtiketi: parsedJSON.hastaDiliRiskEtiketi,
            hekimModuKisaMekanizma: parsedJSON.hekimModuKisaMekanizma,
            yasakliEylemKontrolu: parsedJSON.yasakliEylemKontrolu,
            sourceIds: parsedJSON.sourceIds,
          },
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
      kaynakOzeti: parsedJSON.kaynakOzeti,
      belirsizlikNotu: parsedJSON.belirsizlikNotu,
      hastaDiliRiskEtiketi: parsedJSON.hastaDiliRiskEtiketi,
      hekimModuKisaMekanizma: parsedJSON.hekimModuKisaMekanizma,
      yasakliEylemKontrolu: parsedJSON.yasakliEylemKontrolu,
      sourceIds: parsedJSON.sourceIds,
    });
  } catch (error) {
    // Fail-closed for High Severity
    if (isHighSeverity) {
      console.warn(`[Severe Security Action] High severity interaction ${interactionId} blocked. Fail-closed activated.`);
      return jsonNoStore(
        {
          error: "Güvenlik nedeniyle canlı AI açıklaması engellendi.",
          source: "error" as const,
          reason: "safety_block",
          disclaimer: DISCLAIMER,
        },
        503
      );
    }

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

async function handleCoverage(drugIds: unknown) {
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
  const cacheKey = `explanation:v3:coverage:${sortedIds}:data:${SNAPSHOT_VERSION}:schema:${SCHEMA_VERSION}:locale:tr`;

  // Redis Cache Check (with fail-safe wrapper)
  if (redis) {
    try {
      const cached = await redis.get<{
        explanation: string;
        generatedAt: string;
        kaynakOzeti?: string;
        belirsizlikNotu?: string;
        hastaDiliRiskEtiketi?: string;
        hekimModuKisaMekanizma?: string;
        yasakliEylemKontrolu?: string;
        sourceIds?: string[];
      }>(cacheKey);
      if (cached) {
        console.info(`[Redis] Cache HIT for coverage: ${sortedIds}`);
        return jsonNoStore({
          explanation: cached.explanation,
          source: "cache" as const,
          generatedAt: cached.generatedAt,
          disclaimer: DISCLAIMER,
          kaynakOzeti: cached.kaynakOzeti,
          belirsizlikNotu: cached.belirsizlikNotu,
          hastaDiliRiskEtiketi: cached.hastaDiliRiskEtiketi,
          hekimModuKisaMekanizma: cached.hekimModuKisaMekanizma,
          yasakliEylemKontrolu: cached.yasakliEylemKontrolu,
          sourceIds: cached.sourceIds,
        });
      }
    } catch (err) {
      console.warn("[Redis] Cache read error, continuing to live AI:", err);
    }
  }

  // Gemini Execution
  try {
    const result = await callGeminiForCoverage(ctx);
    const parsedJSON = result.parsedJSON || {};

    if (redis) {
      try {
        await redis.set(
          cacheKey,
          {
            explanation: result.explanation,
            generatedAt: result.generatedAt,
            kaynakOzeti: parsedJSON.kaynakOzeti,
            belirsizlikNotu: parsedJSON.belirsizlikNotu,
            hastaDiliRiskEtiketi: parsedJSON.hastaDiliRiskEtiketi,
            hekimModuKisaMekanizma: parsedJSON.hekimModuKisaMekanizma,
            yasakliEylemKontrolu: parsedJSON.yasakliEylemKontrolu,
            sourceIds: parsedJSON.sourceIds,
          },
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
      kaynakOzeti: parsedJSON.kaynakOzeti,
      belirsizlikNotu: parsedJSON.belirsizlikNotu,
      hastaDiliRiskEtiketi: parsedJSON.hastaDiliRiskEtiketi,
      hekimModuKisaMekanizma: parsedJSON.hekimModuKisaMekanizma,
      yasakliEylemKontrolu: parsedJSON.yasakliEylemKontrolu,
      sourceIds: parsedJSON.sourceIds,
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

async function handleInteractionStream(interactionId: string) {
  const ctx = await getInteractionContext(interactionId);
  if (!ctx) {
    return jsonNoStore({ error: "Bu etkileşim için canlı açıklama üretilemedi." }, 404);
  }

  const isHighSeverity = ctx.interaction.severity === "high" || ctx.interaction.severity === "HIGH";
  const cacheKey = `explanation:v3:interaction:${interactionId}:data:${SNAPSHOT_VERSION}:schema:${SCHEMA_VERSION}:locale:tr`;

  // Check Redis Cache
  if (redis) {
    try {
      const cached = await redis.get<{ explanation: string; generatedAt: string }>(cacheKey);
      if (cached) {
        return new Response(
          new ReadableStream({
            start(controller) {
              const encoder = new TextEncoder();
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk: cached.explanation, source: "cache", generatedAt: cached.generatedAt })}\n\n`));
              controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
              controller.close();
            }
          }),
          {
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache, no-transform",
              "Connection": "keep-alive",
            }
          }
        );
      }
    } catch (err) {
      console.warn("[Redis] Cache read error, continuing to live AI:", err);
    }
  }

  const prompt = buildInteractionStreamPrompt(ctx);

  return new Response(
    new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let buffer = "";

        try {
          const streamGenerator = streamGeminiContent(prompt);
          for await (const chunk of streamGenerator) {
            buffer += chunk;

            // Chunk-level regex check
            if (!isOutputSafe(buffer)) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                error: "AI çıktısı klinik güvenlik kurallarını (regex) ihlal ediyor.",
                code: "UNSAFE_ALERT",
                reason: isHighSeverity ? "safety_block" : undefined
              })}\n\n`));
              controller.close();
              return;
            }

            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`));
          }

          // Stream finished. Run Reviewer Agent
          const isSafe = await runReviewerAgent(buffer);
          if (!isSafe) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              error: "AI çıktısı klinik güvenlik kurallarını (Reviewer Agent) ihlal ediyor.",
              code: "REJECTED",
              reason: isHighSeverity ? "safety_block" : undefined
            })}\n\n`));
            controller.close();
            return;
          }

          // Safe! Cache the result
          const generatedAt = new Intl.DateTimeFormat("tr-TR", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }).format(new Date());

          if (redis) {
            try {
              await redis.set(
                cacheKey,
                { explanation: buffer, generatedAt },
                { ex: 60 * 60 * 24 * 7 }
              );
            } catch (err) {
              console.warn("[Redis] Cache write error:", err);
            }
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, generatedAt })}\n\n`));
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        } catch (error) {
          console.error("[Stream Error]", error);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            error: "Canlı AI açıklaması şu anda üretilemedi.",
            code: "API_ERROR",
            reason: isHighSeverity ? "safety_block" : undefined
          })}\n\n`));
          controller.close();
        }
      }
    }),
    {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
      }
    }
  );
}

async function handleCoverageStream(drugIds: string[]) {
  const ctx = getCoverageContext(drugIds);
  if (!ctx) {
    return jsonNoStore({ error: "Bu kombinasyon için canlı kapsam açıklaması üretilemedi." }, 404);
  }

  const sortedIds = [...drugIds].sort().join(":");
  const cacheKey = `explanation:v3:coverage:${sortedIds}:data:${SNAPSHOT_VERSION}:schema:${SCHEMA_VERSION}:locale:tr`;

  // Check Redis Cache
  if (redis) {
    try {
      const cached = await redis.get<{ explanation: string; generatedAt: string }>(cacheKey);
      if (cached) {
        return new Response(
          new ReadableStream({
            start(controller) {
              const encoder = new TextEncoder();
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk: cached.explanation, source: "cache", generatedAt: cached.generatedAt })}\n\n`));
              controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
              controller.close();
            }
          }),
          {
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache, no-transform",
              "Connection": "keep-alive",
            }
          }
        );
      }
    } catch (err) {
      console.warn("[Redis] Cache read error, continuing to live AI:", err);
    }
  }

  const prompt = buildCoverageStreamPrompt(ctx);

  return new Response(
    new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let buffer = "";

        try {
          const streamGenerator = streamGeminiContent(prompt);
          for await (const chunk of streamGenerator) {
            buffer += chunk;

            // Chunk-level regex check
            if (!isOutputSafe(buffer)) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "AI çıktısı klinik güvenlik kurallarını (regex) ihlal ediyor.", code: "UNSAFE_ALERT" })}\n\n`));
              controller.close();
              return;
            }

            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`));
          }

          // Stream finished. Run Reviewer Agent
          const isSafe = await runReviewerAgent(buffer);
          if (!isSafe) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "AI çıktısı klinik güvenlik kurallarını (Reviewer Agent) ihlal ediyor.", code: "REJECTED" })}\n\n`));
            controller.close();
            return;
          }

          // Safe! Cache the result
          const generatedAt = new Intl.DateTimeFormat("tr-TR", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }).format(new Date());

          if (redis) {
            try {
              await redis.set(
                cacheKey,
                { explanation: buffer, generatedAt },
                { ex: 60 * 60 * 24 * 7 }
              );
            } catch (err) {
              console.warn("[Redis] Cache write error:", err);
            }
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, generatedAt })}\n\n`));
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        } catch (error) {
          console.error("[Stream Error]", error);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "Canlı AI açıklaması şu anda üretilemedi.", code: "API_ERROR" })}\n\n`));
          controller.close();
        }
      }
    }),
    {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
      }
    }
  );
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

    const { interactionId, drugIds, stream } = body as Record<string, unknown>;

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

        if (currentRequests > 15) { // Limit to 15 requests per minute
          console.warn(`[Security Alert] Rate limit exceeded for IP: ${ip}`);
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
      if (stream === true) {
        if (typeof interactionId !== "string" || interactionId.trim() === "" || interactionId.length > 100) {
          return jsonNoStore({ error: "Geçersiz veya aşırı uzun interactionId." }, 400);
        }
        return await handleInteractionStream(interactionId);
      }
      return await handleInteraction(interactionId);
    }

    // 5. Strict Validation for drugIds
    if (drugIds !== undefined) {
      if (stream === true) {
        if (
          !Array.isArray(drugIds) ||
          drugIds.length < 2 ||
          drugIds.length > 10 ||
          !drugIds.every(id => typeof id === "string" && id.trim() !== "" && id.length <= 50)
        ) {
          return jsonNoStore({ error: "drugIds 2 ila 10 adet geçerli kimlik içeren bir dizi olmalıdır." }, 400);
        }
        return await handleCoverageStream(drugIds);
      }
      return await handleCoverage(drugIds);
    }

    return jsonNoStore({ error: "interactionId veya en az 2 drugId alanı gereklidir." }, 400);

  } catch (error) {
    console.error("[Severe API Error] Explain route crashed:", error);
    return jsonNoStore({ error: "Açıklama oluşturulurken beklenmeyen bir sunucu hatası oluştu." }, 500);
  }
}
