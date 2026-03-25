import type { AdminScope, MaintenanceCreate, MaintenanceEdit, MaintenanceStatus } from "~~/shared/types";

import { calcChange, getTimePeriod } from "~~/server/utils/calcChange";
import { useDB } from "~~/server/utils/db";
import { and, count, countDistinct, desc, eq, sql } from "drizzle-orm";

import { maintenanceRequest, maintenanceResponse } from "../schema";

const maintenanceWithRelations = {
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
      orderBy: desc(maintenanceResponse.responseDate),
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

export async function maintenanceQueries() {
  const { db } = useDB();

  const applyMaintenanceScope = (scope: AdminScope) => {
    const mode = getScopeMode(scope);

    if (mode === "platform") return [];
    if (mode === "company" && scope.companyId) return [eq(maintenanceRequest.companyId, scope.companyId)];
    if (mode === "hostel" && scope.hostelId) return [eq(maintenanceRequest.hostelId, scope.hostelId)];
    return [sql`FALSE`];
  };

  const getAllMaintenanceRequests = async (scope: AdminScope) => {
    return await db
      .query
      .maintenanceRequest
      .findMany({
        ...maintenanceWithRelations,
        where: and(...applyMaintenanceScope(scope)),
        orderBy: desc(maintenanceRequest.requestDate),
      });
  };

  const getMaintenanceById = async (id: number, scope: AdminScope) => {
    return await db.query.maintenanceRequest.findFirst({
      ...maintenanceWithRelations,
      where: and(
        eq(maintenanceRequest.id, id),
        ...applyMaintenanceScope(scope),
      ),
    });
  };

  const findMaintenanceRequestById = async (id: number) => {
    return db.query.maintenanceRequest.findFirst({
      where: eq(maintenanceRequest.id, id),
    });
  };

  const getMaintenanceStatusCount = async (scope: AdminScope) => {
    const {
      startOfToday,
      startOfYesterday,
      startOfThisWeek,
      startOfLastWeek,
      startOfThisMonth,
      startOfLastMonth,
    } = getTimePeriod();

    const filters = applyMaintenanceScope(scope);

    const [result] = await db
      .select({
        totalAbs: countDistinct(maintenanceRequest.id),
        pendingAbs: count(sql`CASE WHEN ${maintenanceRequest.status} = 'pending' THEN 1 END`),
        completedAbs: count(sql`CASE WHEN ${maintenanceRequest.status} = 'completed' THEN 1 END`),
        inProgressAbs: count(sql`CASE WHEN ${maintenanceRequest.status} = 'in-progress' THEN 1 END`),
        assignedAbs: count(sql`CASE WHEN ${maintenanceRequest.status} = 'assigned' THEN 1 END`),
        rejectedAbs: count(sql`CASE WHEN ${maintenanceRequest.status} = 'rejected' THEN 1 END`),

        totalThisMonth: count(sql`CASE WHEN ${maintenanceRequest.requestDate} >= ${startOfThisMonth} THEN 1 END`),
        totalLastMonth: count(sql`CASE WHEN ${maintenanceRequest.requestDate} >= ${startOfLastMonth} AND ${maintenanceRequest.requestDate} < ${startOfThisMonth} THEN 1 END`),

        pendingToday: count(sql`CASE WHEN ${maintenanceRequest.status} = 'pending' AND ${maintenanceRequest.requestDate} >= ${startOfToday} THEN 1 END`),
        pendingYesterday: count(sql`CASE WHEN ${maintenanceRequest.status} = 'pending' AND ${maintenanceRequest.requestDate} >= ${startOfYesterday} AND ${maintenanceRequest.requestDate} < ${startOfToday} THEN 1 END`),

        resolvedThisMonth: count(sql`CASE WHEN ${maintenanceRequest.status} = 'completed' AND ${maintenanceRequest.resolutionDate} >= ${startOfThisMonth} THEN 1 END`),
        resolvedLastMonth: count(sql`CASE WHEN ${maintenanceRequest.status} = 'completed' AND ${maintenanceRequest.resolutionDate} >= ${startOfLastMonth} AND ${maintenanceRequest.resolutionDate} < ${startOfThisMonth} THEN 1 END`),

        inProgressThisWeek: count(sql`CASE WHEN ${maintenanceRequest.status} = 'in-progress' AND ${maintenanceRequest.updatedAt} >= ${startOfThisWeek} THEN 1 END`),
        inProgressLastWeek: count(sql`CASE WHEN ${maintenanceRequest.status} = 'in-progress' AND ${maintenanceRequest.updatedAt} >= ${startOfLastWeek} AND ${maintenanceRequest.updatedAt} < ${startOfThisWeek} THEN 1 END`),
      })
      .from(maintenanceRequest)
      .where(and(...filters));

    return {
      totalMaintenance: {
        value: Number(result?.totalAbs ?? 0),
        percentage: calcChange(Number(result?.totalThisMonth || 0), Number(result?.totalLastMonth || 0)),
        period: "monthly" as Period,
      },
      inProgress: {
        value: Number(result?.inProgressAbs ?? 0),
        percentage: calcChange(Number(result?.inProgressThisWeek || 0), Number(result?.inProgressLastWeek || 0)),
        period: "weekly" as Period,
      },
      pending: {
        value: Number(result?.pendingAbs ?? 0),
        percentage: calcChange(Number(result?.pendingToday || 0), Number(result?.pendingYesterday || 0)),
        period: "daily" as Period,
      },
      completed: {
        value: Number(result?.completedAbs ?? 0),
        percentage: calcChange(Number(result?.resolvedThisMonth || 0), Number(result?.resolvedLastMonth || 0)),
        period: "monthly" as Period,
      },
      assigned: Number(result?.assignedAbs ?? 0),
      rejected: Number(result?.rejectedAbs ?? 0),
    };
  };

  const getStudentMaintenanceRequests = async (studentId: number) => {
    const {
      startOfToday,
      startOfYesterday,
      startOfThisWeek,
      startOfLastWeek,
      startOfThisMonth,
      startOfLastMonth,
    } = getTimePeriod();

    const [stats] = await db
      .select({
        totalThisMonth: count(sql`CASE WHEN ${maintenanceRequest.requestDate} >= ${startOfThisMonth} THEN 1 END`),
        totalLastMonth: count(sql`CASE WHEN ${maintenanceRequest.requestDate} >= ${startOfLastMonth} AND ${maintenanceRequest.requestDate} < ${startOfThisMonth} THEN 1 END`),

        // Pending (Daily) - Comparing backlog creation
        pendingToday: count(sql`CASE WHEN ${maintenanceRequest.status} = 'pending' AND ${maintenanceRequest.requestDate} >= ${startOfToday} THEN 1 END`),
        pendingYesterday: count(sql`CASE WHEN ${maintenanceRequest.status} = 'pending' AND ${maintenanceRequest.requestDate} >= ${startOfYesterday} AND ${maintenanceRequest.requestDate} < ${startOfToday} THEN 1 END`),

        // Completed (Monthly)
        completedThisMonth: count(sql`CASE WHEN ${maintenanceRequest.status} = 'completed' AND ${maintenanceRequest.resolutionDate} >= ${startOfThisMonth} THEN 1 END`),
        completedLastMonth: count(sql`CASE WHEN ${maintenanceRequest.status} = 'completed' AND ${maintenanceRequest.resolutionDate} >= ${startOfLastMonth} AND ${maintenanceRequest.resolutionDate} < ${startOfThisMonth} THEN 1 END`),

        // In Progress (Weekly)
        inProgressThisWeek: count(sql`CASE WHEN ${maintenanceRequest.status} = 'in-progress' AND ${maintenanceRequest.updatedAt} >= ${startOfThisWeek} THEN 1 END`),
        inProgressLastWeek: count(sql`CASE WHEN ${maintenanceRequest.status} = 'in-progress' AND ${maintenanceRequest.updatedAt} >= ${startOfLastWeek} AND ${maintenanceRequest.updatedAt} < ${startOfThisWeek} THEN 1 END`),

        // Absolute counts for table filtering
        totalAbs: count(maintenanceRequest.id),
        pendingAbs: count(sql`CASE WHEN ${maintenanceRequest.status} = 'pending' THEN 1 END`),
        completedAbs: count(sql`CASE WHEN ${maintenanceRequest.status} = 'completed' THEN 1 END`),
        inProgressAbs: count(sql`CASE WHEN ${maintenanceRequest.status} = 'in-progress' THEN 1 END`),
      })
      .from(maintenanceRequest)
      .where(eq(maintenanceRequest.studentId, studentId));

    const requests = await db.query.maintenanceRequest.findMany({
      ...maintenanceWithRelations,
      where: eq(maintenanceRequest.studentId, studentId),
      orderBy: desc(maintenanceRequest.requestDate),
    });

    return {
      requests,
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
        completed: {
          value: stats?.completedAbs ?? 0,
          percentage: calcChange(stats?.completedThisMonth ?? 0, stats?.completedLastMonth ?? 0),
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

  const updateStatusAndAddResponse = async (
    maintenanceId: number,
    status: MaintenanceStatus,
    responseText: string,
    scope: AdminScope,
  ) => {
    return db
      .transaction(async (tx) => {
        const userId = scope.userId;
        const companyId = scope.companyId!;

        const target = await tx.query.maintenanceRequest.findFirst({
          where: and(
            eq(maintenanceRequest.id, maintenanceId),
            ...applyMaintenanceScope(scope),
          ),
        });

        if (!target) throw new Error("Maintenance request not found or unauthorized access.");

        const [updatedRequest] = await tx
          .update(maintenanceRequest)
          .set({
            status,
            resolutionDate: status === "completed" ? new Date() : null,
          })
          .where(eq(maintenanceRequest.id, maintenanceId))
          .returning();

        const [newResponse] = await tx
          .insert(maintenanceResponse)
          .values({
            maintenanceRequestId: maintenanceId,
            responderId: userId,
            responseText,
            companyId,
          })
          .returning();

        return { updatedRequest, newResponse };
      });
  };

  const addMaintenanceResponse = async (
    maintenanceId: number,
    responderId: number,
    companyId: number,
    responseText: string,
  ) => {
    const [newResponse] = await db
      .insert(maintenanceResponse)
      .values({
        maintenanceRequestId: maintenanceId,
        responderId,
        companyId,
        responseText,
      })
      .returning();

    return newResponse;
  };

  const createMaintenance = async (data: MaintenanceCreate) => {
    const [newRequest] = await db
      .insert(maintenanceRequest)
      .values({
        ...data,
        status: "pending",
      })
      .returning();
    return newRequest;
  };

  const updateMaintenance = async (
    requestId: number,
    studentId: number,
    data: MaintenanceEdit["data"],
  ) => {
    const [updateRequest] = await db
      .update(maintenanceRequest)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(
        eq(maintenanceRequest.id, requestId),
        eq(maintenanceRequest.studentId, studentId),
        eq(maintenanceRequest.status, "pending"),
      ))
      .returning();

    return updateRequest;
  };

  const getMaintenanceByIdForStudent = async (id: number, studentId: number) => {
    const maintenanceRecord = await db.query.maintenanceRequest.findFirst({
      where: and(
        eq(maintenanceRequest.id, id),
        eq(maintenanceRequest.studentId, studentId),
      ),
    });
    return maintenanceRecord;
  };

  return {
    getAllMaintenanceRequests,
    getMaintenanceById,
    getMaintenanceStatusCount,
    updateStatusAndAddResponse,
    addMaintenanceResponse,
    findMaintenanceRequestById,
    getStudentMaintenanceRequests,
    createMaintenance,
    updateMaintenance,
    getMaintenanceByIdForStudent,
  };
}

type MaintenanceWithRelations = Awaited<ReturnType<Awaited<ReturnType<typeof maintenanceQueries>>["getMaintenanceById"]>>;
export type Maintenance = NonNullable<MaintenanceWithRelations>;

export type MaintenanceStats = Awaited<ReturnType<Awaited<ReturnType<typeof maintenanceQueries>>["getMaintenanceStatusCount"]>>;

export type StudentMaintenanceData = Awaited<ReturnType<Awaited<ReturnType<typeof maintenanceQueries>>["getStudentMaintenanceRequests"]>>;
