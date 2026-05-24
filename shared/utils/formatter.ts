const SMALL_WORDS = new Set([
  "and",
  "or",
  "the",
  "of",
  "in",
  "on",
  "at",
  "to",
  "for",
  "by",
  "a",
  "an",
  "but",
  "nor",
  "with",
  "as",
]);

export function capitalizeWords(
  input: string,
  options?: {
    keepSmallWordsLowercase?: boolean;
  },
): string {
  if (!input || typeof input !== "string") return "";

  const { keepSmallWordsLowercase = false } = options || {};

  return input
    .trim()
    .replace(/\s+/g, " ") // normalize spaces
    .split(" ")
    .map((word, index) => {
      const isAllCaps = /^[A-Z0-9]+$/.test(word);
      const lower = isAllCaps ? word : word.toLowerCase();

      // Handle small words like "and", "of", etc.
      if (
        keepSmallWordsLowercase
        && index !== 0
        && SMALL_WORDS.has(lower)
      ) {
        return lower;
      }

      // Handle hyphenated words: john-doe → John-Doe
      return lower
        .split("-")
        .map(part =>
          part
            .split("'")
            .map((p, i, arr) => {
              // Capitalize after apostrophe only for name patterns (e.g., O'Brien)
              // Single char before apostrophe suggests a name prefix
              const shouldCapitalize = i === 0 || (arr[i - 1]?.length === 1);
              return shouldCapitalize
                ? p.charAt(0).toUpperCase() + p.slice(1)
                : p;
            })
            .join("'"),
        )
        .join("-");
    })
    .join(" ");
}
