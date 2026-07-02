export function getEvidenceLevelBadge(level?: string) {
  switch (level?.toUpperCase()) {
    case "FDA_APPROVED":
      return {
        label: "FDA Onaylı",
        style: "bg-blue-500/10 text-blue-500 dark:text-blue-400 border-blue-500/20",
        desc: "FDA Onaylı Prospektüs Verisi"
      };
    case "CLINICAL_GUIDELINE":
      return {
        label: "Klinik Kılavuz",
        style: "bg-purple-500/10 text-purple-500 dark:text-purple-400 border-purple-500/20",
        desc: "Uluslararası Klinik Kılavuzlar (AHA, ESC vb.)"
      };
    case "PUBMED_CASE":
      return {
        label: "PubMed Vaka",
        style: "bg-teal-500/10 text-teal-500 dark:text-teal-400 border-teal-500/20",
        desc: "PubMed Doğrulanmış Vaka Çalışmaları"
      };
    case "OBSERVATIONAL":
      return {
        label: "Gözlemsel Veri",
        style: "bg-orange-500/10 text-orange-500 dark:text-orange-400 border-orange-500/20",
        desc: "Gözlemsel Çalışmalar ve Klinik İzlem Verileri"
      };
    default:
      return {
        label: "FDA Onaylı",
        style: "bg-blue-500/10 text-blue-500 dark:text-blue-400 border-blue-500/20",
        desc: "FDA Onaylı Prospektüs Verisi"
      };
  }
}
