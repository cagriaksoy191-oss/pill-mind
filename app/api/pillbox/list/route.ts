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

    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit");
    const offsetParam = searchParams.get("offset");

    const take = limitParam ? parseInt(limitParam, 10) : undefined;
    const skip = offsetParam ? parseInt(offsetParam, 10) : undefined;

    // Kullanıcının kayıtlı tüm kutularını çek
    const pillboxes = await prisma.savedPillbox.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
      ...(take ? { take } : {}),
      ...(skip ? { skip } : {}),
    });

    const total = await prisma.savedPillbox.count({
      where: { userId: session.userId },
    });

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
