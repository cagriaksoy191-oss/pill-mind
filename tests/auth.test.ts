// tests/auth.test.ts
import type { SessionData } from "../lib/auth";

describe("AES-256 Oturum Güvenliği Birim Testleri (Session Cryptography Unit Tests)", () => {
  const testSession: SessionData = {
    userId: "test-user-uuid",
    email: "hasta@pillmind.com",
    expires: Date.now() + 1000 * 60 * 60, // 1 Saat sonra
  };

  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules(); // clears the cache
    process.env = { ...ORIGINAL_ENV }; // Make a copy
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV; // Restore old environment
  });

  test("Missing JWT_SECRET throws an error", async () => {
    delete process.env.JWT_SECRET;
    await expect(import("../lib/auth")).rejects.toThrow(
      "JWT_SECRET environment variable is not defined",
    );
  });

  test("Oturum şifreleme ve deşifre etme simetrisi (Symmetry Check)", async () => {
    process.env.JWT_SECRET = "test-secret-32-chars-very-secure!";
    const { encryptSession, decryptSession } = await import("../lib/auth");

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

  test("Bozuk veya kurcalanmış token'ların güvenle yakalanması (Integrity Protection)", async () => {
    process.env.JWT_SECRET = "test-secret-32-chars-very-secure!";
    const { encryptSession, decryptSession } = await import("../lib/auth");

    const token = encryptSession(testSession);

    // Token'ın sonuna rastgele karakterler ekleyerek bütünlüğü bozuyoruz
    const corruptedToken = token + "ab12";

    let decrypted = null;
    expect(() => {
      decrypted = decryptSession(corruptedToken);
    }).not.toThrow(); // Kriptografik hata sistemi çökertmemeli, sessizce null dönmelidir

    expect(decrypted).toBeNull();
  });

  test("Geçersiz veya tamamen rastgele token'lar için null dönmesi (Invalid Token Handlers)", async () => {
    process.env.JWT_SECRET = "test-secret-32-chars-very-secure!";
    const { decryptSession } = await import("../lib/auth");
    const fakeToken = "completely-random-non-hex-token";
    const decrypted = decryptSession(fakeToken);
    expect(decrypted).toBeNull();
  });

  test("Zaman aşımına uğramış oturumların tespiti için süre kontrolü (Session Expiry Mechanics)", async () => {
    process.env.JWT_SECRET = "test-secret-32-chars-very-secure!";
    const { encryptSession, decryptSession } = await import("../lib/auth");
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
