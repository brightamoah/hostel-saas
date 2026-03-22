import type { AdminScope, ComplaintActionTaken, ComplaintInsert, ComplaintStatus } from "~~/shared/types";

import { useDB } from "~~/server/utils/db";
import { and, countDistinct, desc, eq, sql } from "drizzle-orm";

import { complaint, complaintResponse } from "../schema";

const complaintWithRelations = {
  with: {
    student: {
      with: {
        user: {
          columns: {
            name: true,
            email: true,
          },
        },
      },
    },
    room: true,
    hostel: true,
    responses: {
      orderBy: desc(complaintResponse.responseDate),
      with: {
        responder: {
          columns: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    },
  },
} as const;

export async function complaintQueries() {
  const { db } = useDB();

  const applyComplaintScope = (scope: AdminScope) => {
    const mode = getScopeMode(scope);

    if (mode === "platform") return [];
    if (mode === "company" && scope.companyId) return [eq(complaint.companyId, scope.companyId)];

    if (mode === "hostel" && scope.hostelId) return [eq(complaint.hostelId, scope.hostelId)];

    return [sql`FALSE`];
  };

  const getAllComplaintsScoped = async (scope: AdminScope) => {
    return await db
      .query
      .complaint
      .findMany({
        ...complaintWithRelations,
        where: and(...applyComplaintScope(scope)),
        orderBy: desc(complaint.createdAt),
      });
  };

  const getComplaintById = async (complaintId: number, scope: AdminScope) => {
    return await db.query.complaint.findFirst({
      ...complaintWithRelations,
      where: and(
        eq(complaint.id, complaintId),
        ...applyComplaintScope(scope),
      ),
    });
  };

  const getComplaintStatusCount = async (scope: AdminScope) => {
    const filters = applyComplaintScope(scope);

    const [result] = await db
      .select({
        totalComplaints: countDistinct(complaint.id),
        pending: countDistinct(sql`CASE WHEN ${complaint.status} = 'pending' THEN ${complaint.id} END`),
        inProgress: countDistinct(sql`CASE WHEN ${complaint.status} = 'in-progress' THEN ${complaint.id} END`),
        resolved: countDistinct(sql`CASE WHEN ${complaint.status} = 'resolved' THEN ${complaint.id} END`),

      })
      .from(complaint)
      .where(and(...filters));

    return {
      totalComplaints: result?.totalComplaints ?? 0,
      totalPending: result?.pending ?? 0,
      totalInProgress: result?.inProgress ?? 0,
      totalResolved: result?.resolved ?? 0,
    };
  };

  const actionTakenMap: Record<ComplaintStatus, ComplaintActionTaken> = {
    "pending": "updated",
    "in-progress": "updated",
    "resolved": "resolved",
    "rejected": "rejected",
  };

  const updateStatusAndAddResponse = async (
    status: ComplaintStatus,
    responseText: string,
    complaintId: number,
    scope: AdminScope,
  ) => {
    return db.transaction(async (tx) => {
      const adminId = scope.adminData.id;
      const companyId = scope.companyId!;

      const target = await tx.query.complaint.findFirst({
        where: and(
          eq(complaint.id, complaintId),
          ...applyComplaintScope(scope),
        ),
      });

      if (!target) throw new Error("Complaint not found or unauthorized access.");

      const [updatedComplaint] = await tx
        .update(complaint)
        .set({
          status,
          resolvedAt: status === "resolved" ? new Date() : null,
          resolvedBy: status === "resolved" ? adminId : null,
          updatedAt: new Date(),
        })
        .where(eq(complaint.id, complaintId))
        .returning();

      const [newResponse] = await tx
        .insert(complaintResponse)
        .values({
          complaintId,
          responderId: adminId,
          response: responseText,
          actionTaken: actionTakenMap[status],
          companyId,
        })
        .returning();

      return { updatedComplaint, newResponse };
    });
  };

  const addComplaintResponse = async (
    complaintId: number,
    responderId: number,
    response: string,
    companyId: number,
  ) => {
    const [newResponse] = await db
      .insert(complaintResponse)
      .values({
        complaintId,
        responderId,
        response,
        actionTaken: "updated",
        companyId,
      })
      .returning();
    return newResponse;
  };

  const getComplaintByIdNoScope = async (complaintId: number) => {
    return await db.query.complaint.findFirst({
      where: eq(complaint.id, complaintId),
    });
  };

  const getStudentComplaints = async (studentId: number) => {
    const [list, [stats]] = await Promise.all([
      db.query.complaint.findMany({
        ...complaintWithRelations,
        where: eq(complaint.studentId, studentId),
        orderBy: desc(complaint.createdAt),
      }),

      db
        .select({
          total: countDistinct(complaint.id),
          pending: countDistinct(sql`CASE WHEN ${complaint.status} = 'pending' THEN ${complaint.id} END`),
          resolved: countDistinct(sql`CASE WHEN ${complaint.status} = 'resolved' THEN ${complaint.id} END`),
          inProgress: countDistinct(sql`CASE WHEN ${complaint.status} = 'in-progress' THEN ${complaint.id} END`),
        })
        .from(complaint)
        .where(eq(complaint.studentId, studentId)),
    ]);

    return {
      complaints: list,
      totalComplaints: stats?.total,
      totalPending: stats?.pending,
      totalInProgress: stats?.inProgress,
      totalResolved: stats?.resolved,
    };
  };

  const createComplaint = async (data: ComplaintInsert) => {
    const [newComplaint] = await db
      .insert(complaint)
      .values({
        ...data,
        status: "pending",
      },
      )
      .returning();
    return newComplaint;
  };

  const updateComplaint = async (
    complaintId: number,
    studentId: number,
    data: Partial<ComplaintInsert>,
  ) => {
    const allowedFields: (keyof ComplaintInsert)[] = [
      "type",
      "description",
      "priority",
      "roomId",
    ];

    const filteredData: Partial<ComplaintInsert> = {};
    for (const field of allowedFields) {
      if (field in data) {
        // @ts-expect-error - Safe assignment of allowed fields
        filteredData[field] = data[field];
      }
    }

    if (Object.keys(filteredData).length === 0) return null;

    filteredData.updatedAt = new Date();

    const [updatedComplaint] = await db
      .update(complaint)
      .set(filteredData)
      .where(
        and(
          eq(complaint.id, complaintId),
          eq(complaint.studentId, studentId),
          eq(complaint.status, "pending"),
        ),
      )
      .returning();
    return updatedComplaint;
  };

  const getComplaintForStudentById = async (complaintId: number, studentId: number) => {
    return await db.query.complaint.findFirst({
      where: and(
        eq(complaint.id, complaintId),
        eq(complaint.studentId, studentId),
      ),
    });
  };

  return {
    getAllComplaintsScoped,
    getComplaintById,
    getComplaintStatusCount,
    updateStatusAndAddResponse,
    addComplaintResponse,
    getComplaintByIdNoScope,
    getStudentComplaints,
    createComplaint,
    updateComplaint,
    getComplaintForStudentById,
  };
}

type ComplaintWithRelations = Awaited<ReturnType<Awaited<ReturnType<typeof complaintQueries>>["getComplaintById"]>>;

export type ComplaintType = NonNullable<ComplaintWithRelations>;
