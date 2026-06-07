import crypto from "crypto";
import { NextResponse } from "next/server";
import { encryptSession } from "@/lib/auth";

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

    const cleanEmail = email.toLowerCase().trim();

    // OTP Doğrulama kodu oluştur (6 haneli)
    const otp = crypto.randomInt(100000, 1000000).toString();

    // 10 Dakikalık OTP süresi belirlenir
    const expiresAt = Date.now() + 1000 * 60 * 10;
    const verificationToken = encryptSession({
      email: cleanEmail,
      otp,
      expires: expiresAt,
    });

    const response = NextResponse.json({
      success: true,
      message:
        "Giriş bağlantısı / doğrulama kodu e-posta adresinize gönderildi.",
    });

    // Verification token çerezini yazıyoruz
    response.cookies.set("verification_token", verificationToken, {
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
      { status: 500 },
    );
  }
}
