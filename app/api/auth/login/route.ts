// app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";

import { prisma } from "@/lib/prisma";
import { encryptSession, verifyCSRF } from "@/lib/auth";


const getJwtSecret = () => {
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is not set");
  return process.env.JWT_SECRET;
};

export async function POST(request: Request) {
  try {
    // CSRF & Origin Doğrulaması
    if (!verifyCSRF(request)) {
      return NextResponse.json(
        { error: "Güvenlik doğrulaması başarısız oldu (CSRF engellendi)." },
        { status: 403 }
      );
    }

    const body = await request.json();
        const { email, otp, otpToken } = body as { email: string, otp?: string, otpToken?: string };

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Geçersiz bir e-posta adresi girdiniz." },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();

    if (!otp || !otpToken) {
      // 1. Aşama: OTP Gönderme Simülasyonu
      const generatedOtp = crypto.randomInt(100000, 1000000).toString();
      const expires = Date.now() + 1000 * 60 * 5; // 5 dakika geçerli

      const hash = crypto.createHmac('sha256', getJwtSecret()).update(`${cleanEmail}:${generatedOtp}:${expires}`).digest('hex');
      const newOtpToken = `${expires}:${hash}`;

      // Simüle edilen e-posta gönderimi (Gerçek uygulamada Mailgun, SendGrid vb. ile gönderilir)
      console.log(`[SIMULATED EMAIL] To: ${cleanEmail} | Your OTP is: ${generatedOtp}`);

      return NextResponse.json({
        success: true,
        isOtpRequired: true,
        otpToken: newOtpToken,
      });
    }

    // 2. Aşama: OTP Doğrulama
    const [expiresStr, expectedHash] = otpToken.split(':');
    if (!expiresStr || !expectedHash) {
      return NextResponse.json(
        { error: "Geçersiz veya bozuk OTP doğrulama bileti." },
        { status: 400 }
      );
    }

    const expiresMs = parseInt(expiresStr, 10);
    if (isNaN(expiresMs) || Date.now() > expiresMs) {
      return NextResponse.json(
        { error: "Girdiğiniz doğrulama kodunun süresi dolmuş." },
        { status: 400 }
      );
    }

    const verifyHash = crypto.createHmac('sha256', getJwtSecret()).update(`${cleanEmail}:${otp}:${expiresStr}`).digest('hex');

    // Timing safe eşitlik kontrolü (Side-channel ataklarını önlemek için)
    let isValid = false;
    try {
      isValid = crypto.timingSafeEqual(Buffer.from(verifyHash), Buffer.from(expectedHash));
    } catch (e) {
      isValid = false;
    }

    if (!isValid) {
      return NextResponse.json(
        { error: "Girdiğiniz doğrulama kodu hatalı." },
        { status: 400 }
      );
    }

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
