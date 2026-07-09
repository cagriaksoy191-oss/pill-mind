import { getEvidenceLevelBadge } from "../lib/utils/badges";

describe("getEvidenceLevelBadge", () => {
  it("should return correct badge for FDA_APPROVED", () => {
    const result = getEvidenceLevelBadge("FDA_APPROVED");
    expect(result).toEqual({
      label: "FDA Onaylı",
      style: "bg-blue-500/10 text-blue-500 dark:text-blue-400 border-blue-500/20",
      desc: "FDA Onaylı Prospektüs Verisi",
    });
  });

  it("should return correct badge for CLINICAL_GUIDELINE", () => {
    const result = getEvidenceLevelBadge("CLINICAL_GUIDELINE");
    expect(result).toEqual({
      label: "Klinik Kılavuz",
      style: "bg-purple-500/10 text-purple-500 dark:text-purple-400 border-purple-500/20",
      desc: "Uluslararası Klinik Kılavuzlar (AHA, ESC vb.)",
    });
  });

  it("should return correct badge for PUBMED_CASE", () => {
    const result = getEvidenceLevelBadge("PUBMED_CASE");
    expect(result).toEqual({
      label: "PubMed Vaka",
      style: "bg-teal-500/10 text-teal-500 dark:text-teal-400 border-teal-500/20",
      desc: "PubMed Doğrulanmış Vaka Çalışmaları",
    });
  });

  it("should return correct badge for OBSERVATIONAL", () => {
    const result = getEvidenceLevelBadge("OBSERVATIONAL");
    expect(result).toEqual({
      label: "Gözlemsel Veri",
      style: "bg-orange-500/10 text-orange-500 dark:text-orange-400 border-orange-500/20",
      desc: "Gözlemsel Çalışmalar ve Klinik İzlem Verileri",
    });
  });

  it("should return default badge (FDA_APPROVED style) for unknown level", () => {
    const result = getEvidenceLevelBadge("UNKNOWN_LEVEL");
    expect(result).toEqual({
      label: "FDA Onaylı",
      style: "bg-blue-500/10 text-blue-500 dark:text-blue-400 border-blue-500/20",
      desc: "FDA Onaylı Prospektüs Verisi",
    });
  });

  it("should return default badge (FDA_APPROVED style) when level is undefined", () => {
    const result = getEvidenceLevelBadge(undefined);
    expect(result).toEqual({
      label: "FDA Onaylı",
      style: "bg-blue-500/10 text-blue-500 dark:text-blue-400 border-blue-500/20",
      desc: "FDA Onaylı Prospektüs Verisi",
    });
  });

  it("should be case-insensitive", () => {
    const resultLowerCase = getEvidenceLevelBadge("fda_approved");
    const resultMixedCase = getEvidenceLevelBadge("Clinical_Guideline");

    expect(resultLowerCase).toEqual({
      label: "FDA Onaylı",
      style: "bg-blue-500/10 text-blue-500 dark:text-blue-400 border-blue-500/20",
      desc: "FDA Onaylı Prospektüs Verisi",
    });

    expect(resultMixedCase).toEqual({
      label: "Klinik Kılavuz",
      style: "bg-purple-500/10 text-purple-500 dark:text-purple-400 border-purple-500/20",
      desc: "Uluslararası Klinik Kılavuzlar (AHA, ESC vb.)",
    });
  });
});
