process.env.JWT_SECRET = 'test-secret-key';
// tests/auth.test.ts
import { encryptSession, decryptSession, verifyCSRF, getSession, SessionData } from "../lib/auth";

describe("AES-256 Oturum Güvenliği Birim Testleri (Session Cryptography Unit Tests)", () => {
  const testSession: SessionData = {
    userId: "test-user-uuid",
    email: "hasta@pillmind.com",
    expires: Date.now() + 1000 * 60 * 60, // 1 Saat sonra
  };

  test("Oturum şifreleme ve deşifre etme simetrisi (Symmetry Check)", () => {
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
    const fakeToken = "completely-random-non-hex-token";
    const decrypted = decryptSession(fakeToken);
    expect(decrypted).toBeNull();
  });

  test("Zaman aşımına uğramış oturumların tespiti için süre kontrolü (Session Expiry Mechanics)", () => {
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

  test("Başlıklar (headers) eksik olduğunda fail-secure engelleme", () => {
    const req = {} as Request; // headers veya url yok
    expect(verifyCSRF(req)).toBe(false);
  });

test("Beklenen orijin (expectedOrigin) belirlenemediğinde fail-secure engelleme", () => {
    const req = createMockReq({}, "invalid-url-to-fail-parsing");
    expect(verifyCSRF(req)).toBe(false);
  });

  test("Aynı orijinden (same-origin) gelen isteklerin kabul edilmesi", () => {
    const req = createMockReq({
      origin: "http://localhost:3000",
      referer: "http://localhost:3000/kontrol",
    });
    expect(verifyCSRF(req)).toBe(true);
  });

  test("Çapraz orijinden (cross-origin) gelen Origin başlığı eşleşmediğinde engelleme (Origin Mismatch)", () => {
    const req = createMockReq({
      origin: "http://hacker-domain.com",
    });
    expect(verifyCSRF(req)).toBe(false);
  });

  test("Çapraz orijinden gelen Referer başlığı eşleşmediğinde engelleme (Referer Mismatch)", () => {
    const req = createMockReq({
      referer: "http://hacker-domain.com/landing",
    });
    expect(verifyCSRF(req)).toBe(false);
  });

  test("Referer formatı bozuk veya geçersiz olduğunda engelleme", () => {
    const req = createMockReq({
      referer: "invalid-url-string-not-http",
    });
    expect(verifyCSRF(req)).toBe(false);
  });
});


describe("E-posta Doğrulama Güvenliği (Email Validation Security)", () => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  test("Geçerli e-posta adreslerini kabul etmeli", () => {
    expect(emailRegex.test("test@example.com")).toBe(true);
    expect(emailRegex.test("user.name+tag@domain.co.uk")).toBe(true);
    expect(emailRegex.test("123@123.com")).toBe(true);
  });

  test("Geçersiz e-posta adreslerini reddetmeli", () => {
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

  test("Çerez (cookie) yoksa null dönmeli", () => {
    const req = createMockReq();
    expect(getSession(req)).toBeNull();
  });

  test("Çerez geçersizse veya deşifre edilemiyorsa null dönmeli", () => {
    const req = createMockReq("invalid-token-string");
    expect(getSession(req)).toBeNull();
  });

  test("Oturumun süresi dolmuşsa null dönmeli", () => {
    const expiredSession: SessionData = {
      ...testSession,
      expires: Date.now() - 1000 * 60, // 1 dakika önce
    };
    const token = encryptSession(expiredSession);
    const req = createMockReq(token);
    expect(getSession(req)).toBeNull();
  });

  test("Geçerli bir çerez için oturum verisini dönmeli", () => {
    const token = encryptSession(testSession);
    const req = createMockReq(token);

    const session = getSession(req);
    expect(session).toBeDefined();
    expect(session?.userId).toBe(testSession.userId);
    expect(session?.email).toBe(testSession.email);
    expect(session?.expires).toBe(testSession.expires);
  });
});
