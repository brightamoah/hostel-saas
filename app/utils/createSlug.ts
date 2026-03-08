/**
 * Creates a URL-friendly slug from the given input string.
 *
 * @param input - The string to convert into a slug.
 * @param slugOptions - Optional configuration for slug generation.
 * @param slugOptions.maxWords - Maximum number of words to include in the slug (default: 3).
 * @param slugOptions.maxLength - Maximum length of the slug (default: 50).
 * @param slugOptions.removeStopWords - Whether to remove common stop words (default: true).
 * @returns The generated slug, or an empty string if input is invalid.
 */
export function createSlug(
  input: string,
  slugOptions?: {
    maxWords?: number;
    maxLength?: number;
    removeStopWords?: boolean;
  },
) {
  const maxWords = slugOptions?.maxWords ?? 3;
  const maxLength = slugOptions?.maxLength ?? 50;
  const removeStopWords = slugOptions?.removeStopWords ?? true;

  const stopWords = new Set([
    "the",
    "and",
    "or",
    "of",
    "for",
    "to",
    "in",
    "on",
    "at",
    "by",
    "with",
    "a",
    "an",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "being",
    "have",
    "has",
    "had",
    "do",
    "does",
    "did",
    // business noise words you often don’t need in slugs
    "limited",
    "ltd",
    "company",
    "co",
    "inc",
    "incorporated",
    "enterprise",
    "enterprises",
    "group",
    "holdings",
    "services",
  ]);

  const normalized = (input || "")
    .trim()
    .toLowerCase()
    // turn separators into spaces first
    .replace(/[_/|]+/g, " ")
    // remove apostrophes
    .replace(/['’]/g, "")
    // replace anything not alphanumeric with spaces (keeps words)
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  if (!normalized) return "";

  let words = normalized.split(/\s+/).filter(Boolean);

  if (removeStopWords) {
    words = words.filter(w => !stopWords.has(w));
  }

  // If everything got removed (e.g., name was only stop words), fallback to original words
  if (words.length === 0) {
    words = normalized.split(/\s+/).filter(Boolean);
  }

  // take only first N words
  words = words.slice(0, maxWords);

  // join with hyphens
  let slug = words.join("-");

  // hard cap length without cutting in the middle of a word if possible
  if (slug.length > maxLength) {
    const trimmedWords: string[] = [];
    let currentLen = 0;

    for (const w of words) {
      const extra = trimmedWords.length === 0 ? w.length : (1 + w.length);
      if (currentLen + extra > maxLength) break;
      trimmedWords.push(w);
      currentLen += extra;
    }

    slug = trimmedWords.join("-");
    if (!slug && words.length > 0) slug = (words[0] ?? "").slice(0, maxLength);
  }

  slug = slug.replace(/-+/g, "-").replace(/(?:^-|-$)+/g, "");

  return slug;
}
