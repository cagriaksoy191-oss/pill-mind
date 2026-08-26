import { jsonNoStore } from "@/lib/http";
import { verifyCSRF } from "@/lib/auth";
import {
  findInteractionsDB,
  checkAccumulationDB,
  resolveDrugsDB,
  PatientContext,
} from "@/lib/interactions";
import { redis } from "@/lib/redis";
import { getClientIp } from "@/lib/ip";


export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * POST /api/check
 * Accepts a list of drug IDs, returns found interactions from curated data.
 * Decision logic is deterministic (JSON or SQL lookup) — NOT LLM-based.
 */

// Extracted Helper: Request Parsing and Validation
async function parseAndValidateRequest(request: Request): Promise<{ errorResponse?: Response; drugIds?: string[]; patientContext?: PatientContext; }> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return {
      errorResponse: jsonNoStore(
        { error: "Kontrol sırasında bir hata oluştu." },
        500,
      ),
    };
  }

  if (typeof body !== "object" || body === null) {
    return {
      errorResponse: jsonNoStore(
        { error: "En az 2 ilaç ID'si gereklidir." },
        400,
      ),
    };
  }

  const { drugIds, patientContext } = body as {
    drugIds: string[];
    patientContext?: PatientContext;
  };

  if (!drugIds || !Array.isArray(drugIds) || drugIds.length < 2) {
    return {
      errorResponse: jsonNoStore(
        { error: "En az 2 ilaç ID'si gereklidir." },
        400,
      ),
    };
  }

  if (drugIds.length > 50) {
    return {
      errorResponse: jsonNoStore(
        { error: "Tek seferde en fazla 50 ilaç kontrol edilebilir." },
        400,
      ),
    };
  }

  if (
    !drugIds.every(
      (id) => typeof id === "string" && id.trim() !== "" && id.length <= 50,
    )
  ) {
    return {
      errorResponse: jsonNoStore({ error: "Geçersiz ilaç ID formatı." }, 400),
    };
  }

  return { drugIds, patientContext };
}

// Extracted Helper: Rate Limiting
async function checkRateLimit(request: Request) {
  if (!redis) return null;

  try {
    const ip = getClientIp(request);
    const rateLimitKey = `ratelimit:check:${ip}`;

    const currentRequests = await redis.incr(rateLimitKey);
    if (currentRequests === 1) {
      await redis.expire(rateLimitKey, 60);
    }

    if (currentRequests > 30) {
      console.error(
        `[Security Alert] Rate limit exceeded for check endpoint, IP: ${ip}`,
      );
      return jsonNoStore(
        { error: "Çok fazla istek gönderildi. Lütfen bir dakika bekleyin." },
        429,
      );
    }
  } catch (redisErr) {
    console.warn(
      "[Redis Rate Limiter] Blocked request due to Redis error:",
      redisErr,
    );
    return jsonNoStore(
      {
        error:
          "Hizmet şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.",
        source: "error" as const,
        reason: "service_unavailable",
      },
      503,
    );
  }
  return null;
}

export async function POST(request: Request) {
  try {
    if (!verifyCSRF(request)) {
      return jsonNoStore(
        { error: "Güvenlik doğrulaması başarısız oldu (CSRF engellendi)." },
        403
      );
    }
    const parsed = await parseAndValidateRequest(request);
    if (parsed.errorResponse) return parsed.errorResponse;
    const drugIds = parsed.drugIds!;
    const patientContext = parsed.patientContext;

    const rateLimitError = await checkRateLimit(request);
    if (rateLimitError) return rateLimitError;

    const {
      findFoodInteractionsDB,
      findContraindicationsDB,
      checkPolypharmacyAndBeers,
    } = await import("@/lib/interactions");

    const resolvedDrugsCache = await resolveDrugsDB(drugIds);
    const [results, accumulationWarnings, foodInteractions, contraindications] =
      await Promise.all([
        findInteractionsDB(drugIds, resolvedDrugsCache),
        checkAccumulationDB(drugIds, resolvedDrugsCache),
        typeof findFoodInteractionsDB === "function"
          ? findFoodInteractionsDB(drugIds, resolvedDrugsCache)
          : Promise.resolve([]),
        typeof findContraindicationsDB === "function"
          ? findContraindicationsDB(drugIds, patientContext, resolvedDrugsCache)
          : Promise.resolve([]),
      ]);
    const polypharmacyReport =
      typeof checkPolypharmacyAndBeers === "function"
        ? checkPolypharmacyAndBeers(drugIds, patientContext)
        : {
            score: drugIds.length,
            level: "low" as const,
            message: "",
            beersWarnings: [],
          };

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
    return jsonNoStore({ error: "Kontrol sırasında bir hata oluştu." }, 500);
  }
}
