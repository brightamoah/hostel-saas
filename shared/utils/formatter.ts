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

/**
 * Masks an account number showing only the last 4 digits.
 * Follows industry standards for displaying sensitive financial information.
 *
 * @param accountNumber - The raw account number to mask
 * @param options - Optional configuration
 * @param options.maskChar - Character to use for masking (default: "*")
 * @param options.showLast - Number of characters to show at the end (default: 4)
 * @param options.showFirst - Number of characters to show at the start (default: 0)
 * @param options.includeLength - Whether to append the original length (default: false)
 * @returns Masked account number (e.g., "******1234" or "••••••1234")
 *
 * @example
 * maskAccountNumber("1234567890") // Returns "******7890"
 * maskAccountNumber("1234567890", { maskChar: "•", showLast: 4 }) // Returns "••••••7890"
 * maskAccountNumber("1234567890", { showFirst: 2, showLast: 4 }) // Returns "12****7890"
 */
export function maskAccountNumber(
  accountNumber: string,
  options: {
    maskChar?: string;
    showLast?: number;
    showFirst?: number;
    includeLength?: boolean;
  } = {},
): string {
  const {
    maskChar = "*",
    showLast = 4,
    showFirst = 0,
    includeLength = false,
  } = options;

  if (!accountNumber) return "";

  const cleaned = accountNumber.replace(/\s/g, "");
  const length = cleaned.length;

  if (length <= showLast + showFirst) {
    return cleaned;
  }

  const firstPart = showFirst > 0 ? cleaned.slice(0, showFirst) : "";
  const lastPart = cleaned.slice(-showLast);
  const maskedLength = length - showLast - showFirst;
  const masked = maskChar.repeat(Math.min(maskedLength, 12)); // Cap at 12 chars for readability

  const result = showFirst > 0
    ? `${firstPart}${masked}${lastPart}`
    : `${masked}${lastPart}`;

  if (includeLength) {
    return `${result} (${length} digits)`;
  }

  return result;
}

/**
 * Masks an account number specifically for API responses.
 * Standard format: last 4 digits only with asterisks.
 *
 * @param accountNumber - The raw account number
 * @returns Masked account number (e.g., "******1234")
 */
export function maskAccountNumberForApi(accountNumber?: string | null): string | null {
  if (!accountNumber) return null;
  return maskAccountNumber(accountNumber, { showLast: 4, maskChar: "*" });
}

/**
 * Masks an account number for display in UI with visual indicators.
 * Uses bullet points (•) which are more aesthetically pleasing for UI.
 *
 * @param accountNumber - The raw account number
 * @returns Masked account number with bullets (e.g., "••••••1234")
 */
export function maskAccountNumberForUI(accountNumber?: string | null): string {
  if (!accountNumber) return "";
  return maskAccountNumber(accountNumber, { showLast: 4, maskChar: "•" });
}

/**
 * Partially masks an account number showing first 2 and last 4 digits.
 * Useful for verification scenarios where user needs to confirm the account.
 *
 * @param accountNumber - The raw account number
 * @returns Partially masked account number (e.g., "12****7890")
 */
export function maskAccountNumberPartial(accountNumber?: string | null): string | null {
  if (!accountNumber) return null;
  return maskAccountNumber(accountNumber, { showFirst: 2, showLast: 4, maskChar: "*" });
}

export function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function dateSlug() {
  return new Date().toISOString().split("T")[0]!;
}
