// app/api/pillbox/list/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json(
        { error: "Kaydedilmiş kutularınızı görmek için lütfen önce giriş yapın." },
        { status: 401 }
      );
    }

    // Kullanıcının kayıtlı tüm kutularını çek
    const pillboxes = await prisma.savedPillbox.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      pillboxes,
    });
  } catch (error) {
    console.error("[Pillbox List Endpoint Error]:", error);
    return NextResponse.json(
      { error: "Kayıtlı ilaç kutuları listelenirken hata oluştu." },
      { status: 500 }
    );
  }
}
