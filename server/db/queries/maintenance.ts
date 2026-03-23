import type { AdminScope, MaintenanceCreate, MaintenanceEdit, MaintenanceStatus } from "~~/shared/types";

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
    const filters = applyMaintenanceScope(scope);

    const [result] = await db
      .select({
        totalMaintenance: countDistinct(maintenanceRequest.id),
        inProgress: count(sql`CASE WHEN ${maintenanceRequest.status} = 'in-progress' THEN 1 END`),
        assigned: count(sql`CASE WHEN ${maintenanceRequest.status} = 'assigned' THEN 1 END`),
        pending: count(sql`CASE WHEN ${maintenanceRequest.status} = 'pending' THEN 1 END`),
        completed: count(sql`CASE WHEN ${maintenanceRequest.status} = 'completed' THEN 1 END`),
        rejected: count(sql`CASE WHEN ${maintenanceRequest.status} = 'rejected' THEN 1 END`),
      })
      .from(maintenanceRequest)
      .where(and(...filters));

    return {
      totalMaintenance: result?.totalMaintenance,
      inProgress: result?.inProgress,
      assigned: result?.assigned,
      pending: result?.pending,
      completed: result?.completed,
      rejected: result?.rejected,
    };
  };

  const getStudentMaintenanceRequests = async (studentId: number) => {
    const requests = await db.query.maintenanceRequest.findMany({
      ...maintenanceWithRelations,
      where: eq(maintenanceRequest.studentId, studentId),
      orderBy: desc(maintenanceRequest.requestDate),
    });

    const [result] = await db
      .select({
        totalMaintenance: countDistinct(maintenanceRequest.id),
        inProgress: count(sql`CASE WHEN ${maintenanceRequest.status} = 'in-progress' THEN 1 END`),
        assigned: count(sql`CASE WHEN ${maintenanceRequest.status} = 'assigned' THEN 1 END`),
        pending: count(sql`CASE WHEN ${maintenanceRequest.status} = 'pending' THEN 1 END`),
        completed: count(sql`CASE WHEN ${maintenanceRequest.status} = 'completed' THEN 1 END`),
        rejected: count(sql`CASE WHEN ${maintenanceRequest.status} = 'rejected' THEN 1 END`),
      })
      .from(maintenanceRequest)
      .where(eq(maintenanceRequest.studentId, studentId));

    return {
      requests,
      totalMaintenance: result?.totalMaintenance,
      inProgress: result?.inProgress,
      assigned: result?.assigned,
      pending: result?.pending,
      completed: result?.completed,
      rejected: result?.rejected,
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
        const adminId = scope.adminData.id;
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
            responderId: adminId,
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
