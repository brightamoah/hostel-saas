import type { Buffer } from "node:buffer";

import { read, utils } from "xlsx";

/**
 * Parses all sheets from an Excel buffer and returns them as a JSON object.
 */
export function parseExcelBuffer(buffer: Buffer) {
  const workbook = read(buffer, { type: "buffer" });

  const EXPECTED_SHEETS = [
    "Company",
    "Users",
    "Hostels",
    "Rooms",
    "Students",
    "Allocations",
    "Billing",
    "Admins",
    "Payments",
    "Visitors",
    "Complaints",
    "MaintenanceRequests",
    "Announcements",
  ];

  const hasValidStructure = workbook.SheetNames.some(name => EXPECTED_SHEETS.includes(name));

  if (!hasValidStructure) {
    throw new Error("Invalid file structure. Please use the official onboarding template.");
  }

  const result: Record<string, any[]> = {};

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    const data = utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });

    const cleanedData = data
      .map((row) => {
        const cleanRow: Record<string, any> = {};
        for (const [key, value] of Object.entries(row)) {
          if (!key.startsWith("__EMPTY")) {
            cleanRow[key] = typeof value === "string" ? value.trim() : value;
          }
        }
        return cleanRow;
      })
      .filter((row) => {
        return Object.values(row).some(val => val !== "" && val !== null && val !== undefined);
      });

    result[sheetName] = cleanedData;
  }

  return result;
}
