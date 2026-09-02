import { parseGeminiResponse, formatExplanation } from "../lib/gemini/formatter";
import { GeminiExplanationResponse } from "../lib/gemini/types";

describe("parseGeminiResponse", () => {
  describe("Valid JSON inputs", () => {
    it.each([
      [
        "standard JSON string",
        '{"girisCumlesi":"Test giris","klinikEtkiAciklamasi":"Test klinik"}',
        "Test giris",
        "Test klinik",
      ],
      [
        "markdown json block",
        '```json\n{"girisCumlesi":"Markdown test","klinikEtkiAciklamasi":"Etki test"}\n```',
        "Markdown test",
        "Etki test",
      ],
      [
        "uppercase markdown JSON block",
        '```JSON\n{"girisCumlesi":"Uppercase JSON","klinikEtkiAciklamasi":"Etki"}\n```',
        "Uppercase JSON",
        "Etki",
      ],
      [
        "markdown code block without language tag",
        '```\n{"girisCumlesi":"No tag","klinikEtkiAciklamasi":"Etki no tag"}\n```',
        "No tag",
        "Etki no tag",
      ],
      [
        "JSON string with extra surrounding whitespace",
        '  \n\t {"girisCumlesi":"Spaced","klinikEtkiAciklamasi":"Etki spaced"} \t\n ',
        "Spaced",
        "Etki spaced",
      ],
      [
        "markdown json block with extra surrounding whitespace",
        ' \n ```json\n{"girisCumlesi":"Spaced markdown","klinikEtkiAciklamasi":"Etki"} \n``` \n ',
        "Spaced markdown",
        "Etki",
      ],
    ])("should successfully parse %s", (_, rawInput, expectedGiris, expectedKlinik) => {
      const result = parseGeminiResponse(rawInput);
      expect(result.girisCumlesi).toBe(expectedGiris);
      expect(result.klinikEtkiAciklamasi).toBe(expectedKlinik);
    });

    it("should correctly parse full GeminiExplanationResponse with array of recommendations", () => {
      const input = JSON.stringify({
        girisCumlesi: "Giris",
        klinikEtkiAciklamasi: "Klinik",
        hastalaraOneriler: ["Oneri 1", "Oneri 2"],
        hekimYonlendirmesi: "Hekim",
      });
      const result = parseGeminiResponse(input);
      expect(result).toEqual({
        girisCumlesi: "Giris",
        klinikEtkiAciklamasi: "Klinik",
        hastalaraOneriler: ["Oneri 1", "Oneri 2"],
        hekimYonlendirmesi: "Hekim",
      });
    });
  });

  describe("Invalid inputs and error handling", () => {
    it.each([
      ["invalid JSON syntax (trailing comma)", '{"girisCumlesi":"Test",}'],
      ["plain non-JSON text", "This is pure text from the AI without any JSON format."],
      ["empty string", ""],
      ["only whitespace", "   \n\t  "],
      ["unclosed JSON object", '{"girisCumlesi":"Unclosed'],
      ["malformed markdown block", '```json\n{"invalid": json}\n```'],
    ])("should throw error for %s", (_, invalidInput) => {
      expect(() => parseGeminiResponse(invalidInput)).toThrow(
        "Model çıktısı geçerli bir JSON formatında değil."
      );
    });
  });
});

describe("formatExplanation", () => {
  it("should format a fully populated response correctly", () => {
    const input: GeminiExplanationResponse = {
      girisCumlesi: "Bu bir giriş cümlesidir.",
      klinikEtkiAciklamasi: "Bu bir klinik etki açıklamasıdır.",
      hastalaraOneriler: ["Öneri 1", "Öneri 2"],
      hekimYonlendirmesi: "Bu bir hekim yönlendirmesidir.",
    };

    const expected = `Bu bir giriş cümlesidir.

Bu bir klinik etki açıklamasıdır.

**Önemli Belirtiler ve Öneriler:**
• Öneri 1
• Öneri 2

Bu bir hekim yönlendirmesidir.`;

    expect(formatExplanation(input)).toBe(expected);
  });

  it("should normalize greeting patterns and carriage returns in fields", () => {
    const input: GeminiExplanationResponse = {
      girisCumlesi: "Merhaba, bu bir giriş cümlesidir.\r\n",
      klinikEtkiAciklamasi: "Selam! klinik etki açıklaması.",
      hastalaraOneriler: ["Öneri 1"],
      hekimYonlendirmesi: "Hekiminizle görüşün.",
    };

    const result = formatExplanation(input);
    expect(result).not.toContain("Merhaba");
    expect(result).not.toContain("Selam");
    expect(result).toContain("bu bir giriş cümlesidir.");
    expect(result).toContain("klinik etki açıklaması.");
  });

  describe("Resilient handling of hastalaraOneriler", () => {
    it("should handle missing hastalaraOneriler property gracefully", () => {
      const input = {
        girisCumlesi: "Giriş",
        klinikEtkiAciklamasi: "Klinik",
      } as GeminiExplanationResponse;

      const expected = `Giriş

Klinik

**Önemli Belirtiler ve Öneriler:**`;

      expect(formatExplanation(input)).toBe(expected);
    });

    it("should handle hastalaraOneriler as a string instead of an array", () => {
      const input = {
        hastalaraOneriler: "Tek bir öneri string olarak",
      } as unknown as GeminiExplanationResponse;

      const expected = `**Önemli Belirtiler ve Öneriler:**
• Tek bir öneri string olarak`;

      expect(formatExplanation(input)).toBe(expected);
    });

    it.each([
      ["null", { hastalaraOneriler: null }],
      ["undefined", { hastalaraOneriler: undefined }],
      ["empty object", {}],
      ["number", { hastalaraOneriler: 123 }],
      ["boolean", { hastalaraOneriler: true }],
      ["object", { hastalaraOneriler: { note: "test" } }],
    ])("should handle non-array non-string hastalaraOneriler (%s)", (_, input) => {
      const expected = `**Önemli Belirtiler ve Öneriler:**`;
      expect(formatExplanation(input as unknown as GeminiExplanationResponse)).toBe(expected);
    });

    it("should handle hastalaraOneriler array with non-string, null, or falsy elements", () => {
      const input = {
        hastalaraOneriler: ["Geçerli öneri", null, undefined, 456, false, "İkinci öneri"],
      } as unknown as GeminiExplanationResponse;

      const expected = `**Önemli Belirtiler ve Öneriler:**
• Geçerli öneri
• 456
• İkinci öneri`;

      expect(formatExplanation(input)).toBe(expected);
    });

    it("should filter out empty or whitespace-only elements in hastalaraOneriler array", () => {
      const input = {
        hastalaraOneriler: ["", "   ", "Geçerli öneri", "\n\t", "Diğer öneri"],
      } as unknown as GeminiExplanationResponse;

      const expected = `**Önemli Belirtiler ve Öneriler:**
• Geçerli öneri
• Diğer öneri`;

      expect(formatExplanation(input)).toBe(expected);
    });
  });

  describe("Missing or empty string fields", () => {
    it("should handle missing string fields without generating empty paragraphs", () => {
      const input = {
        hastalaraOneriler: ["Öneri 1"],
      } as GeminiExplanationResponse;

      const expected = `**Önemli Belirtiler ve Öneriler:**
• Öneri 1`;

      expect(formatExplanation(input)).toBe(expected);
    });
  });
});
