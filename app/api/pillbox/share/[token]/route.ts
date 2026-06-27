// app/api/pillbox/share/[token]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  findInteractionsDB,
  resolveDrugsDB,
  checkAccumulationDB,
  findFoodInteractionsDB,
  findContraindicationsDB
} from "@/lib/interactions";

export const dynamic = "force-dynamic";

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

    // Retrieve token details
    const share = await prisma.pillboxShare.findUnique({
      where: { token },
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

    // Retrieve drug records for display names
    let drugs = [];
    try {
      drugs = await prisma.drug.findMany({
        where: {
          id: { in: share.drugIds },
        },
      });
    } catch {
      // Fallback using curated local data
      const { getAllDrugs } = await import("@/lib/interactions");
      const localDrugs = getAllDrugs();
      drugs = localDrugs.filter(d => share.drugIds.includes(d.id));
    }

    // Process clinical interactions dynamically on-the-fly
    const resolvedDrugsCache = await resolveDrugsDB(share.drugIds);
    const interactions = await findInteractionsDB(share.drugIds, resolvedDrugsCache);
    const accumulationWarnings = await checkAccumulationDB(share.drugIds, resolvedDrugsCache);
    const foodInteractions = await findFoodInteractionsDB(share.drugIds, resolvedDrugsCache);
    const contraindications = await findContraindicationsDB(share.drugIds, undefined, resolvedDrugsCache); // salt-okunur varsayılan boş patientContext

    return NextResponse.json({
      success: true,
      token: share.token,
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
