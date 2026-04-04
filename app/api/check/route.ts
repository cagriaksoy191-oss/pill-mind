import { NextResponse } from "next/server";
import { findInteractions } from "@/lib/interactions";

/**
 * POST /api/check
 * Accepts a list of drug IDs, returns found interactions from curated data.
 * Decision logic is deterministic (JSON lookup) — NOT LLM-based.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { drugIds } = body as { drugIds: string[] };

    if (!drugIds || !Array.isArray(drugIds) || drugIds.length < 2) {
      return NextResponse.json(
        { error: "En az 2 ilaç ID'si gereklidir." },
        { status: 400 }
      );
    }

    const results = findInteractions(drugIds);

    return NextResponse.json({
      interactions: results,
      checkedDrugs: drugIds,
      totalFound: results.length,
      disclaimer:
        "Bu sonuçlar sınırlı bir demo veri setine dayanabilir ve tıbbi tavsiye niteliği taşımaz.",
    });
  } catch {
    return NextResponse.json(
      { error: "Kontrol sırasında bir hata oluştu." },
      { status: 500 }
    );
  }
}
