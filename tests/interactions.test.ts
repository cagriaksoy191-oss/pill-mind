import { getDrugClinicalMetadata, getSeverityLabel, getSeverityColor, getAllDrugs, findInteractions, findContraindications } from "../lib/interactions";

describe("interactions UI helpers", () => {

  describe("getDrugClinicalMetadata", () => {
    test("returns correct clinical metadata for a known drug (aspirin)", () => {
      const result = getDrugClinicalMetadata("aspirin");
      expect(result.pregnancyCategory).toBe("D");
      expect(result.pregnancyNote).toContain("3. trimesterde kontrendikedir");
      expect(result.breastfeedingNote).toContain("Salisilatlar süte geçer");
      expect(result.renalNote).toContain("Ciddi böbrek yetmezliğinde kontrendikedir");
      expect(result.hepaticNote).toContain("Karaciğer yetmezliğinde kanama riski nedeniyle dikkatli kullanılmalıdır");
    });

    test("returns correct clinical metadata for another known drug (warfarin)", () => {
      const result = getDrugClinicalMetadata("warfarin");
      expect(result.pregnancyCategory).toBe("X");
      expect(result.pregnancyNote).toContain("Gebelikte kesinlikle kontrendikedir");
    });

    test("handles mixed casing and whitespace correctly", () => {
      const result1 = getDrugClinicalMetadata("  AsPiRiN  ");
      expect(result1.pregnancyCategory).toBe("D");

      const result2 = getDrugClinicalMetadata("WARFARIN");
      expect(result2.pregnancyCategory).toBe("X");
    });

    test("returns default metadata for an unknown drug", () => {
      const result = getDrugClinicalMetadata("unknown_drug_123");
      expect(result.pregnancyCategory).toBe("C");
      expect(result.pregnancyNote).toContain("Yeterli insan çalışması yoktur");
    });

    test("returns default metadata for empty string", () => {
      const result = getDrugClinicalMetadata("");
      expect(result.pregnancyCategory).toBe("C");
      expect(result.pregnancyNote).toContain("Yeterli insan çalışması yoktur");
    });
  });


  describe("getSeverityLabel", () => {
    test("returns correct label for 'high' severity", () => {
      const result = getSeverityLabel("high");
      expect(result).toBe("Potansiyel Önemli Etkileşim");
    });

    test("returns correct label for 'medium' severity", () => {
      const result = getSeverityLabel("medium");
      expect(result).toBe("Dikkat Edilmesi Gereken Etkileşim");
    });

    test("returns correct label for 'low' severity", () => {
      const result = getSeverityLabel("low");
      expect(result).toBe("Olası Hafif Etkileşim / İzlem Önerisi");
    });

    test("returns default label for unknown severity", () => {
      const result = getSeverityLabel("unknown");
      expect(result).toBe("Bilgi mevcut değil");
    });

    test("returns default label for empty string", () => {
      const result = getSeverityLabel("");
      expect(result).toBe("Bilgi mevcut değil");
    });

    test("is case sensitive and returns default for uppercase inputs", () => {
      const result = getSeverityLabel("HIGH");
      expect(result).toBe("Bilgi mevcut değil");
    });
  });

  describe("getSeverityColor", () => {
    test("returns correct colors for 'high' severity", () => {
      const result = getSeverityColor("high");
      expect(result).toEqual({
        bg: "bg-red-50",
        border: "border-red-300",
        badge: "bg-red-600 text-white",
        text: "text-red-800",
      });
    });

    test("returns correct colors for 'medium' severity", () => {
      const result = getSeverityColor("medium");
      expect(result).toEqual({
        bg: "bg-amber-50",
        border: "border-amber-300",
        badge: "bg-amber-500 text-white",
        text: "text-amber-800",
      });
    });

    test("returns correct colors for 'low' severity", () => {
      const result = getSeverityColor("low");
      expect(result).toEqual({
        bg: "bg-green-50",
        border: "border-green-300",
        badge: "bg-green-600 text-white",
        text: "text-green-800",
      });
    });

    test("returns default gray colors for unknown severity", () => {
      const result = getSeverityColor("unknown");
      expect(result).toEqual({
        bg: "bg-gray-50",
        border: "border-gray-300",
        badge: "bg-gray-500 text-white",
        text: "text-gray-700",
      });
    });

    test("returns default gray colors for empty string", () => {
      const result = getSeverityColor("");
      expect(result).toEqual({
        bg: "bg-gray-50",
        border: "border-gray-300",
        badge: "bg-gray-500 text-white",
        text: "text-gray-700",
      });
    });

    test("is case sensitive and returns default for uppercase inputs", () => {
      const result = getSeverityColor("HIGH");
      expect(result).toEqual({
        bg: "bg-gray-50",
        border: "border-gray-300",
        badge: "bg-gray-500 text-white",
        text: "text-gray-700",
      });
    });
  });

  describe("getAllDrugs", () => {
    test("returns an array of drugs", () => {
      const drugs = getAllDrugs();
      expect(Array.isArray(drugs)).toBe(true);
      expect(drugs.length).toBeGreaterThan(0);

      const firstDrug = drugs[0];
      expect(firstDrug).toHaveProperty("id");
      expect(firstDrug).toHaveProperty("name");
      expect(firstDrug).toHaveProperty("activeIngredient");
      expect(firstDrug).toHaveProperty("category");
    });
  });

  describe("findInteractions", () => {
    test("returns empty array for empty input", () => {
      const result = findInteractions([]);
      expect(result).toEqual([]);
    });

    test("returns empty array for null input", () => {
      // @ts-expect-error testing invalid input
      const result = findInteractions(null);
      expect(result).toEqual([]);
    });

    test("returns empty array for undefined input", () => {
      // @ts-expect-error testing invalid input
      const result = findInteractions(undefined);
      expect(result).toEqual([]);
    });

    test("returns empty array for non-array input", () => {
      // @ts-expect-error testing invalid input
      const result = findInteractions("aspirin");
      expect(result).toEqual([]);
    });

    test("returns empty array for array of empty strings", () => {
      const result = findInteractions(["", ""]);
      expect(result).toEqual([]);
    });

    test("returns empty array for array with identical drugs", () => {
      const result = findInteractions(["aspirin", "aspirin"]);
      expect(result).toEqual([]);
    });

    test("returns empty array for single drug", () => {
      const result = findInteractions(["aspirin"]);
      expect(result).toEqual([]);
    });

    test("returns empty array for non-interacting drugs", () => {
      // Assuming aspirin and metformin don't interact in the mock dataset
      const result = findInteractions(["aspirin", "metformin"]);
      expect(result).toEqual([]);
    });

    test("returns interactions for interacting drugs", () => {
      const result = findInteractions(["aspirin", "warfarin"]);
      expect(result.length).toBe(1);

      const res = result[0];
      expect(res.interaction.id).toBe("aspirin-warfarin");
      expect(res.interaction.severity).toBe("high");
      expect(res.drug1Name).toBe("Aspirin");
      expect(res.drug2Name).toBe("Coumadin (Warfarin)");
    });

    test("is order independent", () => {
      const result1 = findInteractions(["aspirin", "warfarin"]);
      const result2 = findInteractions(["warfarin", "aspirin"]);

      expect(result1.length).toBe(1);
      expect(result2.length).toBe(1);
      expect(result1[0].interaction.id).toBe(result2[0].interaction.id);
    });

    test("returns multiple interactions for multiple interacting drugs", () => {
      const result = findInteractions(["aspirin", "warfarin", "ibuprofen"]);

      // Expected interactions: aspirin-warfarin, aspirin-ibuprofen, ibuprofen-warfarin
      // Let's check length is correct based on dataset (assuming 3 interactions here or at least 2)
      // aspirin-warfarin and ibuprofen-warfarin exist based on the peek.
      // aspirin-ibuprofen might also exist. We just assert length > 1
      expect(result.length).toBeGreaterThan(1);

      const ids = result.map(r => r.interaction.id);
      expect(ids).toContain("aspirin-warfarin");
      expect(ids).toContain("ibuprofen-warfarin");
    });
  });

  describe("findContraindications", () => {
    test("returns empty array when patientContext is undefined", () => {
      const result = findContraindications(["aspirin"]);
      expect(result).toEqual([]);
    });

    test("returns empty array when patientContext has no risks and no diseases", () => {
      const result = findContraindications(["aspirin"], {});
      expect(result).toEqual([]);
    });

    test("returns contraindications for diseases (e.g. Aspirin and K25 Peptik Ülser)", () => {
      const result = findContraindications(["aspirin"], { diseases: ["K25"] });
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].type).toBe("disease");
      expect(result[0].diseaseIcd).toBe("K25");
      expect(result[0].severity).toBe("high");
    });

    test("returns pregnancy contraindications (e.g. Category X or D drugs)", () => {
      // Warfarin is category X
      const result = findContraindications(["warfarin"], { isPregnant: true });
      expect(result.length).toBeGreaterThan(0);

      const pregContra = result.find(r => r.type === "pregnancy");
      expect(pregContra).toBeDefined();
      expect(pregContra?.severity).toBe("high");
    });

    test("returns breastfeeding contraindications (e.g. aspirin)", () => {
      const result = findContraindications(["aspirin"], { isBreastfeeding: true });
      expect(result.length).toBeGreaterThan(0);

      const lactContra = result.find(r => r.type === "breastfeeding");
      expect(lactContra).toBeDefined();
      expect(lactContra?.severity).toBe("medium");
    });

    test("returns renal risk contraindications (e.g. metformin)", () => {
      const result = findContraindications(["metformin"], { renalRisk: true });
      expect(result.length).toBeGreaterThan(0);

      const renalContra = result.find(r => r.type === "renal");
      expect(renalContra).toBeDefined();
      expect(renalContra?.severity).toBe("high");
    });

    test("returns renal risk contraindications (e.g. ibuprofen)", () => {
      const result = findContraindications(["ibuprofen"], { renalRisk: true });
      expect(result.length).toBeGreaterThan(0);

      const renalContra = result.find(r => r.type === "renal");
      expect(renalContra).toBeDefined();
      expect(renalContra?.severity).toBe("high");
    });

    test("handles aliases and casing", () => {
      // Using an alias or different casing should still find the contraindication
      const result = findContraindications(["Aspirin "], { diseases: ["K25"] });
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].type).toBe("disease");
      expect(result[0].diseaseIcd).toBe("K25");
    });
  });
});
