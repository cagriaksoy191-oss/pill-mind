import { getSeverityLabel, getDrugClinicalMetadata } from "@/lib/interactions/metadata";

describe("lib/interactions/metadata", () => {
  describe("getSeverityLabel", () => {
    it.each([
      ["high", "Potansiyel Önemli Etkileşim"],
      ["medium", "Dikkat Edilmesi Gereken Etkileşim"],
      ["low", "Olası Hafif Etkileşim / İzlem Önerisi"],
      ["unknown", "Bilgi mevcut değil"],
      ["", "Bilgi mevcut değil"],
      ["HIGH", "Bilgi mevcut değil"],
    ])("given severity %p, should return %p", (severity, expected) => {
      expect(getSeverityLabel(severity)).toBe(expected);
    });
  });

  describe("getDrugClinicalMetadata", () => {
    it.each([
      [
        "aspirin",
        "D",
        "3. trimesterde kontrendikedir (Kategori D/X). Kanama riskini artırır ve duktus arteriozusun erken kapanmasına yol açabilir.",
        "Salisilatlar süte geçer. Emziren annelerde kullanımı önerilmez.",
        "Ciddi böbrek yetmezliğinde kontrendikedir. Böbrek fonksiyonlarını bozabilir.",
        "Karaciğer yetmezliğinde kanama riski nedeniyle dikkatli kullanılmalıdır.",
      ],
      [
        "warfarin",
        "X",
        "Gebelikte kesinlikle kontrendikedir (Kategori X). Teratojenik etki ve fetal kanama riski vardır.",
        "Çok az miktarda süte geçer, genellikle güvenli kabul edilse de bebek izlenmelidir.",
        "Renal eliminasyonu düşüktür ancak renal hasarda kanama riski takibi gerektirir.",
        "Karaciğer yetmezliğinde pıhtılaşma faktörleri azaldığı için kanama riski aşırı artar.",
      ],
      [
        "metformin",
        "B",
        "Gebelikte genellikle güvenli kabul edilir (Kategori B). Ancak insülin tercih edilebilir.",
        "Az miktarda süte geçer, emzirme döneminde kullanılabilir.",
        "GFR < 30 mL/dk olan şiddetli renal yetmezlikte kesinlikle kontrendikedir (Laktik asidoz riski).",
        "Karaciğer yetmezliğinde laktik asidoz riski nedeniyle kullanımı önerilmez.",
      ],
      [
        "enalapril",
        "D",
        "Gebelikte kesinlikle kontrendikedir (Kategori D). Fetal böbrek hasarı, oligohidramniyos ve kafatası kemik anomalilerine yol açabilir.",
        "Az miktarda süte geçer, dikkatle kullanılabilir.",
        "Böbrek yetmezliğinde doz azaltımı gerekir. Hiperkalemi riskini artırır.",
        "Karaciğer yetmezliğinde ön ilaç olan enalaprilin aktif forma dönüşümü azalabilir.",
      ],
      [
        "amoksisilin",
        "B",
        "Gebelikte güvenlidir (Kategori B). Yaygın olarak kullanılır.",
        "Süte geçer, bebekte ishal veya mantar riski takip edilerek kullanılabilir.",
        "GFR < 30 mL/dk ise doz aralığı uzatılmalıdır.",
        "Karaciğer yetmezliğinde doz ayarlamasına gerek yoktur.",
      ],
      [
        "omeprazol",
        "C",
        "Potansiyel yarar risklerden fazlaysa kullanılabilir (Kategori C).",
        "Süte geçer, dikkatle kullanılmalıdır.",
        "Doz ayarlamasına gerek yoktur.",
        "Şiddetli karaciğer yetmezliğinde doz kısıtlaması (günlük maks 20mg) önerilir.",
      ],
      [
        "ibuprofen",
        "C",
        "3. trimesterde kesinlikle kontrendikedir (Kategori D/X). Doğum sancısını geciktirebilir ve fetal kanamaya yol açabilir.",
        "Çok az miktarda süte geçer, emzirme döneminde kısa süreli kullanılabilir.",
        "Ciddi böbrek yetmezliğinde kontrendikedir. Akut böbrek hasarını tetikleyebilir.",
        "Karaciğer yetmezliğinde dikkatle kullanılmalıdır.",
      ],
      [
        "diklofenak",
        "C",
        "3. trimesterde kesinlikle kontrendikedir (Kategori D/X). Fetal duktus arteriozusun erken kapanmasına neden olur.",
        "Süte çok az miktarda geçer, kısa süreli kullanılabilir.",
        "Ciddi renal yetmezlikte kontrendikedir. Böbrek yetmezliğini kötüleştirebilir.",
        "Hepatotoksisite riski vardır, karaciğer fonksiyonları izlenmelidir.",
      ],
      [
        "metoprolol",
        "C",
        "Fetal perfüzyonu azaltabilir. Yeni doğanda bradikardi ve hipoglisemi riski nedeniyle takip gerektirir.",
        "Süte geçer, bebek bradikardi açısından izlenmelidir.",
        "Doz ayarlamasına gerek yoktur.",
        "Karaciğerde yoğun metabolize olur, hepatik yetmezlikte doz azaltılmalıdır.",
      ],
      [
        "parasetamol",
        "B",
        "Gebelikte en güvenli ağrı kesicidir (Kategori B).",
        "Süte geçer, terapötik dozlarda güvenli kabul edilir.",
        "Şiddetli renal yetmezlikte (GFR < 10 mL/dk) doz aralığı uzatılmalıdır (en az 6-8 saat).",
        "Şiddetli karaciğer yetmezliğinde veya aktif alkolizmde günlük doz sınırlandırılmalıdır (maks 2g); hepatotoksisite riski vardır.",
      ],
    ])(
      "returns clinical metadata for drug %p",
      (drugId, category, pregNote, breastNote, renalNote, hepaticNote) => {
        const result = getDrugClinicalMetadata(drugId);
        expect(result).toEqual({
          pregnancyCategory: category,
          pregnancyNote: pregNote,
          breastfeedingNote: breastNote,
          renalNote: renalNote,
          hepaticNote: hepaticNote,
        });
      }
    );

    it("handles whitespace and case variations correctly", () => {
      const metadataLower = getDrugClinicalMetadata("aspirin");
      const metadataUpperSpaced = getDrugClinicalMetadata("  ASPIRIN \t\n ");
      expect(metadataUpperSpaced).toEqual(metadataLower);
    });

    it("returns default clinical metadata for unknown drug IDs", () => {
      const defaultMetadata = getDrugClinicalMetadata("non_existent_drug_123");
      expect(defaultMetadata).toEqual({
        pregnancyCategory: "C",
        pregnancyNote: "Yeterli insan çalışması yoktur, potansiyel yarar risklerden fazlaysa kullanılabilir.",
        breastfeedingNote: "Emzirme döneminde kullanırken dikkatli olunmalı, bebek izlenmelidir.",
        renalNote: "Böbrek yetmezliğinde doz ayarlaması veya takip önerilebilir.",
        hepaticNote: "Karaciğer yetmezliğinde dikkatli kullanılmalı, fonksiyonlar izlenmelidir.",
      });
    });

    it("returns default clinical metadata for empty or whitespace-only inputs", () => {
      const defaultMetadata = getDrugClinicalMetadata("   ");
      expect(defaultMetadata.pregnancyCategory).toBe("C");
    });
  });
});
