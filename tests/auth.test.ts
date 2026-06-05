// tests/auth.test.ts
import {
  encryptSession,
  decryptSession,
  SessionData,
  VerificationData,
  getSession,
} from "../lib/auth";
import { NextRequest } from "next/server";

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
    expect((decrypted as SessionData)?.userId).toBe(testSession.userId);
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

describe("AES-256 Oturum Doğrulama Güvenliği (OTP Verification Token Tests)", () => {
  const testVerification: VerificationData = {
    email: "dogrulama@pillmind.com",
    otp: "123456",
    expires: Date.now() + 1000 * 60 * 10, // 10 Dakika sonra
  };

  test("Doğrulama (Verification) token şifreleme ve deşifre etme simetrisi", () => {
    const token = encryptSession(testVerification);
    expect(token).toBeDefined();
    expect(typeof token).toBe("string");

    const decrypted = decryptSession(token) as VerificationData;
    expect(decrypted).toBeDefined();
    expect(decrypted.email).toBe(testVerification.email);
    expect(decrypted.otp).toBe(testVerification.otp);
    expect(decrypted.expires).toBe(testVerification.expires);
  });
});

describe("getSession Unit Tests", () => {
  const mockSession: SessionData = {
    userId: "test-user",
    email: "test@example.com",
    expires: Date.now() + 1000 * 60 * 60,
  };

  test("returns session data for valid cookie", () => {
    const token = encryptSession(mockSession);
    const req = {
      cookies: {
        get: jest.fn().mockReturnValue({ value: token }),
      },
    } as unknown as NextRequest;

    const result = getSession(req);
    expect(result).not.toBeNull();
    expect(result?.userId).toBe(mockSession.userId);
  });

  test("returns null when no cookie is present", () => {
    const req = {
      cookies: {
        get: jest.fn().mockReturnValue(undefined),
      },
    } as unknown as NextRequest;

    const result = getSession(req);
    expect(result).toBeNull();
  });

  test("returns null for invalid cookie value", () => {
    const req = {
      cookies: {
        get: jest.fn().mockReturnValue({ value: "invalid-token" }),
      },
    } as unknown as NextRequest;

    const result = getSession(req);
    expect(result).toBeNull();
  });

  test("returns null for expired session", () => {
    const expiredSession: SessionData = {
      userId: "expired-user",
      email: "expired@example.com",
      expires: Date.now() - 1000 * 60, // 1 minute ago
    };
    const token = encryptSession(expiredSession);
    const req = {
      cookies: {
        get: jest.fn().mockReturnValue({ value: token }),
      },
    } as unknown as NextRequest;

    const result = getSession(req);
    expect(result).toBeNull();
  });
});
