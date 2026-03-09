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
export function generateHostelJoinCode(hostelName: string): string {
  const words = hostelName.trim().split(/\s+/);
  const initials = words
    .map(word => word[0]?.toUpperCase() || "")
    .filter(char => /[A-Z]/.test(char))
    .join("")
    .slice(0, 4);

  if (initials.length >= 2) {
    return generateJoinCode(initials, 8);
  }

  return generateJoinCode(undefined, 8);
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
