/** Preserve direct primary-source URLs rather than turning them into a search. */
export function getReferenceLink(source: string): {href: string; label: string} {
  const text = source.trim();
  try {
    const url = new URL(text);
    if (url.protocol === "https:" || url.protocol === "http:") {
      const host = url.hostname.toLowerCase();
      const label = host === "www.accessdata.fda.gov" || host === "accessdata.fda.gov"
        ? "FDA · İlaç etiketi"
        : host === "dailymed.nlm.nih.gov"
          ? "NIH DailyMed · İlaç etiketi"
          : text;
      return {href: url.href, label};
    }
  } catch { /* Older curated records contain citation titles, not URLs. */ }
  return {
    href: text.toLowerCase().includes("pubmed")
      ? `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(text)}`
      : `https://www.google.com/search?q=${encodeURIComponent(text)}`,
    label: text,
  };
}
