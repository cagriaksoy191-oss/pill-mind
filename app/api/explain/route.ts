import { jsonNoStore } from "@/lib/http";
import { verifyCSRF } from "@/lib/auth";
import * as Sentry from "@sentry/nextjs";
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

interface CachedExplanation {
  explanation: string;
  generatedAt: string;
  kaynakOzeti?: string;
  belirsizlikNotu?: string;
  hastaDiliRiskEtiketi?: string;
  hekimModuKisaMekanizma?: string;
  yasakliEylemKontrolu?: string;
  sourceIds?: string[];
}

export async function getCachedExplanation(cacheKey: string): Promise<CachedExplanation | null> {
  if (!redis) return null;
  try {
    const cached = await redis.get<CachedExplanation>(cacheKey);
    if (cached) {
      return cached;
    }
  } catch (err) {
    console.warn("[Redis] Cache read error, continuing to live AI:", err);
  }
  return null;
}

export async function setCachedExplanation(cacheKey: string, data: CachedExplanation): Promise<void> {
  if (!redis) return;
  try {
    await redis.set(
      cacheKey,
      data,
      { ex: 60 * 60 * 24 * 7 } // 7-day TTL
    );
  } catch (err) {
    console.warn("[Redis] Cache write error:", err);
  }
}

function buildCacheData(result: {
  explanation: string;
  generatedAt: string;
  parsedJSON?: {
    kaynakOzeti?: string;
    belirsizlikNotu?: string;
    hastaDiliRiskEtiketi?: string;
    hekimModuKisaMekanizma?: string;
    yasakliEylemKontrolu?: string;
    sourceIds?: string[];
  } | null;
}): CachedExplanation {
  if (result.parsedJSON) {
    return {
      explanation: result.explanation,
      generatedAt: result.generatedAt,
      kaynakOzeti: result.parsedJSON.kaynakOzeti ?? undefined,
      belirsizlikNotu: result.parsedJSON.belirsizlikNotu ?? undefined,
      hastaDiliRiskEtiketi: result.parsedJSON.hastaDiliRiskEtiketi ?? undefined,
      hekimModuKisaMekanizma: result.parsedJSON.hekimModuKisaMekanizma ?? undefined,
      yasakliEylemKontrolu: result.parsedJSON.yasakliEylemKontrolu ?? undefined,
      sourceIds: result.parsedJSON.sourceIds ?? undefined,
    };
  }
  return {
    explanation: result.explanation,
    generatedAt: result.generatedAt,
  };
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

  const cached = await getCachedExplanation(cacheKey);
  if (cached) {
    console.info(`[Redis] Cache HIT for interaction: ${interactionId}`);
    return jsonNoStore({
      ...cached,
      source: "cache" as const,
      disclaimer: DISCLAIMER,
    });
  }

  // Gemini Execution
  try {
    const result = await callGeminiForInteraction(ctx);
    const cacheData = buildCacheData(result);

    await setCachedExplanation(cacheKey, cacheData);
    console.info(`[Redis] Cache WRITE for interaction: ${interactionId}`);

    return jsonNoStore({
      ...cacheData,
      source: "gemini_live" as const,
      disclaimer: DISCLAIMER,
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

  const cached = await getCachedExplanation(cacheKey);
  if (cached) {
    console.info(`[Redis] Cache HIT for coverage: ${sortedIds}`);
    return jsonNoStore({
      ...cached,
      source: "cache" as const,
      disclaimer: DISCLAIMER,
    });
  }

  // Gemini Execution
  try {
    const result = await callGeminiForCoverage(ctx);
    const cacheData = buildCacheData(result);

    await setCachedExplanation(cacheKey, cacheData);
    console.info(`[Redis] Cache WRITE for coverage: ${sortedIds}`);

    return jsonNoStore({
      ...cacheData,
      source: "gemini_live" as const,
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

function createCachedStreamResponse(cached: CachedExplanation) {
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

function createLiveStreamResponse(prompt: string, cacheKey: string, isHighSeverity: boolean) {
  return new Response(
    new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const chunks: string[] = [];
        let windowBuffer = "";

        try {
          const streamGenerator = streamGeminiContent(prompt);
          for await (const chunk of streamGenerator) {
            chunks.push(chunk);
            windowBuffer += chunk;

            // Chunk-level regex check
            if (!isOutputSafe(windowBuffer)) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                error: "AI çıktısı klinik güvenlik kurallarını (regex) ihlal ediyor.",
                code: "UNSAFE_ALERT",
                reason: isHighSeverity ? "safety_block" : undefined
              })}\n\n`));
              controller.close();
              return;
            }

            windowBuffer = windowBuffer.slice(-200);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`));
          }

          // Stream finished. Run Reviewer Agent
          const buffer = chunks.join("");
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

          await setCachedExplanation(cacheKey, { explanation: buffer, generatedAt });

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

async function handleInteractionStream(interactionId: string) {
  const ctx = await getInteractionContext(interactionId);
  if (!ctx) {
    return jsonNoStore({ error: "Bu etkileşim için canlı açıklama üretilemedi." }, 404);
  }

  const isHighSeverity = ctx.interaction.severity === "high" || ctx.interaction.severity === "HIGH";
  const cacheKey = `explanation:v3:interaction:${interactionId}:data:${SNAPSHOT_VERSION}:schema:${SCHEMA_VERSION}:locale:tr`;

  const cached = await getCachedExplanation(cacheKey);
  if (cached) {
    return createCachedStreamResponse(cached);
  }

  const prompt = buildInteractionStreamPrompt(ctx);
  return createLiveStreamResponse(prompt, cacheKey, isHighSeverity);
}

async function handleCoverageStream(drugIds: string[]) {
  const ctx = getCoverageContext(drugIds);
  if (!ctx) {
    return jsonNoStore({ error: "Bu kombinasyon için canlı kapsam açıklaması üretilemedi." }, 404);
  }

  const sortedIds = [...drugIds].sort().join(":");
  const cacheKey = `explanation:v3:coverage:${sortedIds}:data:${SNAPSHOT_VERSION}:schema:${SCHEMA_VERSION}:locale:tr`;

  const cached = await getCachedExplanation(cacheKey);
  if (cached) {
    return createCachedStreamResponse(cached);
  }

  const prompt = buildCoverageStreamPrompt(ctx);
  return createLiveStreamResponse(prompt, cacheKey, false);
}

async function parseRequestBody(request: Request): Promise<{
  data?: Record<string, unknown>;
  errorResponse?: Response;
}> {
  if (!verifyCSRF(request)) {
    return {
      errorResponse: jsonNoStore(
        { error: "Güvenlik doğrulaması başarısız oldu (CSRF engellendi)." },
        403
      ),
    };
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { errorResponse: jsonNoStore({ error: "Geçersiz JSON gövdesi." }, 400) };
  }

  if (typeof body !== "object" || body === null) {
    return { errorResponse: jsonNoStore({ error: "Geçersiz istek yapısı." }, 400) };
  }

  return { data: body as Record<string, unknown> };
}

async function applyRateLimit(request: Request): Promise<Response | null> {
  if (!redis) return null;

  try {
    const ip = getClientIp(request);
    const rateLimitKey = `ratelimit:explain:${ip}`;

    const currentRequests = await redis.incr(rateLimitKey);
    if (currentRequests === 1) {
      await redis.expire(rateLimitKey, 60);
    }

    if (currentRequests > 15) {
      console.warn("[Security Alert] Rate limit exceeded for explain endpoint");
      return jsonNoStore(
        {
          error: "Çok fazla istek gönderildi. Lütfen bir dakika bekleyin.",
          source: "error" as const,
          reason: "rate_limited",
        },
        429
      );
    }
  } catch (redisErr) {
    console.warn("Rate limit redis error:", redisErr);
    Sentry.captureException(redisErr);
  }

  return null;
}

async function routeExplainRequest(
  interactionId: unknown,
  drugIds: unknown,
  stream: unknown
): Promise<Response> {
  if (interactionId !== undefined) {
    if (stream === true) {
      if (typeof interactionId !== "string" || interactionId.trim() === "" || interactionId.length > 100) {
        return jsonNoStore({ error: "Geçersiz veya aşırı uzun interactionId." }, 400);
      }
      return await handleInteractionStream(interactionId);
    }
    return await handleInteraction(interactionId);
  }

  if (drugIds !== undefined) {
    if (stream === true) {
      if (
        !Array.isArray(drugIds) ||
        drugIds.length < 2 ||
        drugIds.length > 10 ||
        !drugIds.every((id) => typeof id === "string" && id.trim() !== "" && id.length <= 50)
      ) {
        return jsonNoStore({ error: "drugIds 2 ila 10 adet geçerli kimlik içeren bir dizi olmalıdır." }, 400);
      }
      return await handleCoverageStream(drugIds);
    }
    return await handleCoverage(drugIds);
  }

  return jsonNoStore({ error: "interactionId veya en az 2 drugId alanı gereklidir." }, 400);
}

export async function POST(request: Request) {
  try {
    const { data, errorResponse } = await parseRequestBody(request);
    if (errorResponse) return errorResponse;

    const rateLimitResponse = await applyRateLimit(request);
    if (rateLimitResponse) return rateLimitResponse;

    if (shouldUseFallback()) {
      return jsonNoStore(
        {
          error: "Canlı AI açıklaması şu anda kullanılamıyor.",
          source: "error" as const,
          reason: "demo_mode",
          disclaimer: DISCLAIMER,
        },
        503
      );
    }

    const { interactionId, drugIds, stream } = data!;
    return await routeExplainRequest(interactionId, drugIds, stream);
  } catch (error) {
    console.error("[Severe API Error] Explain route crashed:", error);
    return jsonNoStore(
      { error: "Açıklama oluşturulurken beklenmeyen bir sunucu hatası oluştu." },
      500
    );
  }
}
