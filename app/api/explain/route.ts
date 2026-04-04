import { NextResponse } from "next/server";
import mockResponses from "@/data/mock-responses.json";
import {
  getInteractionContext,
  shouldUseMock,
  callGemini,
  isOutputSafe,
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
 * Response shape is always:
 *   { explanation, source: "gemini" | "mock", disclaimer }
 */
export async function POST(request: Request) {
  const disclaimer =
    "Bu açıklama bilgilendirme amaçlıdır ve tıbbi tavsiye niteliği taşımaz.";

  try {
    const body = await request.json();
    const { interactionId } = body as { interactionId: string };

    if (!interactionId) {
      return NextResponse.json(
        { error: "interactionId gereklidir." },
        { status: 400 }
      );
    }

    // ── Helper: return mock response ──
    const getMockResponse = () => {
      const responses = mockResponses as Record<string, string>;
      return (
        responses[interactionId] ??
        responses["_default"] ??
        "Açıklama mevcut değil."
      );
    };

    // ── Path 1: Demo mode or missing key → mock ──
    if (shouldUseMock()) {
      return NextResponse.json({
        explanation: getMockResponse(),
        source: "mock" as const,
        disclaimer,
      });
    }

    // ── Path 2: Try real Gemini ──
    const ctx = getInteractionContext(interactionId);

    if (!ctx) {
      // Unknown interaction — mock is the safest response
      return NextResponse.json({
        explanation: getMockResponse(),
        source: "mock" as const,
        disclaimer,
      });
    }

    try {
      const result = await callGemini(ctx);

      // ── Output guard ──
      if (!isOutputSafe(result.explanation)) {
        // Gemini produced unsafe language → silent fallback to mock
        return NextResponse.json({
          explanation: getMockResponse(),
          source: "mock" as const,
          disclaimer,
        });
      }

      // ── Path 2a: Gemini succeeded and output is safe ──
      return NextResponse.json({
        explanation: result.explanation,
        source: "gemini" as const,
        disclaimer,
      });
    } catch {
      // ── Path 2b: Gemini failed → mock fallback ──
      return NextResponse.json({
        explanation: getMockResponse(),
        source: "mock" as const,
        disclaimer,
      });
    }
  } catch {
    return NextResponse.json(
      { error: "Açıklama oluşturulurken bir hata oluştu." },
      { status: 500 }
    );
  }
}
