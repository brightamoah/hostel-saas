import { getRandomValues } from "uncrypto";

/**
 * Generates a secure, random temporary password.
 *
 * The password will be 12 characters long and is guaranteed to contain at least
 * one uppercase letter, one lowercase letter, one digit, and one special character.
 * The characters are shuffled to ensure the position of each character type is random.
 *
 * @returns A 12-character string representing the generated temporary password.
 */
export function generateTempPassword(): string {
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const digits = "0123456789";
  const special = "!@#$%^&*_+-=?";
  const allChars = upper + lower + digits + special;
  const totalLength = 12;

  const randomize = (s: string): string => {
    const array = new Uint32Array(1);
    getRandomValues(array);
    const randomIndex = (array[0] ?? 0) % s.length;
    return s.charAt(randomIndex);
  };

  // 1. Ensure at least one of each required type
  const passwordParts = [
    randomize(upper),
    randomize(lower),
    randomize(digits),
    randomize(special),
  ];

  for (let i = passwordParts.length; i < totalLength; i++) passwordParts.push(randomize(allChars));

  for (let i = passwordParts.length - 1; i > 0; i--) {
    const array = new Uint32Array(1);
    getRandomValues(array);
    const val = array[0] ?? 0;
    const j = val % (i + 1);
    const temp = passwordParts[i]!;
    passwordParts[i] = passwordParts[j]!;
    passwordParts[j] = temp;
  }

  return passwordParts.join("");
}
