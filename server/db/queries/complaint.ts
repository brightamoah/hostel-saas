import type { AdminScope, AuditContext, ComplaintActionTaken, ComplaintInsert, ComplaintStatus, Period } from "~~/shared/types";

import { computeAuditDiff, redact } from "~~/server/utils/auditLogUtils";
import { calcChange, getTimePeriod } from "~~/server/utils/calcChange";
import { useDB } from "~~/server/utils/db";
import { getScopeMode } from "~~/server/utils/permissionScope";
import { and, count, countDistinct, desc, eq, sql } from "drizzle-orm";

import { complaint, complaintResponse } from "../schema";
import { auditLogQueries } from "./auditLog";

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

  const { logAudit } = await auditLogQueries();

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
    const {
      startOfToday,
      startOfYesterday,
      startOfThisWeek,
      startOfLastWeek,
      startOfThisMonth,
      startOfLastMonth,
    } = getTimePeriod();

    const filters = applyComplaintScope(scope);

    const [result] = await db
      .select({
        totalAbs: countDistinct(complaint.id),
        pendingAbs: count(sql`CASE WHEN ${complaint.status} = 'pending' THEN 1 END`),
        inProgressAbs: count(sql`CASE WHEN ${complaint.status} = 'in-progress' THEN 1 END`),
        resolvedAbs: count(sql`CASE WHEN ${complaint.status} = 'resolved' THEN 1 END`),

        totalThisMonth: count(sql`CASE WHEN ${complaint.createdAt} >= ${startOfThisMonth} THEN 1 END`),
        totalLastMonth: count(sql`CASE WHEN ${complaint.createdAt} >= ${startOfLastMonth} AND ${complaint.createdAt} < ${startOfThisMonth} THEN 1 END`),

        pendingToday: count(sql`CASE WHEN ${complaint.status} = 'pending' AND ${complaint.createdAt} >= ${startOfToday} THEN 1 END`),
        pendingYesterday: count(sql`CASE WHEN ${complaint.status} = 'pending' AND ${complaint.createdAt} >= ${startOfYesterday} AND ${complaint.createdAt} < ${startOfToday} THEN 1 END`),

        inProgressThisWeek: count(sql`CASE WHEN ${complaint.status} = 'in-progress' AND ${complaint.updatedAt} >= ${startOfThisWeek} THEN 1 END`),
        inProgressLastWeek: count(sql`CASE WHEN ${complaint.status} = 'in-progress' AND ${complaint.updatedAt} >= ${startOfLastWeek} AND ${complaint.updatedAt} < ${startOfThisWeek} THEN 1 END`),

        resolvedThisMonth: count(sql`CASE WHEN ${complaint.status} = 'resolved' AND ${complaint.resolvedAt} >= ${startOfThisMonth} THEN 1 END`),
        resolvedLastMonth: count(sql`CASE WHEN ${complaint.status} = 'resolved' AND ${complaint.resolvedAt} >= ${startOfLastMonth} AND ${complaint.resolvedAt} < ${startOfThisMonth} THEN 1 END`),

      })
      .from(complaint)
      .where(and(...filters));

    return {
      total: {
        value: Number(result?.totalAbs || 0),
        percentage: calcChange(Number(result?.totalThisMonth || 0), Number(result?.totalLastMonth || 0)),
        period: "monthly" as Period,
      },
      pending: {
        value: Number(result?.pendingAbs || 0),
        percentage: calcChange(Number(result?.pendingToday || 0), Number(result?.pendingYesterday || 0)),
        period: "daily" as Period,
      },
      inProgress: {
        value: Number(result?.inProgressAbs || 0),
        percentage: calcChange(Number(result?.inProgressThisWeek || 0), Number(result?.inProgressLastWeek || 0)),
        period: "weekly" as Period,
      },
      resolved: {
        value: Number(result?.resolvedAbs || 0),
        percentage: calcChange(Number(result?.resolvedThisMonth || 0), Number(result?.resolvedLastMonth || 0)),
        period: "monthly" as Period,
      },
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
    ctx: AuditContext,
  ) => {
    return db.transaction(async (tx) => {
      const adminId = scope.adminData.id;
      const companyId = scope.companyId!;
      const responderId = scope.userId;

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
          responderId,
          response: responseText,
          actionTaken: actionTakenMap[status],
          companyId,
        })
        .returning();

      if (updatedComplaint) {
        const diff = computeAuditDiff(target, updatedComplaint);

        await logAudit(tx, ctx, {
          entityId: updatedComplaint.id,
          entityType: "complaint",
          actionType: "UPDATE",
          action: `complaint.update_status_to_${status}`,
          description: `${ctx.actor.actorType} updated complaint ID ${updatedComplaint.id} status to ${status} with response "${redact(responseText)}"`,
          diff: diff ? redact(diff) : null,
          before: target,
          after: updatedComplaint,
        });
      }

      if (newResponse) {
        await logAudit(tx, ctx, {
          entityId: newResponse.id,
          entityType: "complaint_response",
          actionType: "CREATE",
          action: `complaint.add_response_with_status_${status}`,
          description: `${ctx.actor.actorType} added response to complaint ID ${complaintId} with status ${status}: "${responseText}"`,
          before: null,
          after: newResponse,
        });
      }

      return { updatedComplaint, newResponse };
    });
  };

  const addComplaintResponse = async (
    complaintId: number,
    responderId: number,
    response: string,
    companyId: number,
    ctx: AuditContext,
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

    if (newResponse) {
      await logAudit(db, ctx, {
        entityId: newResponse.id,
        entityType: "complaint_response",
        actionType: "CREATE",
        action: `complaint.add_response`,
        description: `${ctx.actor.actorType} added response to complaint ID ${complaintId}`,
        before: null,
        after: newResponse,
      });
    }

    return newResponse;
  };

  const getComplaintByIdNoScope = async (complaintId: number) => {
    return await db.query.complaint.findFirst({
      where: eq(complaint.id, complaintId),
    });
  };

  const getStudentComplaints = async (studentId: number) => {
    const {
      startOfToday,
      startOfYesterday,
      startOfThisWeek,
      startOfLastWeek,
      startOfThisMonth,
      startOfLastMonth,
    } = getTimePeriod();

    const [list, [stats]] = await Promise.all([
      db.query.complaint.findMany({
        ...complaintWithRelations,
        where: eq(complaint.studentId, studentId),
        orderBy: desc(complaint.createdAt),
      }),

      db
        .select({
          totalThisMonth: count(sql`CASE WHEN ${complaint.createdAt} >= ${startOfThisMonth} THEN 1 END`),
          totalLastMonth: count(sql`CASE WHEN ${complaint.createdAt} >= ${startOfLastMonth} AND ${complaint.createdAt} < ${startOfThisMonth} THEN 1 END`),

          //  Pending comparison (Daily) - Are we ignoring new complaints?
          pendingToday: count(sql`CASE WHEN ${complaint.status} = 'pending' AND ${complaint.createdAt} >= ${startOfToday} THEN 1 END`),
          pendingYesterday: count(sql`CASE WHEN ${complaint.status} = 'pending' AND ${complaint.createdAt} >= ${startOfYesterday} AND ${complaint.createdAt} < ${startOfToday} THEN 1 END`),

          //  Resolved comparison (Monthly) - The resolution velocity
          resolvedThisMonth: count(sql`CASE WHEN ${complaint.status} = 'resolved' AND ${complaint.resolvedAt} >= ${startOfThisMonth} THEN 1 END`),
          resolvedLastMonth: count(sql`CASE WHEN ${complaint.status} = 'resolved' AND ${complaint.resolvedAt} >= ${startOfLastMonth} AND ${complaint.resolvedAt} < ${startOfThisMonth} THEN 1 END`),

          // In-progress comparison (Weekly)
          inProgressThisWeek: count(sql`CASE WHEN ${complaint.status} = 'in-progress' AND ${complaint.updatedAt} >= ${startOfThisWeek} THEN 1 END`),
          inProgressLastWeek: count(sql`CASE WHEN ${complaint.status} = 'in-progress' AND ${complaint.updatedAt} >= ${startOfLastWeek} AND ${complaint.updatedAt} < ${startOfThisWeek} THEN 1 END`),

          totalAbs: count(complaint.id),
          pendingAbs: count(sql`CASE WHEN ${complaint.status} = 'pending' THEN 1 END`),
          resolvedAbs: count(sql`CASE WHEN ${complaint.status} = 'resolved' THEN 1 END`),
          inProgressAbs: count(sql`CASE WHEN ${complaint.status} = 'in-progress' THEN 1 END`),
        })
        .from(complaint)
        .where(eq(complaint.studentId, studentId)),
    ]);

    return {
      complaints: list,
      summary: {
        total: {
          value: stats?.totalAbs ?? 0,
          percentage: calcChange(stats?.totalThisMonth ?? 0, stats?.totalLastMonth ?? 0),
          period: "monthly" as Period,
        },
        pending: {
          value: stats?.pendingAbs ?? 0,
          percentage: calcChange(stats?.pendingToday ?? 0, stats?.pendingYesterday ?? 0),
          period: "daily" as Period,

        },
        resolved: {
          value: stats?.resolvedAbs ?? 0,
          percentage: calcChange(stats?.resolvedThisMonth ?? 0, stats?.resolvedLastMonth ?? 0),
          period: "monthly" as Period,
        },
        inProgress: {
          value: stats?.inProgressAbs ?? 0,
          percentage: calcChange(stats?.inProgressThisWeek ?? 0, stats?.inProgressLastWeek ?? 0),
          period: "weekly" as Period,
        },
      },
    };
  };

  const createComplaint = async (data: ComplaintInsert, ctx: AuditContext) => {
    const [newComplaint] = await db
      .insert(complaint)
      .values({
        ...data,
        status: "pending",
      },
      )
      .returning();

    if (newComplaint) {
      await logAudit(db, ctx, {
        entityId: newComplaint.id,
        entityType: "complaint",
        actionType: "CREATE",
        action: "complaint.create",
        description: `${ctx.actor.actorType} created complaint of type ${newComplaint.type} with priority ${newComplaint.priority} by student ID ${newComplaint.studentId} in room ID ${newComplaint.roomId}`,
        before: null,
        after: newComplaint,
      });
    }

    return newComplaint;
  };

  const updateComplaint = async (
    complaintId: number,
    studentId: number,
    data: Partial<ComplaintInsert>,
    ctx: AuditContext,
  ) => {
    const before = await db.query.complaint.findFirst({
      where: and(
        eq(complaint.id, complaintId),
        eq(complaint.studentId, studentId),
      ),
    });

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

    if (updatedComplaint) {
      const diff = computeAuditDiff(before, updatedComplaint);

      await logAudit(db, ctx, {
        entityId: updatedComplaint.id,
        entityType: "complaint",
        actionType: "UPDATE",
        action: "complaint.update",
        description: `${ctx.actor.actorType} updated complaint of type ${updatedComplaint.type} with priority ${updatedComplaint.priority} by student ID ${updatedComplaint.studentId} in room ID ${updatedComplaint.roomId}`,
        before,
        after: updatedComplaint,
        diff: diff ? redact(diff) : null,
      });
    }

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

export type ComplaintData = Awaited<ReturnType<Awaited<ReturnType<typeof complaintQueries>>["getStudentComplaints"]>>;

export type AdminComplaintStats = Awaited<ReturnType<Awaited<ReturnType<typeof complaintQueries>>["getComplaintStatusCount"]>>;
