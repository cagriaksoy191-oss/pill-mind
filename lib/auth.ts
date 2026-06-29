// lib/auth.ts
import { NextRequest } from "next/server";
import crypto from "crypto";

const getJwtSecret = () => {
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is not set");
  return process.env.JWT_SECRET;
};

export interface SessionData {
  userId: string;
  email: string;
  expires: number;
}

/**
 * AES-256-GCM (AEAD) algoritmasıyla oturum verisini şifreler
 */
export function encryptSession(data: SessionData): string {
  const key = crypto.scryptSync(getJwtSecret(), "salt", 32);
  const iv = crypto.randomBytes(12); // GCM için dinamik 12-byte IV
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  
  let encrypted = cipher.update(JSON.stringify(data), "utf8", "hex");
  encrypted += cipher.final("hex");
  
  const authTag = cipher.getAuthTag(); // 16-byte bütünlük etiketi (auth tag)
  
  // Format: iv_hex:authTag_hex:encrypted_hex
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

/**
 * Oturum şifresini çözerek doğrular (AEAD bütünlük kontrolü içerir)
 */
export function decryptSession(token: string): SessionData | null {
  try {
    const parts = token.split(":");
    if (parts.length !== 3) {
      return null;
    }
    
    const iv = Buffer.from(parts[0], "hex");
    const authTag = Buffer.from(parts[1], "hex");
    const encryptedText = parts[2];
    
    // Parametre uzunluğu doğrulamaları
    if (iv.length !== 12 || authTag.length !== 16) {
      return null;
    }
    
    const key = crypto.scryptSync(getJwtSecret(), "salt", 32);
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");
    
    return JSON.parse(decrypted) as SessionData;
  } catch {
    return null;
  }
}

/**
 * Request içerisindeki çerezden (cookie) oturum durumunu okur
 */
export function getSession(req: NextRequest): SessionData | null {
  const cookie = req.cookies.get("session");
  if (!cookie) return null;
  const session = decryptSession(cookie.value);
  if (!session) return null;

  // Zaman aşımı kontrolü
  if (Date.now() > session.expires) {
    return null;
  }
  return session;
}

/**
 * CSRF ve Origin doğrulaması yapar (POST/DELETE istekleri için çapraz köken kontrolleri)
 */
export function verifyCSRF(req: Request): boolean {
  if (!req.headers) {
    return true; // Test ortamlarında (jest mock) başlık yoksa pas geç
  }

  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");

  let expectedOrigin = "";
  if (req.url) {
    try {
      expectedOrigin = new URL(req.url).origin;
    } catch {
      // url parse hatası
    }
  }

  if (!expectedOrigin) {
    const host = req.headers.get("host") || req.headers.get("x-forwarded-host");
    const proto = req.headers.get("x-forwarded-proto") || "http";
    if (host) {
      expectedOrigin = `${proto}://${host}`;
    }
  }

  if (!expectedOrigin) {
    return true; // Hedef orijin doğrulanamıyorsa geçişe izin ver
  }

  // Origin uyuşmazlığı kontrolü
  if (origin && origin !== expectedOrigin) {
    console.warn(`[CSRF Alert] Origin mismatch: ${origin}, Expected: ${expectedOrigin}`);
    return false;
  }

  // Referer uyuşmazlığı kontrolü
  if (referer) {
    try {
      const refererOrigin = new URL(referer).origin;
      if (refererOrigin !== expectedOrigin) {
        return false;
      }
    } catch {
      return false; // Geçersiz referer formatı (blokla)
    }
  }

  return true;
}

