import type { Allocation } from "~~/shared/types";

import { and, eq, inArray, sql } from "drizzle-orm";

import { allocation, billing, hostel, room, student } from "../db/schema";

export async function bookRoom(
  studentId: number,
  roomId: number,
  endDate?: Date,
  bookingAcademicPeriod?: Allocation["academicPeriod"],
  academicYear?: string,
) {
  const { db } = useDB();

  const now = new Date();
  const allocationDate = now.toISOString();
  const defaultEndDate = new Date(now);
  defaultEndDate.setMonth(defaultEndDate.getMonth() + 8);

  let academicPeriod: Allocation["academicPeriod"];

  const allocationEndDate = (endDate ? new Date(endDate) : defaultEndDate).toISOString();

  const billDueDate = new Date(now);
  billDueDate.setMonth(billDueDate.getMonth() + 1);
  const billingDueDate = billDueDate.toISOString();

  if (bookingAcademicPeriod) {
    academicPeriod = bookingAcademicPeriod;
  }
  else {
    academicPeriod = getAcademicPeriod(
      new Date(allocationDate),
      new Date(allocationEndDate),
    );
  }

  if (!academicYear) {
    const allocationStart = new Date(allocationDate);
    let startYear: number;
    if (allocationStart.getMonth() >= 7) { // August (7) or later
      startYear = allocationStart.getFullYear();
    }
    else {
      startYear = allocationStart.getFullYear() - 1;
    }
    academicYear = `${startYear}/${startYear + 1}`;
  }

  return await db
    .transaction(async (tx) => {
      const [hasOverdueBills, existingAllocation, studentRecord] = await Promise.all([
        tx
          .query
          .billing
          .findFirst({
            columns: { id: true },
            where: and(
              eq(billing.studentId, studentId),
              eq(billing.status, "overdue"),
            ),
          }),

        tx.query.allocation.findFirst({
          where: and(
            eq(allocation.studentId, studentId),
            inArray(allocation.status, ["active", "pending"]),
          ),
          columns: {
            id: true,
            status: true,
          },
        }),

        tx.query.student.findFirst({
          columns: {
            id: true,
            gender: true,
            companyId: true,
          },
          where: eq(student.id, studentId),
        }),
      ]);

      if (hasOverdueBills) {
        throw createError({
          statusCode: 400,
          message: "You cannot book a new room while you have outstanding overdue bills. Please clear your debt first.",
        });
      }

      if (existingAllocation) {
        const article = ["active", "expired"].includes(existingAllocation.status) ? "an" : "a";
        throw createError({
          statusCode: 400,
          message: `You already have ${article} ${existingAllocation.status} room allocation.`,
        });
      }

      if (!studentRecord) {
        throw createError({
          statusCode: 404,
          message: "Student record not found.",
        });
      }

      const [targetRoom] = await tx
        .select({
          id: room.id,
          allowedGender: room.allowedGender,
          status: room.status,
          hostelId: room.hostelId,
          roomNumber: room.roomNumber,
          capacity: room.capacity,
          currentOccupancy: room.currentOccupancy,
          amountPerYear: room.amountPerYear,
          companyId: room.companyId,
        })
        .from(room)
        .where(eq(room.id, roomId))
        .for("update")
        .limit(1);

      if (!targetRoom) {
        throw createError({
          statusCode: 404,
          message: "Room not found.",
        });
      }

      if (targetRoom.allowedGender !== studentRecord.gender) {
        throw createError({
          statusCode: 400,
          message: `You cannot book this room. It is reserved for ${targetRoom.allowedGender} students only.`,
        });
      }

      if (!["vacant", "partially occupied"].includes(targetRoom.status)) {
        throw createError({
          statusCode: 409,
          message: `The room is currently ${targetRoom.status}. Please choose a different room.`,
        });
      }

      if (targetRoom.currentOccupancy >= targetRoom.capacity) {
        throw createError({
          statusCode: 400,
          message: "This room is fully occupied.",
        });
      }

      const hostelRecord = await tx.query.hostel.findFirst({
        where: eq(hostel.id, targetRoom.hostelId),
        columns: {
          id: true,
          name: true,
          companyId: true,
          slug: true,
        },
      });

      if (!hostelRecord) {
        throw createError({
          statusCode: 404,
          message: "Hostel not found for the selected room.",
        });
      }

      const [newAllocation] = await tx
        .insert(allocation)
        .values({
          studentId,
          roomId,
          allocationDate,
          academicPeriod,
          status: "pending",
          companyId: hostelRecord.companyId,
          endDate: allocationEndDate,
          academicYear,
        } satisfies typeof allocation.$inferInsert)
        .returning();

      if (!newAllocation) throw createError({ statusCode: 500, message: "Failed to create allocation" });

      await tx
        .insert(billing)
        .values({
          studentId,
          allocationId: newAllocation.id,
          amount: targetRoom.amountPerYear.toString(),
          description: `Accommodation Fee for Room ${targetRoom.roomNumber}`,
          dateIssued: new Date(),
          dueDate: billingDueDate,
          status: "unpaid",
          paidAmount: "0.00",
          hostelId: targetRoom.hostelId,
          companyId: hostelRecord.companyId,
          academicPeriod,
          type: "hostel fee",
        } satisfies typeof billing.$inferInsert)
        .returning();

      await tx.update(room)
        .set({
          currentOccupancy: sql`${room.currentOccupancy} + 1`,
          status: sql`
          CASE
            WHEN ${room.currentOccupancy} + 1 >= ${room.capacity} THEN 'fully occupied'::room_status
            ELSE 'partially occupied'::room_status
          END`,
        })
        .where(eq(room.id, roomId));

      await tx.update(student)
        .set({
          hostelId: hostelRecord.id,
          companyId: hostelRecord.companyId,
        })
        .where(eq(student.id, studentId));

      return {
        allocationId: newAllocation,
        room: {
          id: targetRoom.id,
          roomNumber: targetRoom.roomNumber,
          amountPerYear: targetRoom.amountPerYear,
        },
        hostel: {
          id: hostelRecord.id,
          name: hostelRecord.name,
          slug: hostelRecord.slug,
        },
      };
    });
}
