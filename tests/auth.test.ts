process.env.JWT_SECRET = 'test-secret-key';
// tests/auth.test.ts
import { encryptSession, decryptSession, verifyCSRF, getSession, SessionData } from "../lib/auth";

describe("AES-256 Oturum Güvenliği Birim Testleri (Session Cryptography Unit Tests)", () => {
  const testSession: SessionData = {
    userId: "test-user-uuid",
    email: "hasta@pillmind.com",
    expires: Date.now() + 1000 * 60 * 60, // 1 Saat sonra
  };

  test("Oturum şifreleme ve deşifre etme simetrisi (Symmetry Check)", async () => {
    // 1. Şifreleme işlemi
    const token = await encryptSession(testSession);
    expect(token).toBeDefined();
    expect(typeof token).toBe("string");
    expect(token).not.toEqual(JSON.stringify(testSession)); // Şifrelenmiş metin açık veri olmamalıdır

    // 2. Şifre çözme işlemi
    const decrypted = await decryptSession(token);
    expect(decrypted).toBeDefined();
    expect(decrypted?.userId).toBe(testSession.userId);
    expect(decrypted?.email).toBe(testSession.email);
    expect(decrypted?.expires).toBe(testSession.expires);
  });

  test("Bozuk veya kurcalanmış token'ların güvenle yakalanması (Integrity Protection)", async () => {
    const token = await encryptSession(testSession);

    // Token'ın sonuna rastgele karakterler ekleyerek bütünlüğü bozuyoruz
    const corruptedToken = token + "ab12";

    let decrypted = null;
    try {
      decrypted = await decryptSession(corruptedToken);
    } catch (e) {
      fail("Kriptografik hata sistemi çökertmemeli, sessizce null dönmelidir");
    }

    expect(decrypted).toBeNull();
  });

  test("Geçersiz veya tamamen rastgele token'lar için null dönmesi (Invalid Token Handlers)", async () => {
    const fakeToken = "completely-random-non-hex-token";
    const decrypted = await decryptSession(fakeToken);
    expect(decrypted).toBeNull();
  });

  test("Zaman aşımına uğramış oturumların tespiti için süre kontrolü (Session Expiry Mechanics)", async () => {
    const expiredSession: SessionData = {
      userId: "expired-user-uuid",
      email: "eski@pillmind.com",
      expires: Date.now() - 1000 * 60, // 1 dakika önce sona erdi
    };

    const token = await encryptSession(expiredSession);
    const decrypted = await decryptSession(token);

    expect(decrypted).toBeDefined();
    expect(decrypted?.expires).toBeLessThan(Date.now()); // Süresinin geçmiş olduğu teyit edilir
  })
  test("Malformed token lengths return null (Length Check)", async () => {
    const token = await encryptSession(testSession);
    const parts = token.split(":");
    // Make salt length invalid (1 byte instead of 16)
    parts[0] = "ab";
    const decrypted = await decryptSession(parts.join(":"));
    expect(decrypted).toBeNull();
  });

  test("Invalid crypto operations are caught and return null (Catch block)", async () => {
    const token = await encryptSession(testSession);
    const parts = token.split(":");
    // Provide a valid length auth tag, but completely wrong (16 bytes = 32 hex chars)
    parts[2] = Buffer.alloc(16).toString("hex");
    const decrypted = await decryptSession(parts.join(":"));
    expect(decrypted).toBeNull();
  });
;
});

describe("CSRF / Origin Doğrulama Birim Testleri (CSRF & Cross-Origin Security Unit Tests)", () => {
  const createMockReq = (headers: Record<string, string>, url = "http://localhost:3000/api/auth/login") => {
    const headersMap = new Map(Object.entries(headers));
    return {
      url,
      headers: {
        get: (name: string) => headersMap.get(name.toLowerCase()) || null,
      },
    } as unknown as Request;
  };

  test("Başlıklar (headers) eksik olduğunda fail-secure engelleme", async () => {
    const req = {} as Request; // headers veya url yok
    expect(verifyCSRF(req)).toBe(false);
  });

test("Beklenen orijin (expectedOrigin) belirlenemediğinde fail-secure engelleme", async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    const req = createMockReq({}, "invalid-url-to-fail-parsing");
    expect(verifyCSRF(req)).toBe(false);
    process.env.NODE_ENV = originalEnv;
  });

  test("uses environment variable NEXT_PUBLIC_APP_URL for expectedOrigin", async () => {
    const originalEnv = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = "https://pillmind.com";
    const req = {
      headers: {
        get: (name: string) => {
          if (name === "origin") return "https://pillmind.com";
          return null;
        }
      }
    } as unknown as Request;
    expect(verifyCSRF(req)).toBe(true);
    if (originalEnv === undefined) {
      delete process.env.NEXT_PUBLIC_APP_URL;
    } else {
      process.env.NEXT_PUBLIC_APP_URL = originalEnv;
    }
  });

  test("uses environment variable APP_URL for expectedOrigin", async () => {
    const originalNextEnv = process.env.NEXT_PUBLIC_APP_URL;
    const originalEnv = process.env.APP_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
    process.env.APP_URL = "https://pillmind.com";
    const req = {
      headers: {
        get: (name: string) => {
          if (name === "origin") return "https://pillmind.com";
          return null;
        }
      }
    } as unknown as Request;
    expect(verifyCSRF(req)).toBe(true);
    if (originalEnv === undefined) {
      delete process.env.APP_URL;
    } else {
      process.env.APP_URL = originalEnv;
    }
    if (originalNextEnv === undefined) {
      delete process.env.NEXT_PUBLIC_APP_URL;
    } else {
      process.env.NEXT_PUBLIC_APP_URL = originalNextEnv;
    }
  });

  test("Aynı orijinden (same-origin) gelen isteklerin kabul edilmesi", async () => {
    const originalEnv = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    const req = createMockReq({
      origin: "http://localhost:3000",
      referer: "http://localhost:3000/kontrol",
    });
    expect(verifyCSRF(req)).toBe(true);
    if (originalEnv === undefined) {
      delete process.env.NEXT_PUBLIC_APP_URL;
    } else {
      process.env.NEXT_PUBLIC_APP_URL = originalEnv;
    }
  });

  test("Çapraz orijinden (cross-origin) gelen Origin başlığı eşleşmediğinde engelleme (Origin Mismatch)", async () => {
    const originalEnv = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    const req = createMockReq({
      origin: "http://hacker-domain.com",
    });
    expect(verifyCSRF(req)).toBe(false);
    if (originalEnv === undefined) {
      delete process.env.NEXT_PUBLIC_APP_URL;
    } else {
      process.env.NEXT_PUBLIC_APP_URL = originalEnv;
    }
  });

  test("Çapraz orijinden gelen Referer başlığı eşleşmediğinde engelleme (Referer Mismatch)", async () => {
    const originalEnv = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    const req = createMockReq({
      referer: "http://hacker-domain.com/landing",
    });
    expect(verifyCSRF(req)).toBe(false);
    if (originalEnv === undefined) {
      delete process.env.NEXT_PUBLIC_APP_URL;
    } else {
      process.env.NEXT_PUBLIC_APP_URL = originalEnv;
    }
  });

  test("Origin ve Referer başlıklarının her ikisi de eksik olduğunda engelleme (CSRF Bypass prevention)", async () => {
    const originalEnv = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    const req = createMockReq({}); // origin and referer are not provided
    expect(verifyCSRF(req)).toBe(false);
    if (originalEnv === undefined) {
      delete process.env.NEXT_PUBLIC_APP_URL;
    } else {
      process.env.NEXT_PUBLIC_APP_URL = originalEnv;
    }
  });

  test("Referer formatı bozuk veya geçersiz olduğunda engelleme", async () => {
    const originalEnv = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    const req = createMockReq({
      referer: "invalid-url-string-not-http",
    });
    expect(verifyCSRF(req)).toBe(false);
    if (originalEnv === undefined) {
      delete process.env.NEXT_PUBLIC_APP_URL;
    } else {
      process.env.NEXT_PUBLIC_APP_URL = originalEnv;
    }
  });
});


describe("E-posta Doğrulama Güvenliği (Email Validation Security)", () => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  test("Geçerli e-posta adreslerini kabul etmeli", async () => {
    expect(emailRegex.test("test@example.com")).toBe(true);
    expect(emailRegex.test("user.name+tag@domain.co.uk")).toBe(true);
    expect(emailRegex.test("123@123.com")).toBe(true);
  });

  test("Geçersiz e-posta adreslerini reddetmeli", async () => {
    expect(emailRegex.test("")).toBe(false);
    expect(emailRegex.test("plainaddress")).toBe(false);
    expect(emailRegex.test("@no-local-part.com")).toBe(false);
    expect(emailRegex.test("no-at-sign.com")).toBe(false);
    expect(emailRegex.test("no-domain@.com")).toBe(false);
    expect(emailRegex.test("no-tld@domain")).toBe(false);
    expect(emailRegex.test("spaces in@email.com")).toBe(false);
    expect(emailRegex.test("multiple@@domain.com")).toBe(false);
  });
});

import { NextRequest } from "next/server";

describe("getSession (Oturum Okuma Birim Testleri)", () => {
  const testSession: SessionData = {
    userId: "test-user-uuid",
    email: "hasta@pillmind.com",
    expires: Date.now() + 1000 * 60 * 60, // 1 Saat sonra
  };

  const createMockReq = (cookieValue?: string) => {
    return {
      cookies: {
        get: jest.fn().mockReturnValue(cookieValue ? { value: cookieValue } : undefined),
      },
    } as unknown as NextRequest;
  };

  test("Çerez (cookie) yoksa null dönmeli", async () => {
    const req = createMockReq();
    expect(await getSession(req)).toBeNull();
  });

  test("Çerez geçersizse veya deşifre edilemiyorsa null dönmeli", async () => {
    const req = createMockReq("invalid-token-string");
    expect(await getSession(req)).toBeNull();
  });

  test("Oturumun süresi dolmuşsa null dönmeli", async () => {
    const expiredSession: SessionData = {
      ...testSession,
      expires: Date.now() - 1000 * 60, // 1 dakika önce
    };
    const token = await encryptSession(expiredSession);
    const req = createMockReq(token);
    expect(await getSession(req)).toBeNull();
  });

  test("Geçerli bir çerez için oturum verisini dönmeli", async () => {
    const token = await encryptSession(testSession);
    const req = createMockReq(token);

    const session = await getSession(req);
    expect(session).toBeDefined();
    expect(session?.userId).toBe(testSession.userId);
    expect(session?.email).toBe(testSession.email);
    expect(session?.expires).toBe(testSession.expires);
  });
});
