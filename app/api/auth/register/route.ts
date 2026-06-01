// app/api/auth/register/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body as { email: string };

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Geçersiz bir e-posta adresi girdiniz." },
        { status: 400 },
      );
    }

    // Kullanıcının kayıtlı olup olmadığını denetle
    let user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      // Yeni kullanıcıyı oluştur
      user = await prisma.user.create({
        data: { email: email.toLowerCase().trim() },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Kayıt işlemi başarılı. Lütfen e-postanızı kontrol edin.",
    });
  } catch (error) {
    console.error("[PillMind Register Endpoint Error]:", error);
    return NextResponse.json(
      { error: "Kayıt sırasında sistemsel bir hata oluştu." },
      { status: 500 },
    );
  }
}
