import { NextRequest } from "next/server";
import crypto from "crypto";
// tests/auth.test.ts
import { encryptSession, decryptSession, getSession } from "../lib/auth";
import type { SessionData } from "../lib/auth";

describe("AES-256 Oturum Güvenliği Birim Testleri (Session Cryptography Unit Tests)", () => {
  const testSession: SessionData = {
    userId: "test-user-uuid",
    email: "hasta@pillmind.com",
    expires: Date.now() + 1000 * 60 * 60, // 1 Saat sonra
  };

  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV }; // Make a copy
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV; // Restore old environment
  });

  test("Missing JWT_SECRET throws an error at runtime", () => {
    delete process.env.JWT_SECRET;

    // encryptSession should throw
    expect(() => {
      encryptSession(testSession);
    }).toThrow("JWT_SECRET environment variable is not defined");

    // decryptSession catches the error and returns null
    const decrypted = decryptSession("some-token");
    expect(decrypted).toBeNull();
  });

  test("Oturum şifreleme ve deşifre etme simetrisi (Symmetry Check)", () => {
    process.env.JWT_SECRET = "test-secret-32-chars-very-secure!";

    // 1. Şifreleme işlemi
    const token = encryptSession(testSession);
    expect(token).toBeDefined();
    expect(typeof token).toBe("string");
    expect(token).not.toEqual(JSON.stringify(testSession)); // Şifrelenmiş metin açık veri olmamalıdır

    // 2. Şifre çözme işlemi
    const decrypted = decryptSession(token);
    expect(decrypted).toBeDefined();
    expect(decrypted?.userId).toBe(testSession.userId);
    expect(decrypted?.email).toBe(testSession.email);
    expect(decrypted?.expires).toBe(testSession.expires);
  });

  test("Bozuk veya kurcalanmış token'ların güvenle yakalanması (Integrity Protection)", () => {
    process.env.JWT_SECRET = "test-secret-32-chars-very-secure!";

    const token = encryptSession(testSession);

    // Token'ın sonuna rastgele karakterler ekleyerek bütünlüğü bozuyoruz
    const corruptedToken = token + "ab12";

    let decrypted = null;
    expect(() => {
      decrypted = decryptSession(corruptedToken);
    }).not.toThrow(); // Kriptografik hata sistemi çökertmemeli, sessizce null dönmelidir

    expect(decrypted).toBeNull();
  });

  test("Geçersiz veya tamamen rastgele token'lar için null dönmesi (Invalid Token Handlers)", () => {
    process.env.JWT_SECRET = "test-secret-32-chars-very-secure!";
    const fakeToken = "completely-random-non-hex-token";
    const decrypted = decryptSession(fakeToken);
    expect(decrypted).toBeNull();
  });

  test("Zaman aşımına uğramış oturumların tespiti için süre kontrolü (Session Expiry Mechanics)", () => {
    process.env.JWT_SECRET = "test-secret-32-chars-very-secure!";
    const expiredSession: SessionData = {
      userId: "expired-user-uuid",
      email: "eski@pillmind.com",
      expires: Date.now() - 1000 * 60, // 1 dakika önce sona erdi
    };

    const token = encryptSession(expiredSession);
    const decrypted = decryptSession(token);

    expect(decrypted).toBeDefined();
    expect(decrypted?.expires).toBeLessThan(Date.now()); // Süresinin geçmiş olduğu teyit edilir
  });

  test("Aynı verinin şifrelenmesinin deterministik olmaması (Non-deterministic Encryption)", () => {
    process.env.JWT_SECRET = "test-secret-32-chars-very-secure!";

    const token1 = encryptSession(testSession);
    const token2 = encryptSession(testSession);

    expect(token1).not.toEqual(token2); // IV farklı olduğu için şifreli metinler farklı olmalıdır
    expect(token1.split(":")[2]).not.toBeUndefined();
    expect(token1.split(":")[2]).not.toEqual(token2.split(":")[2]);
  });

  test("Orta tip (1 kolon, dinamik IV, sabit salt) token'ların hala desteklenmesi", () => {
    process.env.JWT_SECRET = "test-secret-32-chars-very-secure!";

    const secret = "test-secret-32-chars-very-secure!";
    const key = crypto.scryptSync(secret, "salt", 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
    let encrypted = cipher.update(JSON.stringify(testSession), "utf8", "hex");
    encrypted += cipher.final("hex");

    const intermediateToken = `${iv.toString("hex")}:${encrypted}`;
    const decrypted = decryptSession(intermediateToken);

    expect(decrypted).toBeDefined();
    expect(decrypted?.userId).toBe(testSession.userId);
    expect(decrypted?.email).toBe(testSession.email);
  });

  test("Eski tip (sabit IV) token'ların hala desteklenmesi (Backward Compatibility)", () => {
    process.env.JWT_SECRET = "test-secret-32-chars-very-secure!";

    // Eski formattaki token (IV yok, ':' yok)
    // Bu değer eski encryptSession ile testSession'ın encrypt edilmiş halidir.
    // Simüle etmek için cipher.update ve cipher.final kullanıyoruz

    const secret = "test-secret-32-chars-very-secure!";
    const key = crypto.scryptSync(secret, "salt", 32);
    const iv = Buffer.alloc(16, 0);
    const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
    let oldFormatToken = cipher.update(
      JSON.stringify(testSession),
      "utf8",
      "hex",
    );
    oldFormatToken += cipher.final("hex");

    const decrypted = decryptSession(oldFormatToken);

    expect(decrypted).toBeDefined();
    expect(decrypted?.userId).toBe(testSession.userId);
    expect(decrypted?.email).toBe(testSession.email);
  });
});

describe("getSession (NextRequest Integration)", () => {
  const testSession: SessionData = {
    userId: "test-user-uuid",
    email: "hasta@pillmind.com",
    expires: Date.now() + 1000 * 60 * 60, // 1 Saat sonra
  };

  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret-32-chars-very-secure!";
  });

  test("returns null when 'auth_token' cookie is missing", () => {
    // Create a mock NextRequest without the 'auth_token' cookie
    const req = {
      cookies: {
        get: jest.fn().mockReturnValue(undefined),
      },
    } as unknown as NextRequest;

    const session = getSession(req);
    expect(session).toBeNull();
    expect(req.cookies.get).toHaveBeenCalledWith("auth_token");
  });

  test("returns null for an invalid token", () => {
    const req = {
      cookies: {
        get: jest.fn().mockReturnValue({ value: "invalid-token" }),
      },
    } as unknown as NextRequest;

    const session = getSession(req);
    expect(session).toBeNull();
  });

  test("returns null for an expired auth_token token", () => {
    const expiredSession: SessionData = {
      ...testSession,
      expires: Date.now() - 1000 * 60, // 1 minute ago
    };
    const token = encryptSession(expiredSession);

    const req = {
      cookies: {
        get: jest.fn().mockReturnValue({ value: token }),
      },
    } as unknown as NextRequest;

    const session = getSession(req);
    expect(session).toBeNull();
  });

  test("returns SessionData for a valid, non-expired auth_token token", () => {
    const token = encryptSession(testSession);

    const req = {
      cookies: {
        get: jest.fn().mockReturnValue({ value: token }),
      },
    } as unknown as NextRequest;

    const session = getSession(req);
    expect(session).not.toBeNull();
    expect(session?.userId).toBe(testSession.userId);
    expect(session?.email).toBe(testSession.email);
  });
});
