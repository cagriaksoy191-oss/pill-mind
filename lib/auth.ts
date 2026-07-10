// lib/auth.ts
import { NextRequest } from "next/server";
import crypto from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(crypto.scrypt);

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
export async function encryptSession(data: SessionData): Promise<string> {
  const salt = crypto.randomBytes(16); // Dinamik salt
  const key = (await scryptAsync(getJwtSecret(), salt, 32)) as Buffer;
  const iv = crypto.randomBytes(12); // GCM için dinamik 12-byte IV
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  
  let encrypted = cipher.update(JSON.stringify(data), "utf8", "hex");
  encrypted += cipher.final("hex");
  
  const authTag = cipher.getAuthTag(); // 16-byte bütünlük etiketi (auth tag)
  
  // Format: salt_hex:iv_hex:authTag_hex:encrypted_hex
  return `${salt.toString("hex")}:${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

/**
 * Oturum şifresini çözerek doğrular (AEAD bütünlük kontrolü içerir)
 */
export async function decryptSession(token: string): Promise<SessionData | null> {
  try {
    const parts = token.split(":");
    
    // Yeni format (4 parça: salt:iv:authTag:encrypted)
    if (parts.length === 4) {
      const salt = Buffer.from(parts[0], "hex");
      const iv = Buffer.from(parts[1], "hex");
      const authTag = Buffer.from(parts[2], "hex");
      const encryptedText = parts[3];

      if (salt.length !== 16 || iv.length !== 12 || authTag.length !== 16) {
        return null;
      }

      const key = (await scryptAsync(getJwtSecret(), salt, 32)) as Buffer;
      const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encryptedText, "hex", "utf8");
      decrypted += decipher.final("utf8");

      return JSON.parse(decrypted) as SessionData;
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Request içerisindeki çerezden (cookie) oturum durumunu okur
 */
export async function getSession(req: NextRequest): Promise<SessionData | null> {
  const cookie = req.cookies.get("session");
  if (!cookie) return null;
  const session = await decryptSession(cookie.value);
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
    return false; // Fail secure: başlık yoksa isteği reddet
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
    const ALLOWED_HOSTS = ["localhost:3000"];
    if (host && ALLOWED_HOSTS.includes(host)) {
      expectedOrigin = `${proto}://${host}`;
    }
  }

  if (!expectedOrigin) {
    return false; // Fail secure: hedefin orijini doğrulanamazsa isteği reddet
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

