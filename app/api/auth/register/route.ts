// app/api/auth/register/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyCSRF } from "@/lib/auth";
import * as Sentry from "@sentry/nextjs";

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
    const { email } = body as { email: string };

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Geçersiz bir e-posta adresi girdiniz." },
        { status: 400 }
      );
    }

    // Kullanıcının kayıtlı olup olmadığını denetle
    let user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (user) {
      return NextResponse.json(
        { error: "Bu e-posta adresiyle kayıtlı bir kullanıcı zaten mevcut." },
        { status: 400 }
      );
    }

    // Yeni kullanıcıyı oluştur
    user = await prisma.user.create({
      data: { email: email.toLowerCase().trim() },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json(
      { error: "Kayıt sırasında sistemsel bir hata oluştu." },
      { status: 500 }
    );
  }
}
