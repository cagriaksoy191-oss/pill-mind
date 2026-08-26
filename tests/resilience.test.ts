// tests/resilience.test.ts
import { findInteractionsDB, findInteractions } from "../lib/interactions";

describe("Sistem Dayanıklılığı ve Hata Dayanıklılığı Testleri (Resilience & Fallback Tests)", () => {
  const originalEnvUrl = process.env.DATABASE_URL;

  afterAll(() => {
    process.env.DATABASE_URL = originalEnvUrl;
  });

  test("DATABASE_URL tanımsız olduğunda otomatik lokal JSON fallback tetiklenmesi", async () => {
    // DATABASE_URL boşaltıldığında sistem deterministik lokal JSON engine'e düşmelidir
    process.env.DATABASE_URL = "";

    const drugIds = ["aspirin", "warfarin"];
    
    let results;
    try {
      results = await findInteractionsDB(drugIds);
    } catch (err) {
      throw new Error("DATABASE_URL boşken hata fırlatılmamalıdır: " + err);
    }

    const localResults = findInteractions(drugIds);
    // Veritabanı yokken dönen sonuç lokal eşleşmelerle tam uyumlu olmalıdır
    expect(results).toBeDefined();
    expect(results).toEqual(localResults);
  });

  test("Veritabanı bağlantısı koptuğunda veya sorgu çöktüğünde (Supabase Outage) sistem kararlılığının korunması", async () => {
    // DATABASE_URL tanımlı fakat veritabanı çökmüş gibi simüle ediliyor
    process.env.DATABASE_URL = "postgresql://postgres:wrong_password@db.supabase.co:5432/postgres";

    const drugIds = ["aspirin", "warfarin"];

    let results;
    // Çökme durumunda hata fırlatılmamalı, log basılıp lokal yedek mekanizma çalışmalıdır
    try {
      results = await findInteractionsDB(drugIds);
    } catch {
      throw new Error("Veritabanı çökmesi durumunda hata dışarı sızmamalı, try/catch ile yönetilmelidir.");
    }

    expect(results).toBeDefined();
    const localResults = findInteractions(drugIds);
    expect(results).toEqual(localResults);
  }, 15000);
});
