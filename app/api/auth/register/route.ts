// app/api/auth/register/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyCSRF } from "@/lib/auth";
import { redis } from "@/lib/redis";
import { getClientIp } from "@/lib/ip";
import * as Sentry from "@sentry/nextjs";
import { writeAuditLog } from "@/lib/audit";


async function checkRateLimit(request: Request) {
  if (!redis) return null;

  try {
    const ip = getClientIp(request);
    const rateLimitKey = `ratelimit:register:${ip}`;

    const currentRequests = await redis.incr(rateLimitKey);
    if (currentRequests === 1) {
      await redis.expire(rateLimitKey, 60 * 5); // 5 minutes window
    }

    if (currentRequests > 5) {
      await writeAuditLog({
        eventType: "RATE_LIMIT_EXCEEDED",
        entityType: "AUTH_REGISTER",
        details: `Rate limit exceeded for register endpoint, IP: ${ip}`,
      });
      return NextResponse.json(
        { error: "Çok fazla kayıt denemesi yapıldı. Lütfen daha sonra tekrar deneyin." },
        { status: 429 }
      );
    }
  } catch (redisErr) {
    console.warn(
      "[Redis Rate Limiter] Blocked request due to Redis error:",
      redisErr
    );
    return NextResponse.json(
      { error: "Hizmet şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin." },
      { status: 503 }
    );
  }
  return null;
}

export async function POST(request: Request) {
  try {
    // CSRF & Origin Doğrulaması
    if (!verifyCSRF(request)) {
      return NextResponse.json(
        { error: "Güvenlik doğrulaması başarısız oldu (CSRF engellendi)." },
        { status: 403 }
      );
    }


    const rateLimitError = await checkRateLimit(request);
    if (rateLimitError) return rateLimitError;

    const body = await request.json();
    const { email } = body as { email: string };

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Geçersiz bir e-posta adresi girdiniz." },
        { status: 400 }
      );
    }

    const formattedEmail = email.toLowerCase().trim();

    // Kullanıcıyı varsa getir, yoksa oluştur (tek atomik sorgu)
    const user = await prisma.user.upsert({
      where: { email: formattedEmail },
      update: {},
      create: { email: formattedEmail },
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
