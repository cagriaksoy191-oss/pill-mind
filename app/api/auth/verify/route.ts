import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encryptSession, decryptSession, VerificationData } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, otp } = body as { email: string; otp: string };

    if (!email || !email.includes("@") || !otp) {
      return NextResponse.json(
        { error: "E-posta veya doğrulama kodu eksik." },
        { status: 400 },
      );
    }

    const cleanEmail = email.toLowerCase().trim();

    // Çerezden verification_token okuma (Next.js Request Headers)
    const cookieHeader = request.headers.get("cookie");
    const verificationToken = cookieHeader
      ?.split("; ")
      .find((row) => row.startsWith("verification_token="))
      ?.split("=")[1];

    if (!verificationToken) {
      return NextResponse.json(
        {
          error:
            "Doğrulama süresi dolmuş veya geçersiz. Lütfen tekrar giriş yapın.",
        },
        { status: 400 },
      );
    }

    const verificationData = decryptSession(
      verificationToken,
    ) as VerificationData | null;

    if (
      !verificationData ||
      verificationData.email !== cleanEmail ||
      verificationData.otp !== otp
    ) {
      return NextResponse.json(
        { error: "Hatalı doğrulama kodu girdiniz." },
        { status: 400 },
      );
    }

    if (Date.now() > verificationData.expires) {
      return NextResponse.json(
        {
          error: "Doğrulama kodunun süresi dolmuş. Lütfen tekrar giriş yapın.",
        },
        { status: 400 },
      );
    }

    // Doğrulama başarılı! Kullanıcıyı bul veya oluştur.
    const user = await prisma.user.upsert({
      where: { email: cleanEmail },
      update: {},
      create: { email: cleanEmail },
    });

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

    // Doğrulama çerezini temizle
    response.cookies.set("verification_token", "", {
      httpOnly: true,
      path: "/",
      expires: new Date(0),
    });

    return response;
  } catch (error) {
    console.error("[PillMind Verify Endpoint Error]:", error);
    return NextResponse.json(
      { error: "Doğrulama yapılırken sistemsel bir hata oluştu." },
      { status: 500 },
    );
  }
}
