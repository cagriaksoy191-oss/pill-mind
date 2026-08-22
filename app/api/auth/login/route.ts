// app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";

import { redis } from "@/lib/redis";
import { getClientIp } from "@/lib/ip";


import { prisma } from "@/lib/prisma";
import { encryptSession, verifyCSRF } from "@/lib/auth";
import * as Sentry from "@sentry/nextjs";

const getJwtSecret = () => {
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is not set");
  return process.env.JWT_SECRET;
};

function generateOtpResponse(cleanEmail: string) {
  const generatedOtp = crypto.randomInt(100000, 1000000).toString();
  const expires = Date.now() + 1000 * 60 * 5; // 5 dakika geçerli

  const hash = crypto.createHmac('sha256', getJwtSecret()).update(`${cleanEmail}:${generatedOtp}:${expires}`).digest('hex');
  const newOtpToken = `${expires}:${hash}`;

  return NextResponse.json({
    success: true,
    isOtpRequired: true,
    otpToken: newOtpToken,
  });
}

function verifyOtp(cleanEmail: string, otp: string, otpToken: string): NextResponse | null {
  const [expiresStr, expectedHash] = otpToken.split(':');
  if (!expiresStr || !expectedHash || !/^\d+$/.test(expiresStr)) {
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

  const expectedHashBuffer = Buffer.from(expectedHash);
  const verifyHashBuffer = Buffer.from(verifyHash);
  const isValid = expectedHashBuffer.length === verifyHashBuffer.length && crypto.timingSafeEqual(verifyHashBuffer, expectedHashBuffer);

  if (!isValid) {
    return NextResponse.json(
      { error: "Geçersiz e-posta adresi veya doğrulama kodu." },
      { status: 401 }
    );
  }

  return null;
}

async function createSessionResponse(user: { id: string, email: string }) {
  // 7 Günlük oturum süresi belirlenir
  const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 7;
  const sessionToken = await encryptSession({
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
}


async function checkRateLimit(request: Request) {
  if (!redis) return null;

  try {
    const ip = getClientIp(request);
    const rateLimitKey = `ratelimit:login:${ip}`;

    const currentRequests = await redis.incr(rateLimitKey);
    if (currentRequests === 1) {
      await redis.expire(rateLimitKey, 60 * 5); // 5 minutes window
    }

    if (currentRequests > 5) {
      console.error(
        `[Security Alert] Rate limit exceeded for login endpoint, IP: ${ip}`
      );
      return NextResponse.json(
        { error: "Çok fazla giriş denemesi yapıldı. Lütfen daha sonra tekrar deneyin." },
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
      return generateOtpResponse(cleanEmail);
    }

    // 2. Aşama: OTP Doğrulama
    const otpErrorResponse = verifyOtp(cleanEmail, otp, otpToken);
    if (otpErrorResponse) {
      return otpErrorResponse;
    }

    // Kullanıcıyı veritabanında ara — sadece kayıtlı kullanıcılar giriş yapabilir
    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Geçersiz e-posta adresi veya doğrulama kodu." },
        { status: 401 }
      );
    }

    return await createSessionResponse(user);
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json(
      { error: "Giriş yapılırken sistemsel bir hata oluştu." },
      { status: 500 }
    );
  }
}
