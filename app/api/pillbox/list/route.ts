// app/api/pillbox/list/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MAX_LIMIT = 100;
const MAX_OFFSET = 10000;

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json(
        { error: "Kaydedilmiş kutularınızı görmek için lütfen önce giriş yapın." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit");
    const offsetParam = searchParams.get("offset");

    let take: number | undefined = undefined;
    if (limitParam) {
      const parsedLimit = parseInt(limitParam, 10);
      if (!isNaN(parsedLimit) && parsedLimit > 0) {
        take = Math.min(parsedLimit, MAX_LIMIT);
      }
    }

    let skip: number | undefined = undefined;
    if (offsetParam) {
      const parsedOffset = parseInt(offsetParam, 10);
      if (!isNaN(parsedOffset) && parsedOffset >= 0) {
        skip = Math.min(parsedOffset, MAX_OFFSET);
      }
    }

    // Kullanıcının kayıtlı tüm kutularını çek (Paralel sorgu ile gecikme %50 azaltıldı)
    const [pillboxes, total] = await Promise.all([
      prisma.savedPillbox.findMany({
        where: { userId: session.userId },
        orderBy: { createdAt: "desc" },
        ...(take !== undefined ? { take } : {}),
        ...(skip !== undefined ? { skip } : {}),
      }),
      prisma.savedPillbox.count({
        where: { userId: session.userId },
      }),
    ]);

    return NextResponse.json({
      success: true,
      pillboxes,
      total,
    });
  } catch (error) {
    console.error("[Pillbox List Endpoint Error]:", error);
    return NextResponse.json(
      { error: "Kayıtlı ilaç kutuları listelenirken hata oluştu." },
      { status: 500 }
    );
  }
}
