import { NextResponse } from "next/server";
import { findInteractionsDB, checkAccumulationDB, resolveDrugsDB } from "@/lib/interactions";
import { redis } from "@/lib/redis";
import { getClientIp } from "@/lib/ip";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function jsonNoStore(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}

/**
 * POST /api/check
 * Accepts a list of drug IDs, returns found interactions from curated data.
 * Decision logic is deterministic (JSON or SQL lookup) — NOT LLM-based.
 */
export async function POST(request: Request) {
  try {
    // 1. Safe JSON Extraction
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonNoStore({ error: "Kontrol sırasında bir hata oluştu." }, 500); // Matches existing test expectations
    }

    if (typeof body !== "object" || body === null) {
      return jsonNoStore({ error: "En az 2 ilaç ID'si gereklidir." }, 400); // Matches existing tests
    }

    const { drugIds, patientContext } = body as { drugIds: string[]; patientContext?: any };

    if (!drugIds || !Array.isArray(drugIds) || drugIds.length < 2) {
      return jsonNoStore({ error: "En az 2 ilaç ID'si gereklidir." }, 400); // Matches existing tests
    }

    if (drugIds.length > 50) {
      return jsonNoStore({ error: "Tek seferde en fazla 50 ilaç kontrol edilebilir." }, 400);
    }

    if (!drugIds.every(id => typeof id === "string" && id.trim() !== "" && id.length <= 50)) {
      return jsonNoStore({ error: "Geçersiz ilaç ID formatı." }, 400);
    }

    // 2. IP-based Fail-safe Rate Limiter via Upstash Redis
    if (redis) {
      try {
        // Secure IP resolution, avoiding untrusted headers like x-forwarded-for or x-real-ip
        const ip = getClientIp(request);
        const rateLimitKey = `ratelimit:check:${ip}`;

        const currentRequests = await redis.incr(rateLimitKey);
        if (currentRequests === 1) {
          await redis.expire(rateLimitKey, 60); // 1-minute window
        }

        if (currentRequests > 30) { // Allow slightly higher limit for check
          console.warn(`[Security Alert] Rate limit exceeded for check endpoint, IP: ${ip}`);
          return jsonNoStore(
            { error: "Çok fazla istek gönderildi. Lütfen bir dakika bekleyin." },
            429
          );
        }
      } catch (redisErr) {
        // Fail-safe: If Redis is down, log it but let the application continue
        console.warn("[Redis Rate Limiter] Resilient Fallback - Bypass due to Redis error:", redisErr);
      }
    }

    const { findFoodInteractionsDB, findContraindicationsDB, checkPolypharmacyAndBeers } = await import("@/lib/interactions");

    const resolvedDrugsCache = await resolveDrugsDB(drugIds);
    const [
      results,
      accumulationWarnings,
      foodInteractions,
      contraindications
    ] = await Promise.all([
      findInteractionsDB(drugIds, resolvedDrugsCache),
      checkAccumulationDB(drugIds, resolvedDrugsCache),
      typeof findFoodInteractionsDB === "function" ? findFoodInteractionsDB(drugIds, resolvedDrugsCache) : Promise.resolve([]),
      typeof findContraindicationsDB === "function" ? findContraindicationsDB(drugIds, patientContext, resolvedDrugsCache) : Promise.resolve([])
    ]);
    const polypharmacyReport = typeof checkPolypharmacyAndBeers === "function"
      ? checkPolypharmacyAndBeers(drugIds, patientContext)
      : { score: drugIds.length, level: "low" as const, message: "", beersWarnings: [] };

    return jsonNoStore({
      interactions: results,
      accumulationWarnings,
      foodInteractions,
      contraindications,
      polypharmacyReport,
      checkedDrugs: drugIds,
      totalFound: results.length,
      disclaimer:
        "Bu sonuçlar sınırlı bir demo veri setine dayanabilir ve tıbbi tavsiye niteliği taşımaz.",
    });
  } catch (err) {
    console.error("API Check Error:", err);
    return jsonNoStore(
      { error: "Kontrol sırasında bir hata oluştu." },
      500
    );
  }
}
