/**
 * Generates a random join code with an optional prefix.
 * @param prefix - An optional string prefix to prepend to the code (sanitized to uppercase alphanumeric, max 4 chars).
 * @param length - The total length of the generated code (default is 8).
 * @returns A string representing the generated join code.
 */
export function generateJoinCode(prefix?: string, length: number = 8): string {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";

  if (prefix) {
    const sanitizedPrefix = prefix
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 4);
    code = sanitizedPrefix;
  }

  const remainingLength = length - code.length;

  for (let i = 0; i < remainingLength; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    code += characters[randomIndex];
  }

  return code;
}

/**
 * Generates a join code for a hostel based on its name.
 * Uses the initials of the hostel name as a prefix (up to 4 uppercase letters).
 * If fewer than 2 initials, generates a random code without prefix.
 * @param hostelName - The name of the hostel to generate the code for.
 * @returns A string representing the generated join code (8 characters total).
 */
export function generateHostelJoinCode(hostelName: string, existingCode?: string): string {
  const cleanName = hostelName.replace(/[^a-z0-9]/gi, "").toUpperCase();
  const prefix = cleanName.slice(0, 5);

  if (prefix.length >= 2) {
    if (existingCode && existingCode.length === 8) {
      const requiredSuffixLength = 8 - prefix.length;
      const suffix = existingCode.slice(-requiredSuffixLength);
      return prefix + suffix;
    }

    return generateJoinCode(prefix, 8);
  }

  return (existingCode && existingCode.length === 8)
    ? existingCode
    : generateJoinCode(undefined, 8);
}

/**
 * Validates if the given code is a valid join code format.
 * The code must be 6 to 10 characters long, consisting only of uppercase letters and digits.
 * @param code - The join code to validate.
 * @returns True if the code matches the format, false otherwise.
 */
export function isValidJoinCodeFormat(code: string): boolean {
  return /^[A-Z0-9]{6,10}$/.test(code.toUpperCase());
}
