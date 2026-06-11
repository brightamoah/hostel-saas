import { hostel, room } from "~~/server/db/schema";
import { eq } from "drizzle-orm";

/**
 * Mutates and returns the validationResults object by moving already-existing
 * database entities from the `valid` array into the `skipped` array.
 */
export async function deduplicateData(companyId: number, validationResults: Record<string, { valid: any[]; skipped: any[] }>) {
  const { db } = useDB();

  // Deduplicate Hostels
  const hostelsData = validationResults.Hostels;
  if (hostelsData?.valid && hostelsData.valid.length > 0) {
    const existingHostels = await db.query.hostel.findMany({
      where: { companyId },
      columns: { name: true },
    });
    const existingHostelNames = new Set(existingHostels.map(h => h.name.toLowerCase()));

    const newValid = [];
    for (const h of hostelsData.valid) {
      if (existingHostelNames.has(String(h.name).toLowerCase())) {
        hostelsData.skipped.push(h);
      }
      else {
        newValid.push(h);
      }
    }
    hostelsData.valid = newValid;
  }

  // Deduplicate Rooms
  // We need to check roomNumber + hostelName
  const roomsData = validationResults.Rooms;
  if (roomsData?.valid && roomsData.valid.length > 0) {
    const existingRooms = await db
      .select({
        roomNumber: room.roomNumber,
        hostelName: hostel.name,
      })
      .from(room)
      .innerJoin(hostel, eq(room.hostelId, hostel.id))
      .where(eq(room.companyId, companyId));

    const existingRoomSet = new Set(existingRooms.map(r => `${r.roomNumber.toLowerCase()}_${r.hostelName.toLowerCase()}`));

    const newValid = [];
    for (const r of roomsData.valid) {
      const key = `${String(r.roomNumber).toLowerCase()}_${String(r.hostelName).toLowerCase()}`;
      if (existingRoomSet.has(key)) {
        roomsData.skipped.push(r);
      }
      else {
        newValid.push(r);
      }
    }
    roomsData.valid = newValid;
  }

  // Helper function to deduplicate users by email
  const deduplicateByEmail = async (sheetName: string, emailKey: string) => {
    const sheetData = validationResults[sheetName];
    if (sheetData?.valid && sheetData.valid.length > 0) {
      const emails = sheetData.valid.map((row: Record<string, unknown>) => String(row[emailKey]));

      const existingUsers = await db.query.user.findMany({
        where: {
          email: {
            in: [...emails],
          },
        },
        columns: { email: true },
      });

      const existingUserEmails = new Set(existingUsers.map(u => u.email.toLowerCase()));

      const newValid = [];
      for (const row of sheetData.valid) {
        if (existingUserEmails.has(String(row[emailKey]).toLowerCase())) {
          sheetData.skipped.push(row);
        }
        else {
          newValid.push(row);
        }
      }
      sheetData.valid = newValid;
    }
  };

  await deduplicateByEmail("Users", "email");
  await deduplicateByEmail("Students", "userEmail");
  await deduplicateByEmail("Admins", "userEmail");

  return validationResults;
}
