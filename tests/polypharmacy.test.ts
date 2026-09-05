import { checkPolypharmacyAndBeers } from "@/lib/interactions/polypharmacy";
import { PatientContext } from "@/lib/interactions/types";

describe("Polypharmacy & Beers Criteria Check (polypharmacy.ts)", () => {
  describe("Polypharmacy level classification and scoring", () => {
    it("returns low risk for empty drug list", () => {
      const result = checkPolypharmacyAndBeers([]);
      expect(result.score).toBe(0);
      expect(result.level).toBe("low");
      expect(result.message).toBe(
        "Güvenli ilaç yükü. İlaç kombinasyonunuz polifarmasi sınırının altındadır."
      );
      expect(result.beersWarnings).toEqual([]);
    });

    it("returns low risk when score is less than 4", () => {
      const result = checkPolypharmacyAndBeers(["drug1", "drug2", "drug3"]);
      expect(result.score).toBe(3);
      expect(result.level).toBe("low");
      expect(result.message).toBe(
        "Güvenli ilaç yükü. İlaç kombinasyonunuz polifarmasi sınırının altındadır."
      );
    });

    it.each([4, 5])("returns medium risk when score is %i", (score) => {
      const drugIds = Array.from({ length: score }, (_, i) => `drug${i + 1}`);
      const result = checkPolypharmacyAndBeers(drugIds);
      expect(result.score).toBe(score);
      expect(result.level).toBe("medium");
      expect(result.message).toBe(
        `Hafif Polifarmasi: Kutunuzda ${score} farklı ilaç bulunmaktadır. İlaç yükünüz artmış durumdadır, yan etki olasılığı yükselebilir.`
      );
    });

    it.each([6, 8, 10])("returns high risk when score is %i", (score) => {
      const drugIds = Array.from({ length: score }, (_, i) => `drug${i + 1}`);
      const result = checkPolypharmacyAndBeers(drugIds);
      expect(result.score).toBe(score);
      expect(result.level).toBe("high");
      expect(result.message).toBe(
        `Ciddi Polifarmasi: Kutunuzda ${score} farklı ilaç bulunmaktadır. Çoklu ilaç kullanımı nedeniyle ilaç-ilaç ve ilaç-besin etkileşim riski kritik düzeydedir. Tedavinizi hekiminizle gözden geçirin.`
      );
    });
  });

  describe("Beers Criteria warnings for elderly patients", () => {
    const elderlyContext: PatientContext = { ageGroup: "elderly" };
    const adultContext: PatientContext = { ageGroup: "adult" };

    describe("NSAID warnings", () => {
      it.each(["aspirin", "ibuprofen", "diklofenak"])(
        "returns Beers warning for elderly patient taking NSAID ID directly: %s",
        (nsaidId) => {
          const result = checkPolypharmacyAndBeers([nsaidId], elderlyContext);
          expect(result.beersWarnings.length).toBe(1);
          expect(result.beersWarnings[0]).toContain(
            "Beers Kriteri Uyarısı: NSAİİ grubu ağrı kesiciler"
          );
        }
      );

      it.each(["coraspin", "ecopirin", "nurofen", "dolorex", "advil"])(
        "returns Beers warning for elderly patient taking NSAID brand alias: %s",
        (alias) => {
          const result = checkPolypharmacyAndBeers([alias], elderlyContext);
          expect(result.beersWarnings.length).toBe(1);
          expect(result.beersWarnings[0]).toContain(
            "Beers Kriteri Uyarısı: NSAİİ grubu ağrı kesiciler"
          );
        }
      );

      it("does not return Beers NSAID warning for non-elderly patients", () => {
        const resultWithAdult = checkPolypharmacyAndBeers(["aspirin"], adultContext);
        expect(resultWithAdult.beersWarnings).toEqual([]);

        const resultWithoutContext = checkPolypharmacyAndBeers(["aspirin"]);
        expect(resultWithoutContext.beersWarnings).toEqual([]);
      });
    });

    describe("Metformin warnings", () => {
      it("returns Beers warning for elderly patient taking metformin with renal risk", () => {
        const contextWithRenalRisk: PatientContext = {
          ageGroup: "elderly",
          renalRisk: true,
        };
        const result = checkPolypharmacyAndBeers(["metformin"], contextWithRenalRisk);
        expect(result.beersWarnings.length).toBe(1);
        expect(result.beersWarnings[0]).toContain(
          "Beers Kriteri Uyarısı: Böbrek yetmezliği riski taşıyan 65 yaş üstü yaşlı hastalarda Metformin"
        );
      });

      it("does not return Beers metformin warning when renal risk is false or absent", () => {
        const contextWithoutRenalRisk: PatientContext = {
          ageGroup: "elderly",
          renalRisk: false,
        };
        const result1 = checkPolypharmacyAndBeers(["metformin"], contextWithoutRenalRisk);
        expect(result1.beersWarnings).toEqual([]);

        const result2 = checkPolypharmacyAndBeers(["metformin"], elderlyContext);
        expect(result2.beersWarnings).toEqual([]);
      });

      it("does not return Beers metformin warning for non-elderly patients with renal risk", () => {
        const adultWithRenalRisk: PatientContext = {
          ageGroup: "adult",
          renalRisk: true,
        };
        const result = checkPolypharmacyAndBeers(["metformin"], adultWithRenalRisk);
        expect(result.beersWarnings).toEqual([]);
      });
    });

    describe("Multiple Beers warnings", () => {
      it("returns both NSAID and Metformin warnings when both criteria are met", () => {
        const context: PatientContext = {
          ageGroup: "elderly",
          renalRisk: true,
        };
        const result = checkPolypharmacyAndBeers(["coraspin", "metformin"], context);
        expect(result.beersWarnings.length).toBe(2);
        expect(result.beersWarnings[0]).toContain("NSAİİ grubu ağrı kesiciler");
        expect(result.beersWarnings[1]).toContain("Metformin");
      });
    });
  });

  describe("Alias resolution, whitespace/casing, and caching behavior", () => {
    const elderlyContext: PatientContext = { ageGroup: "elderly" };

    it("resolves alias with mixed case and leading/trailing whitespace", () => {
      const result = checkPolypharmacyAndBeers(["  CORASPIN  "], elderlyContext);
      expect(result.beersWarnings.length).toBe(1);
      expect(result.beersWarnings[0]).toContain("NSAİİ grubu ağrı kesiciler");
    });

    it("handles unknown drug names/IDs gracefully without throwing or creating false warnings", () => {
      const result = checkPolypharmacyAndBeers(["unknown_drug_x", "unknown_drug_y"], elderlyContext);
      expect(result.score).toBe(2);
      expect(result.beersWarnings).toEqual([]);
    });

    it("clears resolution cache when exceeding MAX_CACHE_SIZE (5000 entries)", () => {
      // Fill cache beyond MAX_CACHE_SIZE
      const dummyDrugIds = Array.from({ length: 5005 }, (_, i) => `unique_dummy_drug_${i}`);
      const resultBefore = checkPolypharmacyAndBeers(dummyDrugIds);
      expect(resultBefore.score).toBe(5005);

      // Verify that after cache reset, normal alias resolution still works as expected
      const resultAfter = checkPolypharmacyAndBeers(["nurofen"], elderlyContext);
      expect(resultAfter.beersWarnings.length).toBe(1);
      expect(resultAfter.beersWarnings[0]).toContain("NSAİİ grubu ağrı kesiciler");
    });
  });
});
