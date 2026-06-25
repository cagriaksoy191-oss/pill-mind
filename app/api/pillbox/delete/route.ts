// app/api/pillbox/delete/route.ts
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
        { error: "Kutu silme yetkiniz bulunmuyor. Lütfen önce giriş yapın." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id } = body as { id: string };

    if (!id) {
      return NextResponse.json(
        { error: "Silinecek kutunun kimliği (ID) gereklidir." },
        { status: 400 }
      );
    }

    // Kutuyu bul ve yetkisini doğrula (Başkasının kutusunu silemez)
    const pillbox = await prisma.savedPillbox.findUnique({
      where: { id },
    });

    if (!pillbox || pillbox.userId !== session.userId) {
      return NextResponse.json(
        { error: "Silinecek kayıt bulunamadı veya silme yetkiniz yok." },
        { status: 404 }
      );
    }

    // Kaydı sil
    await prisma.savedPillbox.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("[Pillbox Delete Endpoint Error]:", error);
    return NextResponse.json(
      { error: "İlaç kutusu silinirken sistemsel bir hata oluştu." },
      { status: 500 }
    );
  }
}
