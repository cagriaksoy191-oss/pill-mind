import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import fallbackResponses from "@/data/fallback-responses.json";
import {
  getInteractionContext,
  shouldUseFallback,
  callGemini,
  isOutputSafe,
  isExplanationComplete,
} from "@/lib/gemini";

/**
 * POST /api/explain
 *
 * Returns a plain-Turkish explanation for a given drug interaction.
 *
 * Decision flow:
 *   1. If demo mode or no API key → mock
 *   2. Try Gemini API
 *   3. If Gemini fails or output is unsafe → mock fallback
 *
 *
 * Response shape is always:
 *   { explanation, source: "gemini_live" | "gemini_cached" | "fallback", disclaimer }
 */

type CacheEntry = {
  explanation: string;
  generatedAt: string;
  timestamp: number;
};

// ── Persistent Cache Configuration ──
const CACHE_FILE = path.join(process.cwd(), '.cache', 'gemini-explanations.json');
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours for demo stability

let explanationCache: Map<string, CacheEntry> | null = null;

function isCacheEntryValid(entry: CacheEntry, now = Date.now()): boolean {
  return now - entry.timestamp < CACHE_TTL && isExplanationComplete(entry.explanation);
}

function persistCache(cache: Map<string, CacheEntry>) {
  try {
    const dir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const obj = Object.fromEntries(cache.entries());
    fs.writeFileSync(CACHE_FILE, JSON.stringify(obj, null, 2), "utf-8");
  } catch (e) {
    console.warn("[API_EXPLAIN] Failed to save persistent cache", e);
  }
}

function getCache(): Map<string, CacheEntry> {
  if (explanationCache) return explanationCache;
  
  explanationCache = new Map<string, CacheEntry>();
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const data = fs.readFileSync(CACHE_FILE, 'utf-8');
      const parsed = JSON.parse(data) as Record<string, CacheEntry>;
      
      const now = Date.now();
      let pruned = false;
      for (const [k, v] of Object.entries(parsed)) {
        if (isCacheEntryValid(v, now)) {
          explanationCache.set(k, v);
        } else {
          pruned = true;
        }
      }

      if (pruned) {
        persistCache(explanationCache);
      }
    }
  } catch (e) {
    console.warn("[API_EXPLAIN] Failed to load persistent cache", e);
  }
  return explanationCache;
}

function saveCache(interactionId: string, entry: CacheEntry) {
  const cache = getCache();
  cache.set(interactionId, entry);

  persistCache(cache);
}

const DISCLAIMER = "Bu açıklama bilgilendirme amaçlıdır ve tıbbi tavsiye niteliği taşımaz.";

function getFallbackResponse(interactionId: string): string {
  const responses = fallbackResponses as Record<string, string>;
  return (
    responses[interactionId] ??
    responses["_default"] ??
    "Yedek açıklama geçici olarak yüklenemedi."
  );
}

function createFallbackResponse(interactionId: string, reason: string) {
  return NextResponse.json({
    explanation: getFallbackResponse(interactionId),
    source: "fallback" as const,
    generatedAt: undefined,
    disclaimer: DISCLAIMER,
    fallbackReason: reason,
  });
}

function getCachedResponse(interactionId: string, refresh: boolean) {
  const cache = getCache();
  const cached = cache.get(interactionId);

  if (cached && !isCacheEntryValid(cached)) {
    cache.delete(interactionId);
    persistCache(cache);
    return null;
  }

  if (!refresh && cached && isCacheEntryValid(cached)) {
    return NextResponse.json({
      explanation: cached.explanation,
      source: "gemini_cached" as const,
      generatedAt: cached.generatedAt,
      disclaimer: DISCLAIMER,
    });
  }

  return null;
}

function mapErrorToFallbackReason(e: unknown): string {
  const errorMsg = e instanceof Error ? e.message : String(e);
  if (errorMsg.includes("429") || errorMsg.includes("quota")) return "rate_limited";
  if (errorMsg.includes("timeout") || errorMsg.includes("AbortError")) return "timeout";
  return "api_error";
}

export async function POST(request: Request) {
  const generatedAt = new Intl.DateTimeFormat('tr-TR', { 
    hour: '2-digit', minute: '2-digit', second: '2-digit' 
  }).format(new Date());

  try {
    const body = await request.json();
    const { interactionId, refresh = false } = body as {
      interactionId: string;
      refresh?: boolean;
    };

    if (!interactionId) {
      return NextResponse.json(
        { error: "interactionId gereklidir." },
        { status: 400 }
      );
    }

    // ── Path 1: Demo mode or missing key → mock ──
    if (shouldUseFallback()) {
      const reason = !process.env.GOOGLE_API_KEY ? "missing_api_key" : "demo_mode";
      return createFallbackResponse(interactionId, reason);
    }

    // ── Path 1.5: Check Cache ──
    const cachedResponse = getCachedResponse(interactionId, refresh);
    if (cachedResponse) return cachedResponse;

    // ── Path 2: Try real Gemini ──
    const ctx = getInteractionContext(interactionId);

    if (!ctx) {
      return createFallbackResponse(interactionId, "unknown_interaction");
    }

    try {
      const result = await callGemini(ctx);

      // ── Output guard ──
      if (!isOutputSafe(result.explanation)) {
        return createFallbackResponse(interactionId, "unsafe_output");
      }

      if (!isExplanationComplete(result.explanation)) {
        return createFallbackResponse(interactionId, "incomplete_output");
      }

      // ── Path 2a: Gemini succeeded and output is safe ──
      
      // Save to persistent file cache
      saveCache(interactionId, {
        explanation: result.explanation,
        generatedAt,
        timestamp: Date.now(),
      });

      return NextResponse.json({
        explanation: result.explanation,
        source: "gemini_live" as const,
        generatedAt,
        disclaimer: DISCLAIMER,
      });
    } catch (e: unknown) {
      console.error(`[API_EXPLAIN] EXCEPTION in callGemini:`, e);
      const fallbackReason = mapErrorToFallbackReason(e);
      
      // ── Path 2b: Gemini failed → mock fallback ──
      return createFallbackResponse(interactionId, fallbackReason);
    }
  } catch (e: unknown) {
    console.error(`[API_EXPLAIN] FATAL ERROR parsing request:`, e);
    return NextResponse.json(
      { error: "Açıklama oluşturulurken bir hata oluştu." },
      { status: 500 }
    );
  }
}
