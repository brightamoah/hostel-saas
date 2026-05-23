import type { Allocation, AuditContext } from "~~/shared/types";

import { eq, sql } from "drizzle-orm";

import { auditLogQueries } from "../db/queries/auditLog";
import { allocation, billing, room, student } from "../db/schema";

export async function bookRoom(
  studentId: number,
  roomId: number,
  ctx: AuditContext,
  endDate?: Date,
  bookingAcademicPeriod?: Allocation["academicPeriod"],
  academicYear?: string,
) {
  const { db } = useDB();
  const { logAudit } = await auditLogQueries();

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

  try {
    return await db
      .transaction(async (tx) => {
        const [hasOverdueBills, existingAllocation, studentRecord] = await Promise.all([
          tx
            .query
            .billing
            .findFirst({
              columns: { id: true },
              where: {
                studentId,
                status: "overdue",
              },
            }),

          tx.query.allocation.findFirst({
            where: {
              studentId,
              status: { in: ["active", "pending"] },
            },
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
            where: {
              id: studentId,
            },
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
          where: { id: targetRoom.hostelId },
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
            hostelId: targetRoom.hostelId,
          } satisfies typeof allocation.$inferInsert)
          .returning();

        if (!newAllocation) throw createError({ statusCode: 500, message: "Failed to create allocation" });

        const [newBilling] = await tx
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

        if (!newBilling) {
          throw createError({
            statusCode: 500,
            message: "Failed to create billing record.",
          });
        }

        const [updatedRoom] = await tx.update(room)
          .set({
            currentOccupancy: sql`${room.currentOccupancy} + 1`,
            status: sql`
          CASE
            WHEN ${room.currentOccupancy} + 1 >= ${room.capacity} THEN 'fully occupied'::room_status
            ELSE 'partially occupied'::room_status
          END`,
          })
          .where(eq(room.id, roomId))
          .returning();

        const [updatedStudent] = await tx.update(student)
          .set({
            hostelId: hostelRecord.id,
            companyId: hostelRecord.companyId,
            enrollmentDate: sql`COALESCE(${student.enrollmentDate}, ${now.toISOString()})`,
          })
          .where(eq(student.id, studentId))
          .returning();

        const ctxForAudit: AuditContext = {
          ...ctx,
          companyId: hostelRecord.companyId ?? ctx.companyId ?? null,
          hostelId: hostelRecord.id ?? ctx.hostelId ?? null,
        };

        await logAudit(tx, ctxForAudit, {
          action: "allocation.book_room",
          actionType: "CREATE",
          entityType: "allocation",
          entityId: newAllocation.id,
          description: `Student ${studentId} booked room ${roomId} in hostel ${hostelRecord.id} with allocation ID ${newAllocation.id} and billingId=${newBilling.id}`,
          before: null,
          after: {
            ...newAllocation,
            roomNumber: targetRoom.roomNumber,
            hostel: hostelRecord,
          },
        });

        await logAudit(tx, ctxForAudit, {
          action: "billing.create",
          actionType: "CREATE",
          entityType: "billing",
          entityId: newBilling.id,
          description: `Created billing record ${newBilling.id} for allocation ${newAllocation.id}, amount ${targetRoom.amountPerYear}`,
          before: null,
          after: newBilling,
        });

        await logAudit(tx, ctxForAudit, {
          action: "room.update_occupancy",
          actionType: "UPDATE",
          entityType: "room",
          entityId: targetRoom.id,
          description: `Occupancy increased by 1 for room ${targetRoom.id} (${targetRoom.roomNumber})`,
          before: targetRoom,
          after: updatedRoom,
        });

        await logAudit(tx, ctxForAudit, {
          action: "student.update_hostel",
          actionType: "UPDATE",
          entityType: "student",
          entityId: studentId,
          description: `Assigned student ${studentId} to hostel ${hostelRecord.id}`,
          before: studentRecord,
          after: updatedStudent,
        });

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
            companyId: hostelRecord.companyId,
          },
        };
      });
  }
  catch (error) {
    await logAudit(db, ctx, {
      action: "allocation.book_room.failed",
      actionType: "CREATE",
      entityType: "allocation",
      entityId: null,
      description: `Failed booking attempt: student ${studentId} tried to book room ${roomId}. Reason: ${error instanceof Error ? error.message : String(error)}`,
      before: null,
      after: null,
    }).catch(() => { });

    throw error;
  }
}
