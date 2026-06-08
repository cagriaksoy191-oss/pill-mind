// lib/auth.ts
import { NextRequest } from "next/server";
import crypto from "crypto";

const JWT_SECRET = process.env.JWT_SECRET || "pillmind-ultimate-32-chars-fallback-secret!";

export interface SessionData {
  userId: string;
  email: string;
  expires: number;
}

/**
 * AES-256-CBC algoritmasıyla oturum verisini şifreler
 */
export function encryptSession(data: SessionData): string {
  const key = crypto.scryptSync(JWT_SECRET, "salt", 32);
  const iv = Buffer.alloc(16, 0); // Sabit IV (Basit serverless oturumu için)
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(JSON.stringify(data), "utf8", "hex");
  encrypted += cipher.final("hex");
  return encrypted;
}

/**
 * Oturum şifresini çözerek doğrular
 */
export function decryptSession(token: string): SessionData | null {
  try {
    const key = crypto.scryptSync(JWT_SECRET, "salt", 32);
    const iv = Buffer.alloc(16, 0);
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
    let decrypted = decipher.update(token, "hex", "utf8");
    decrypted += decipher.final("utf8");
    const data = JSON.parse(decrypted) as SessionData;
    return data;
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
