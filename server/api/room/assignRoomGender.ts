import { room } from "~~/server/db/schema";
import { and, eq, sql } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const scope = await adminSessionCheck(event);

  const { companyId, isPlatformAdmin } = scope;

  const baseScope = [];
  if (!isPlatformAdmin) {
    baseScope.push(eq(room.companyId, companyId!));
    if (scope.hostelId) baseScope.push(eq(room.hostelId, scope.hostelId));
  }

  try {
    const { db } = useDB();

    await db.update(room)
      .set({ allowedGender: "male" })
      .where(
        and(
          ...baseScope,
          sql`${room.capacity} > ${room.currentOccupancy}`,
          sql`${room.floor} % 2 != 0`,
        ),
      )
      .returning();

    await db.update(room)
      .set({ allowedGender: "female" })
      .where(
        and(
          ...baseScope,
          sql`${room.capacity} > ${room.currentOccupancy}`,
          sql`${room.floor} % 2 = 0`,
        ),
      )
      .returning();

    return {
      success: true,
      message: "Room genders assigned successfully based on floor parity.",
    };
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;

    handleError(error, "User Login", event);
  }
});
