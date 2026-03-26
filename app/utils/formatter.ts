// utils/capitalizeWords.ts

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
            .map(p =>
              p.charAt(0).toUpperCase() + p.slice(1),
            )
            .join("'"),
        )
        .join("-");
    })
    .join(" ");
}
