// lib/auth.ts
import { NextRequest } from "next/server";
import crypto from "crypto";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not defined");
  }
  return secret;
}

export interface SessionData {
  userId: string;
  email: string;
  expires: number;
}

/**
 * AES-256-CBC algoritmasıyla oturum verisini şifreler
 */
export function encryptSession(data: SessionData): string {
  const secret = getJwtSecret();
  const key = crypto.scryptSync(secret, "salt", 32);
  const iv = crypto.randomBytes(16); // Rastgele IV
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(JSON.stringify(data), "utf8", "hex");
  encrypted += cipher.final("hex");
  return `${iv.toString("hex")}:${encrypted}`;
}

/**
 * Oturum şifresini çözerek doğrular
 */
export function decryptSession(token: string): SessionData | null {
  try {
    const secret = getJwtSecret();
    const key = crypto.scryptSync(secret, "salt", 32);

    let ivHex;
    let encryptedText;

    if (token.includes(":")) {
      const parts = token.split(":");
      ivHex = parts[0];
      encryptedText = parts[1];
    } else {
      ivHex = Buffer.alloc(16, 0).toString("hex");
      encryptedText = token;
    }

    const iv = Buffer.from(ivHex, "hex");
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
    let decrypted = decipher.update(encryptedText, "hex", "utf8");
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
  const cookie = req.cookies.get("auth_token");
  if (!cookie) return null;
  const session = decryptSession(cookie.value);
  if (!session) return null;

  // Zaman aşımı kontrolü
  if (Date.now() > session.expires) {
    return null;
  }
  return session;
}
