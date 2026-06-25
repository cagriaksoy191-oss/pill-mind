// app/api/pillbox/save/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSession, verifyCSRF } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    // CSRF & Origin Doğrulaması
    if (!verifyCSRF(request)) {
      return NextResponse.json(
        { error: "Güvenlik doğrulaması başarısız oldu (CSRF engellendi)." },
        { status: 403 }
      );
    }

    const session = getSession(request);
    if (!session) {
      return NextResponse.json(
        { error: "İlaç kutunuzu buluta kaydetmek için lütfen önce giriş yapın." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, drugIds } = body as { name: string; drugIds: string[] };

    if (!name || !name.trim() || !drugIds || !Array.isArray(drugIds) || drugIds.length === 0) {
      return NextResponse.json(
        { error: "Kutu ismi ve en az 1 ilaç seçimi zorunludur." },
        { status: 400 }
      );
    }

    // İlaç kutusunu veritabanına kaydet
    const pillbox = await prisma.savedPillbox.create({
      data: {
        userId: session.userId,
        name: name.trim(),
        drugIds,
      },
    });

    return NextResponse.json({
      success: true,
      pillbox,
    });
  } catch (error) {
    console.error("[Pillbox Save Endpoint Error]:", error);
    return NextResponse.json(
      { error: "İlaç kutusu kaydedilirken sistemsel bir hata oluştu." },
      { status: 500 }
    );
  }
}
