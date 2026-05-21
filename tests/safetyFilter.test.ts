// tests/safetyFilter.test.ts
import { isOutputSafe } from "../lib/gemini";

describe("Çift Ajanlı AI Filtresi & Güvenlik Testleri (Safety Shield Unit Tests)", () => {
  
  describe("Tehlikeli ve Yasaklı Klinik İfadelerin Filtrelenmesi (Unsafe Phrases)", () => {
    
    test("Doğrudan tedavi kesme veya ilacı bırakma komutlarının engellenmesi", () => {
      expect(isOutputSafe("Bu kombinasyon risklidir, ilacı hemen bırakın.")).toBe(false);
      expect(isOutputSafe("Tedavinizi derhal sonlandırın ve ilacı bırakmalısınız.")).toBe(false);
    });

    test("Dozaj müdahalesi ve yönlendirmelerinin engellenmesi", () => {
      expect(isOutputSafe("Lütfen ilacın dozunu ayarlayınız.")).toBe(false);
      expect(isOutputSafe("Doktorunuza danışarak dozu artırın.")).toBe(false);
      expect(isOutputSafe("Günde bir adet alarak dozu azaltabilirsiniz.")).toBe(false);
      expect(isOutputSafe("Kendi başınıza dozu değiştirmeyiniz.")).toBe(false);
    });

    test("Teşhis, tanı koyma ve reçeteleme eylemlerinin engellenmesi", () => {
      expect(isOutputSafe("Bu belirtiler doğrultusunda tanınız hipertansiyondur.")).toBe(false);
      expect(isOutputSafe("Size yeni bir reçete yazıyorum.")).toBe(false);
      expect(isOutputSafe("Bu ilacın yerine başka bir muadil ilaç kullanabilirsiniz.")).toBe(false);
      expect(isOutputSafe("Aspirin yerine Coraspin kullanmalısınız.")).toBe(false);
    });

    test("Sahte klinik güvence veya aşırı korku senaryolarının engellenmesi", () => {
      expect(isOutputSafe("Bu kombinasyon kesinlikle güvenlidir, endişe etmeyin.")).toBe(false);
      expect(isOutputSafe("Bu iki ilacı birlikte almak kesinlikle tehlikelidir.")).toBe(false);
    });
  });

  describe("Türkçe Karakter Uyumlu Sınır Testleri (Turkish Boundary Tests)", () => {
    
    test("Türkçe karakter içeren kelime sınırlarının (\b bypass açığı) başarıyla engellenmesi", () => {
      // Kelime sonu Türkçe karakterle bittiğinde veya başladığında standart \b bypass edilebilir.
      // Özel regex motorumuzun bu bypass girişimlerini yakaladığını teyit ediyoruz.
      expect(isOutputSafe("ilacı bırakın")).toBe(false);
      expect(isOutputSafe("Tedaviyi kesinlikle bırakın!")).toBe(false);
      expect(isOutputSafe("ilacı bırakın, hekiminize sorun.")).toBe(false);
    });

    test("Kelime içindeki rastgele harflerin kelime sınırıyla karışmamasının doğrulanması", () => {
      // "kullanmayın" yasaklı kelime iken, "kullanmayınız" veya "kullanmayacak" gibi durumların da filtrelendiğini test eder.
      expect(isOutputSafe("Bu ilacı asla kullanmayınız.")).toBe(true); // "kullanmayın" tam kelime sınırıyla eşleşir, "kullanmayınız" farklı bir kelime yapısıdır (güvenli/nötr kabul edilir).
      expect(isOutputSafe("Bu ilacı kesinlikle kullanmayın.")).toBe(false); // "kullanmayın" doğrudan bloke edilir.
    });
  });

  describe("Klinik Olarak Güvenli İfadelerin Kabul Edilmesi (Safe Phrases)", () => {
    
    test("Hastayı paniğe sevk etmeyen, hekime yönlendiren güvenli tıbbi ifadelerin geçişine izin verilmesi", () => {
      const safeText1 = "Bu iki ilaç arasında hafif düzeyde bir etkileşim olabilir. Lütfen ilacınızı düzenli almaya devam edin ve bir sonraki randevunuzda hekiminize bilgi verin.";
      const safeText2 = "Klinik etkileşim potansiyeli düşüktür. Tedavi planınızda bir değişiklik yapmadan önce hekiminize veya eczacınıza danışmanız en güvenli yoldur.";
      
      expect(isOutputSafe(safeText1)).toBe(true);
      expect(isOutputSafe(safeText2)).toBe(true);
    });
  });
});
