// app/api/pillbox/share/[token]/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import {
  findInteractionsDB,
  resolveDrugsDB,
  checkAccumulationDB,
  findFoodInteractionsDB,
  findContraindicationsDB,
  getDrugsByIds
} from "@/lib/interactions";

export const dynamic = "force-dynamic";

type DrugForDisplay = { id: string; name: string };

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json(
        { error: "Geçersiz paylaşım bağlantısı (Token eksik)." },
        { status: 400 }
      );
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // Retrieve token details
    const share = await prisma.pillboxShare.findUnique({
      where: { token: hashedToken },
    });

    if (!share) {
      return NextResponse.json(
        { error: "Paylaşım bulunamadı veya silinmiş." },
        { status: 404 }
      );
    }

    // Check expiration
    if (new Date() > share.expiresAt) {
      return NextResponse.json(
        { error: "Bu paylaşım bağlantısının süresi dolmuş." },
        { status: 410 }
      );
    }

    // Process clinical interactions dynamically on-the-fly and fetch drug cache
    const resolvedDrugsCache = await resolveDrugsDB(share.drugIds);

    // Retrieve drug records for display names
    let drugs: DrugForDisplay[] = [];
    if (resolvedDrugsCache && Array.isArray(resolvedDrugsCache) && resolvedDrugsCache.length > 0) {
      const drugIdsSet = new Set(share.drugIds);
      drugs = (resolvedDrugsCache as DrugForDisplay[]).filter(d => drugIdsSet.has(d.id));
    }

    // Fallback if cache missed the exact IDs or failed
    if (drugs.length === 0 && share.drugIds.length > 0) {
      try {
        drugs = await prisma.drug.findMany({
          where: {
            id: { in: share.drugIds },
          },
        });
      } catch {
        // Fallback using curated local data
        drugs = getDrugsByIds(share.drugIds) as DrugForDisplay[];
      }
    }

    const [interactions, accumulationWarnings, foodInteractions, contraindications] = await Promise.all([
      findInteractionsDB(share.drugIds, resolvedDrugsCache),
      checkAccumulationDB(share.drugIds, resolvedDrugsCache),
      findFoodInteractionsDB(share.drugIds, resolvedDrugsCache),
      findContraindicationsDB(share.drugIds, undefined, resolvedDrugsCache) // salt-okunur varsayılan boş patientContext
    ]);

    return NextResponse.json({
      success: true,
      token,
      drugIds: share.drugIds,
      drugs,
      interactions,
      accumulationWarnings,
      foodInteractions,
      contraindications,
      createdAt: share.createdAt,
      expiresAt: share.expiresAt,
    });
  } catch (error) {
    console.error("[Pillbox Share Fetch Error]:", error);
    return NextResponse.json(
      { error: "Paylaşım verileri yüklenirken sistemsel bir hata oluştu." },
      { status: 500 }
    );
  }
}
