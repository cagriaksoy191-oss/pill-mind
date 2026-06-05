// lib/auth.ts
import { NextRequest } from "next/server";
import crypto from "crypto";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not set.");
  }
  return secret;
}

export interface SessionData {
  userId: string;
  email: string;
  expires: number;
}

export interface VerificationData {
  email: string;
  otp: string;
  expires: number;
}

/**
 * AES-256-CBC algoritmasıyla oturum verisini şifreler
 */
export function encryptSession(data: SessionData | VerificationData): string {
  const key = crypto.scryptSync(getJwtSecret(), "salt", 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(JSON.stringify(data), "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

/**
 * Oturum şifresini çözerek doğrular
 */
export function decryptSession(
  token: string,
): SessionData | VerificationData | null {
  try {
    const key = crypto.scryptSync(getJwtSecret(), "salt", 32);

    let iv;
    let encryptedData;

    if (token.includes(":")) {
      const parts = token.split(":");
      iv = Buffer.from(parts[0], "hex");
      encryptedData = parts[1];
    } else {
      iv = Buffer.alloc(16, 0); // Backward compatibility
      encryptedData = token;
    }

    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
    let decrypted = decipher.update(encryptedData, "hex", "utf8");
    decrypted += decipher.final("utf8");
    const data = JSON.parse(decrypted) as SessionData | VerificationData;
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
  const session = decryptSession(cookie.value) as SessionData | null;
  if (!session) return null;

  // Zaman aşımı kontrolü
  if (Date.now() > session.expires) {
    return null;
  }
  return session;
}
