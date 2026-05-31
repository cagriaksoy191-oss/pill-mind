// app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encryptSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body as { email: string };

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Geçersiz bir e-posta adresi girdiniz." },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();

    // Kullanıcıyı veritabanında ara veya otomatik oluştur (Magic Link simülasyonu)
    let user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!user) {
      user = await prisma.user.create({
        data: { email: cleanEmail },
      });
    }

    // 7 Günlük oturum süresi belirlenir
    const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 7;
    const sessionToken = encryptSession({
      userId: user.id,
      email: user.email,
      expires: expiresAt,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
      },
    });

    // Oturum çerezini yazıyoruz (HttpOnly, Secure ve SameSite korumalı)
    response.cookies.set("session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: new Date(expiresAt),
    });

    return response;
  } catch (error) {
    console.error("[PillMind Login Endpoint Error]:", error);
    return NextResponse.json(
      { error: "Giriş yapılırken sistemsel bir hata oluştu." },
      { status: 500 }
    );
  }
}
