// tests/fuzzySearch.test.ts
import { normalizeTurkish, fuzzySearchDrugs } from "../lib/fuzzySearch";

interface MockDrug {
  id: string;
  name: string;
  activeIngredient: string;
  category: string;
}

describe("Fuzzy Search Birim Testleri (Turkish Fuzzy Search)", () => {
  const mockDrugs: MockDrug[] = [
    {
      id: "1",
      name: "Aspirin",
      activeIngredient: "Asetilsalisilik Asit",
      category: "Analjezik",
    },
    {
      id: "2",
      name: "Coraspin",
      activeIngredient: "Asetilsalisilik Asit",
      category: "Antikoagülan",
    },
    {
      id: "3",
      name: "Parol",
      activeIngredient: "Parasetamol",
      category: "Antipiretik",
    },
    {
      id: "4",
      name: "Apranax",
      activeIngredient: "Naproksen Sodyum",
      category: "NSAİİ",
    },
  ];

  test("Türkçe karakterlerin başarıyla normalize edilmesi (Turkish Character Normalization)", () => {
    expect(normalizeTurkish("İLAÇ")).toBe("ilac");
    expect(normalizeTurkish("koraspin")).toBe("koraspin");
    expect(normalizeTurkish("çalışma")).toBe("calisma");
    expect(normalizeTurkish("ıspanak")).toBe("ispanak");
    expect(normalizeTurkish("ŞÖLEN")).toBe("solen");
    expect(normalizeTurkish("Ömür")).toBe("omur");
    expect(normalizeTurkish("Gümüş")).toBe("gumus");
  });

  test("Yazım hatalarında Levenshtein toleransı (Typo Tolerance & Levenshtein)", () => {
    // "asprn" typed, should find Aspirin and Coraspin
    const results = fuzzySearchDrugs("asprn", mockDrugs);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].item.name).toBe("Aspirin");
  });

  test("Ardışık harf eşleşme puanlaması (Subsequence Matching)", () => {
    const results = fuzzySearchDrugs("Coras", mockDrugs);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].item.name).toBe("Coraspin");
  });

  test("Boş veya anlamsız girdilerde çökme koruması (Nonsense & Empty Input Resilience)", () => {
    const emptyResults = fuzzySearchDrugs("", mockDrugs);
    expect(emptyResults.length).toBe(mockDrugs.length);
    expect(emptyResults[0].score).toBe(0);

    const nonsenseResults = fuzzySearchDrugs("xyzqwe123", mockDrugs);
    expect(nonsenseResults.length).toBe(0);
  });

  test("Marka adı önceliği (Brand Name Priority)", () => {
    // "Aspirin" query matches both "Aspirin" brand name and "Asetilsalisilik Asit" active ingredient
    // "Aspirin" brand should have higher priority and score
    const results = fuzzySearchDrugs("Aspirin", mockDrugs);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].item.name).toBe("Aspirin");
  });

  test("Kategori eşleşmeleri (Category matching)", () => {
    // "Analjezik" category query should match Aspirin
    const results = fuzzySearchDrugs("Analjezik", mockDrugs);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].item.name).toBe("Aspirin");

    // Items without matching categories should be ranked lower or not included based on threshold
    const noMatch = results.find((r) => r.item.name === "Parol");
    expect(noMatch).toBeUndefined(); // Assuming "Analjezik" doesn't match "Antipiretik" or "Parasetamol" enough
  });

  test("Eksik kategori durumu (Missing category handling)", () => {
    const drugsWithMissingCategory = [
      ...mockDrugs,
      { id: "5", name: "Vitamin C", activeIngredient: "Askorbik Asit" }, // No category
    ];

    // Should still be able to search by name safely
    const results = fuzzySearchDrugs("Vitamin", drugsWithMissingCategory);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].item.name).toBe("Vitamin C");

    // Searching by a category should gracefully not match the item with missing category,
    // but not crash.
    const categoryResults = fuzzySearchDrugs(
      "Analjezik",
      drugsWithMissingCategory,
    );
    expect(
      categoryResults.find((r) => r.item.name === "Vitamin C"),
    ).toBeUndefined();
  });
});
