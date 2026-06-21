import { eq } from "drizzle-orm";
import { hostel, room } from "~~/server/db/schema";

export async function compareOnboardingData(companyId: number, validationResults: Record<string, SheetValidation>) {
  const { db } = useDB();

  // Hostels
  const hostelsData = validationResults.Hostels;
  if (hostelsData?.valid && hostelsData.valid.length > 0) {
    const existingHostels = await db.query.hostel.findMany({ where: { companyId } });
    const newValid = [];
    for (const h of hostelsData.valid) {
      const existing = existingHostels.find(eh => eh.name.toLowerCase() === String(h.name).toLowerCase());
      if (existing) {
        const dbNormalized = {
          name: existing.name,
          slug: existing.slug,
          address: existing.address,
          contactNumber: existing.contactNumber,
          email: existing.email,
          status: existing.status,
          supportEmail: existing.supportEmail || undefined,
          supportPhone: existing.supportPhone || undefined,
          joinCode: existing.joinCode || undefined,
        };
        const hNormalized = {
          name: String(h.name),
          slug: String(h.slug),
          address: String(h.address),
          contactNumber: String(h.contactNumber),
          email: String(h.email),
          status: String(h.status),
          supportEmail: h.supportEmail ? String(h.supportEmail) : undefined,
          supportPhone: h.supportPhone ? String(h.supportPhone) : undefined,
          joinCode: h.joinCode ? String(h.joinCode) : undefined,
        };
        if (isDeepEqual(dbNormalized, hNormalized)) {
          hostelsData.skipped.push(h);
        }
        else {
          h._id = existing.id;
          hostelsData.updated.push(h);
        }
      }
      else {
        newValid.push(h);
      }
    }
    hostelsData.valid = newValid;
  }

  // Rooms
  const roomsData = validationResults.Rooms;
  if (roomsData?.valid && roomsData.valid.length > 0) {
    const existingRooms = await db.select({ room, hostelName: hostel.name })
      .from(room)
      .innerJoin(hostel, eq(room.hostelId, hostel.id))
      .where(eq(room.companyId, companyId));

    const newValid = [];
    for (const r of roomsData.valid) {
      const key = `${String(r.roomNumber).toLowerCase()}_${String(r.hostelName).toLowerCase()}`;
      const existing = existingRooms.find(er => `${er.room.roomNumber.toLowerCase()}_${er.hostelName.toLowerCase()}` === key);

      let capacity = 1;
      if (r.roomType === "double") capacity = 2;
      if (r.roomType === "triple") capacity = 3;
      if (r.roomType === "quad") capacity = 4;

      const featuresStr = r.features ? String(r.features).split(",").map(f => f.trim()).filter(Boolean) : [];

      if (existing) {
        const dbNormalized = {
          roomNumber: existing.room.roomNumber,
          floor: existing.room.floor,
          capacity: existing.room.capacity,
          roomType: existing.room.roomType,
          amountPerYear: Number(existing.room.amountPerYear),
          status: existing.room.status,
          allowedGender: existing.room.allowedGender,
          features: existing.room.features || [],
        };
        const rNormalized = {
          roomNumber: String(r.roomNumber),
          floor: Number(r.floor),
          capacity,
          roomType: String(r.roomType),
          amountPerYear: Number(r.amountPerYear),
          status: String(r.status),
          allowedGender: String(r.allowedGender),
          features: featuresStr,
        };
        if (isDeepEqual(dbNormalized, rNormalized)) {
          roomsData.skipped.push(r);
        }
        else {
          r._id = existing.room.id;
          roomsData.updated.push(r);
        }
      }
      else {
        newValid.push(r);
      }
    }
    roomsData.valid = newValid;
  }

  // Users Helper
  const compareByEmail = async (
    sheetName: string,
    emailKey: string,
    normalizeDb: (e: any) => any,
    normalizeXlsx: (row: any) => any,
    findQuery: (emails: string[]) => Promise<any[]>,
  ) => {
    const sheetData = validationResults[sheetName];
    if (sheetData?.valid && sheetData.valid.length > 0) {
      const emails = sheetData.valid.map((row: any) => String(row[emailKey]));
      const existingRecords = await findQuery(emails);
      const newValid = [];
      for (const row of sheetData.valid) {
        const emailVal = String(row[emailKey]).toLowerCase();
        const existing = existingRecords.find((e: any) => e.email === emailVal || e.userEmail === emailVal);
        if (existing) {
          const dbNorm = normalizeDb(existing);
          const xlsxNorm = normalizeXlsx(row);
          if (isDeepEqual(dbNorm, xlsxNorm)) {
            sheetData.skipped.push(row);
          }
          else {
            row._id = existing.id;
            sheetData.updated.push(row);
          }
        }
        else {
          newValid.push(row);
        }
      }
      sheetData.valid = newValid;
    }
  };

  await compareByEmail(
    "Users",
    "email",
    e => ({ email: e.email, name: e.name, role: e.role, image: e.image || undefined }),
    r => ({ email: String(r.email), name: String(r.name), role: String(r.role), image: r.image ? String(r.image) : undefined }),
    async emails => db
      .query
      .user
      .findMany({
        where: {
          email: { in: [...emails] },
        },
      }),
  );

  await compareByEmail("Students", "userEmail", e => ({
    userEmail: e.userEmail,
    gender: e.gender,
    phoneNumber: e.phoneNumber,
    address: e.address,
    emergencyContactName: e.emergencyContactName || undefined,
    emergencyContactPhone: e.emergencyContactPhone || undefined,
  }), r => ({
    userEmail: String(r.userEmail),
    gender: String(r.gender),
    phoneNumber: String(r.phoneNumber),
    address: String(r.address),
    emergencyContactName: r.emergencyContactName ? String(r.emergencyContactName) : undefined,
    emergencyContactPhone: r.emergencyContactPhone ? String(r.emergencyContactPhone) : undefined,
  }), async (emails) => {
    const users = await db
      .query
      .user
      .findMany({
        where: {
          email: { in: [...emails] },
        },
      });

    if (!users.length) return [];

    const userIds = users.map(u => u.id);

    const students = await db
      .query
      .student
      .findMany({
        where: {
          userId: { in: [...userIds] },
        },
      });

    return students.map((s) => {
      const u = users.find(user => user.id === s.userId);
      return { ...s, userEmail: u!.email };
    });
  });

  await compareByEmail("Admins", "userEmail", e => ({
    userEmail: e.userEmail,
    phoneNumber: e.phoneNumber,
    department: e.department || undefined,
    accessLevel: e.accessLevel,
  }), r => ({
    userEmail: String(r.userEmail),
    phoneNumber: String(r.phoneNumber),
    department: r.department ? String(r.department) : undefined,
    accessLevel: String(r.accessLevel),
  }), async (emails) => {
    const users = await db
      .query
      .user
      .findMany({
        where: {
          email: { in: [...emails] },
        },
      });

    if (!users.length) return [];

    const userIds = users.map(u => u.id);

    const admins = await db
      .query
      .admin
      .findMany({
        where: {
          userId: { in: [...userIds] },
        },
      });

    return admins.map((a) => {
      const u = users.find(user => user.id === a.userId);
      return { ...a, userEmail: u!.email };
    });
  });

  return validationResults;
}
