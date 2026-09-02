import { getEvidenceLevelBadge } from "../lib/utils/badges";

describe("getEvidenceLevelBadge", () => {
  const fdaApprovedBadge = {
    label: "FDA Onaylı",
    style: "bg-blue-500/10 text-blue-500 dark:text-blue-400 border-blue-500/20",
    desc: "FDA Onaylı Prospektüs Verisi",
  };

  const clinicalGuidelineBadge = {
    label: "Klinik Kılavuz",
    style: "bg-purple-500/10 text-purple-500 dark:text-purple-400 border-purple-500/20",
    desc: "Uluslararası Klinik Kılavuzlar (AHA, ESC vb.)",
  };

  const pubmedCaseBadge = {
    label: "PubMed Vaka",
    style: "bg-teal-500/10 text-teal-500 dark:text-teal-400 border-teal-500/20",
    desc: "PubMed Doğrulanmış Vaka Çalışmaları",
  };

  const observationalBadge = {
    label: "Gözlemsel Veri",
    style: "bg-orange-500/10 text-orange-500 dark:text-orange-400 border-orange-500/20",
    desc: "Gözlemsel Çalışmalar ve Klinik İzlem Verileri",
  };

  it.each([
    ["FDA_APPROVED", fdaApprovedBadge],
    ["fda_approved", fdaApprovedBadge],
    ["Fda_Approved", fdaApprovedBadge],
    ["CLINICAL_GUIDELINE", clinicalGuidelineBadge],
    ["clinical_guideline", clinicalGuidelineBadge],
    ["PUBMED_CASE", pubmedCaseBadge],
    ["pubmed_case", pubmedCaseBadge],
    ["OBSERVATIONAL", observationalBadge],
    ["observational", observationalBadge],
  ])(
    "should return correct badge for valid level input %p",
    (level, expectedBadge) => {
      const result = getEvidenceLevelBadge(level);
      expect(result).toEqual(expectedBadge);
      expect(result).toHaveProperty("label");
      expect(result).toHaveProperty("style");
      expect(result).toHaveProperty("desc");
    }
  );

  it.each([
    [undefined, fdaApprovedBadge],
    [null as unknown as string, fdaApprovedBadge],
    ["", fdaApprovedBadge],
    ["   ", fdaApprovedBadge],
    ["UNKNOWN_LEVEL", fdaApprovedBadge],
    ["INVALID_EVIDENCE", fdaApprovedBadge],
  ])(
    "should return default FDA_APPROVED badge for invalid or missing level input %p",
    (level, expectedBadge) => {
      const result = getEvidenceLevelBadge(level);
      expect(result).toEqual(expectedBadge);
      expect(result).toHaveProperty("label");
      expect(result).toHaveProperty("style");
      expect(result).toHaveProperty("desc");
    }
  );
});
