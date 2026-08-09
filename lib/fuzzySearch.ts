const turkishCharMap: Record<string, string> = {
  İ: "i",
  I: "i",
  ı: "i",
  ğ: "g",
  ü: "u",
  ş: "s",
  ö: "o",
  ç: "c",
  "\u0307": "",
  Ğ: "g",
  Ü: "u",
  Ş: "s",
  Ö: "o",
  Ç: "c",
};
const turkishRegex = /[İIığüşöçĞÜŞÖÇ\u0307]/g;

const normalizeCache = new Map<string, string>();
function normalizeTurkish(text: string): string {
  if (!text) return "";
  let cached = normalizeCache.get(text);
  if (cached !== undefined) return cached;
  cached = text
    .replace(turkishRegex, (m) => turkishCharMap[m] || "")
    .toLowerCase()
    .trim();
  normalizeCache.set(text, cached);
  return cached;
}

let levenshteinCache = new Uint16Array(64);
let s2CharCache = new Uint16Array(64);

function levenshteinDistance(s1: string, s2: string): number {
  const len1 = s1.length;
  const len2 = s2.length;

  if (len1 === 0) return len2;
  if (len2 === 0) return len1;

  if (levenshteinCache.length < len2 + 1) {
    const newSize = Math.max(levenshteinCache.length * 2, len2 + 1);
    levenshteinCache = new Uint16Array(newSize);
  }
  if (s2CharCache.length < len2) {
    const newSize = Math.max(s2CharCache.length * 2, len2);
    s2CharCache = new Uint16Array(newSize);
  }

  const cache = levenshteinCache;

  for (let j = 0; j <= len2; j++) {
    cache[j] = j;
  }

  const s2Chars = s2CharCache;
  for (let j = 0; j < len2; j++) {
    s2Chars[j] = s2.charCodeAt(j);
  }

  for (let i = 1; i <= len1; i++) {
    let prev = i;
    const char1 = s1.charCodeAt(i - 1);
    for (let j = 1; j <= len2; j++) {
      const cost = char1 === s2Chars[j - 1] ? 0 : 1;
      const sub = cache[j - 1] + cost;
      cache[j - 1] = prev;
      const del = cache[j] + 1;
      const ins = prev + 1;
      prev = del < ins ? (del < sub ? del : sub) : ins < sub ? ins : sub;
    }
    cache[len2] = prev;
  }
  return cache[len2];
}

function matchSubsequence(query: string, target: string): number {
  let qIdx = 0;
  let tIdx = 0;
  let score = 0;
  let contiguousHits = 0;

  while (qIdx < query.length && tIdx < target.length) {
    if (query[qIdx] === target[tIdx]) {
      qIdx++;
      contiguousHits++;
      // Contiguous character bonus
      score += 10 + contiguousHits * 5;
      // Start-of-word bonus
      if (tIdx === 0) score += 30;
      tIdx++;
    } else {
      contiguousHits = 0;
      tIdx++;
    }
  }

  if (qIdx === query.length) {
    return score;
  }
  return 0;
}

export interface FuzzyResult<T> {
  item: T;
  score: number;
}

const normalizedCache = new WeakMap<
  object,
  { name: string; activeIngredient: string; category: string }
>();

export function fuzzySearchDrugs<
  T extends { name: string; activeIngredient: string; category?: string },
>(query: string, items: T[]): FuzzyResult<T>[] {
  const q = normalizeTurkish(query);
  if (!q) {
    const len = items.length;
    const results = new Array(len);
    for (let i = 0; i < len; i++) {
      results[i] = { item: items[i], score: 0 };
    }
    return results;
  }

  const results: FuzzyResult<T>[] = [];

  for (const item of items) {
    let normalized = normalizedCache.get(item);

    if (!normalized) {
      normalized = {
        name: normalizeTurkish(item.name),
        activeIngredient: normalizeTurkish(item.activeIngredient),
        category: item.category ? normalizeTurkish(item.category) : "",
      };
      normalizedCache.set(item, normalized);
    }

    const nameScore = calculateScore(q, normalized.name) * 1.5; // brand name has priority
    const ingredientScore = calculateScore(q, normalized.activeIngredient);
    const categoryScore = normalized.category
      ? calculateScore(q, normalized.category) * 0.5
      : 0;

    const bestScore = Math.max(nameScore, ingredientScore, categoryScore);

    if (bestScore > 0) {
      results.push({ item, score: bestScore });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}

function calculateScore(q: string, t: string): number {
  if (q === t) return 1000;

  if (t.startsWith(q)) {
    return 500 - (t.length - q.length);
  }

  const subIdx = t.indexOf(q);
  if (subIdx !== -1) {
    return 300 - subIdx - (t.length - q.length);
  }

  const subSeqScore = matchSubsequence(q, t);
  if (subSeqScore > 0) {
    return subSeqScore;
  }

  if (q.length >= 3) {
    const maxLen = Math.max(q.length, t.length);
    if (Math.abs(q.length - t.length) > maxLen * 0.4) {
      return 0;
    }

    const distance = levenshteinDistance(q, t);
    const similarity = 1 - distance / maxLen;

    if (similarity > 0.6) {
      return Math.round(similarity * 150);
    }
  }

  return 0;
}
