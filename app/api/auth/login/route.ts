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
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // 10 Dakikalık OTP süresi belirlenir
    const expiresAt = Date.now() + 1000 * 60 * 10;
    const verificationToken = encryptSession({
      email: cleanEmail,
      otp,
      expires: expiresAt,
    });

    // SADECE GELİŞTİRME/TEST ORTAMINDA: Konsola şifreyi bas
    if (process.env.NODE_ENV !== "production") {
      console.log(`[Mock Email] ${cleanEmail} adresi için giriş kodu: ${otp}`);
    } else {
      // Prod'da da test için görünür bırakıyoruz ki test aracı OTP'yi görebilsin
      // (Gerçek hayatta bu kısım sadece mail atar ve konsola yazmaz)
      console.log(`[Mock Email] ${cleanEmail} adresi için giriş kodu: ${otp}`);
    }

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
