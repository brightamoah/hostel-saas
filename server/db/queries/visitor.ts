import type { AdminScope, Allocation, InsertEditVisitor, Period, VisitorCreate } from "~~/shared/types";

import { calcChange, getTimePeriod } from "~~/server/utils/calcChange";
import { useDB } from "~~/server/utils/db";
import { getScopeMode } from "~~/server/utils/permissionScope";
import { and, count, eq, inArray, sql } from "drizzle-orm";

import { allocation, hostelSettings, visitor } from "../schema";

const visitorWithRelations = {
  with: {
    student: {
      columns: {
        phoneNumber: true,
      },
      with: {
        user: {
          columns: {
            name: true,
            email: true,
            image: true,
          },
        },
        allocations: {
          where: {
            status: { in: ["active", "pending"] as Allocation["status"][] },
          },
          with: {
            room: {
              columns: {
                roomNumber: true,
                roomType: true,
                hostelId: true,
              },
              with: {
                hostel: {
                  columns: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    },
    hostel: {
      columns: {
        name: true,
      },
    },
    visitorLogs: {
      orderBy: { timestamp: "desc" },
      with: {
        admin: {
          columns: {},
          with: {
            user: {
              columns: {
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
      },
    },
    admin: {
      columns: {},
      with: {
        user: {
          columns: {
            name: true,
            email: true,
            image: true,
          },
        },
      },
    },
  },
} as const;

export async function visitorQueries() {
  const { db } = useDB();

  const applyVisitorScopeSql = (scope: AdminScope) => {
    const mode = getScopeMode(scope);
    if (mode === "platform") return [];
    if (mode === "company" && scope.companyId) {
      return [eq(visitor.companyId, scope.companyId)];
    }
    if (mode === "hostel" && scope.hostelId) {
      return [eq(visitor.hostelId, scope.hostelId)];
    }
    return [sql`FALSE`];
  };

  const applyVisitorScope = (scope: AdminScope) => {
    const mode = getScopeMode(scope);
    if (mode === "platform") return {};
    if (mode === "company" && scope.companyId) {
      return { companyId: scope.companyId };
    }
    if (mode === "hostel" && scope.hostelId) {
      return { hostelId: scope.hostelId };
    }
    return { RAW: () => sql`FALSE` };
  };

  const getScopedVisitors = async (scope: AdminScope) => {
    return await db.query.visitor.findMany({
      ...visitorWithRelations,
      where: { ...applyVisitorScope(scope) },
      orderBy: { visitDate: "desc" },
    });
  };

  const getVisitorById = async (visitorId: number, scope: AdminScope) => {
    return await db.query.visitor.findFirst({
      ...visitorWithRelations,
      where: {
        id: visitorId,
        ...applyVisitorScope(scope),
      },
    });
  };

  const getVisitorStatusCount = async (scope: AdminScope) => {
    const {
      startOfToday,
      startOfYesterday,
      startOfThisWeek,
      startOfLastWeek,
      startOfThisMonth,
      startOfLastMonth,
    } = getTimePeriod();

    const [result] = await db
      .select({
        totalThisMonth: count(sql`CASE WHEN ${visitor.visitDate} >= ${startOfThisMonth} THEN 1 END`),
        totalLastMonth: count(sql`CASE WHEN ${visitor.visitDate} >= ${startOfLastMonth} AND ${visitor.visitDate} < ${startOfThisMonth} THEN 1 END`),

        approvedThisMonth: count(sql`CASE WHEN ${visitor.status} = 'approved' AND ${visitor.visitDate} >= ${startOfThisMonth} THEN 1 END`),
        approvedLastMonth: count(sql`CASE WHEN ${visitor.status} = 'approved' AND ${visitor.visitDate} >= ${startOfLastMonth} AND ${visitor.visitDate} < ${startOfThisMonth} THEN 1 END`),

        checkedInThisWeek: count(sql`CASE WHEN ${visitor.status} = 'checked-in' AND ${visitor.visitDate} >= ${startOfThisWeek} THEN 1 END`),
        checkedInLastWeek: count(sql`CASE WHEN ${visitor.status} = 'checked-in' AND ${visitor.visitDate} >= ${startOfLastWeek} AND ${visitor.visitDate} < ${startOfThisWeek} THEN 1 END`),

        pendingToday: count(sql`CASE WHEN ${visitor.status} = 'pending' AND ${visitor.visitDate} >= ${startOfToday} THEN 1 END`),
        pendingYesterday: count(sql`CASE WHEN ${visitor.status} = 'pending' AND ${visitor.visitDate} >= ${startOfYesterday} AND ${visitor.visitDate} < ${startOfToday} THEN 1 END`),

        totalAbs: count(visitor.id),
        approvedAbs: count(sql`CASE WHEN ${visitor.status} = 'approved' THEN 1 END`),
        checkedInAbs: count(sql`CASE WHEN ${visitor.status} = 'checked-in' THEN 1 END`),
        pendingAbs: count(sql`CASE WHEN ${visitor.status} = 'pending' THEN 1 END`),
      })
      .from(visitor)
      .where(and(...applyVisitorScopeSql(scope)));

    return {
      totalVisitors: {
        value: result?.totalAbs ?? 0,
        percentage: calcChange(result?.totalThisMonth ?? 0, result?.totalLastMonth ?? 0),
        period: "monthly" as Period,
      },
      approved: {
        value: result?.approvedAbs ?? 0,
        percentage: calcChange(result?.approvedThisMonth ?? 0, result?.approvedLastMonth ?? 0),
        period: "monthly" as Period,
      },
      checkedIn: {
        value: result?.checkedInAbs ?? 0,
        percentage: calcChange(result?.checkedInThisWeek ?? 0, result?.checkedInLastWeek ?? 0),
        period: "weekly" as Period,
      },
      pending: {
        value: result?.pendingAbs ?? 0,
        percentage: calcChange(result?.pendingToday ?? 0, result?.pendingYesterday ?? 0),
        period: "daily" as Period,
      },
    };
  };

  const getVisitorByIds = async (visitorIds: number[], scope: AdminScope) => {
    const visitors = await db
      .query
      .visitor
      .findMany({
        where: {
          id: { in: visitorIds },
          ...applyVisitorScope(scope),
        },
        ...visitorWithRelations,
      });
    return visitors;
  };

  const deleteVisitorsByIds = async (visitorIds: number[], scope: AdminScope) => {
    if (visitorIds.length === 0) return [];

    const deleteResult = await db
      .delete(visitor)
      .where(and(inArray(visitor.id, visitorIds), ...applyVisitorScopeSql(scope)))
      .returning();
    return deleteResult;
  };

  const getVisitorsForStudent = async (studentId: number) => {
    return await db
      .query
      .visitor
      .findMany({
        where: { studentId },
        ...visitorWithRelations,
        orderBy: { visitDate: "desc" },
      });
  };

  const getVisitorStatusCountForStudent = async (studentId: number) => {
    const {
      startOfToday,
      startOfYesterday,
      startOfThisWeek,
      startOfLastWeek,
      startOfThisMonth,
      startOfLastMonth,
    } = getTimePeriod();

    const [result] = await db
      .select({
        totalThisMonth: count(sql`CASE WHEN ${visitor.visitDate} >= ${startOfThisMonth} THEN 1 END`),
        totalLastMonth: count(sql`CASE WHEN ${visitor.visitDate} >= ${startOfLastMonth} AND ${visitor.visitDate} < ${startOfThisMonth} THEN 1 END`),

        approvedThisMonth: count(sql`CASE WHEN ${visitor.status} = 'approved' AND ${visitor.visitDate} >= ${startOfThisMonth} THEN 1 END`),
        approvedLastMonth: count(sql`CASE WHEN ${visitor.status} = 'approved' AND ${visitor.visitDate} >= ${startOfLastMonth} AND ${visitor.visitDate} < ${startOfThisMonth} THEN 1 END`),

        checkedInThisWeek: count(sql`CASE WHEN ${visitor.status} = 'checked-in' AND ${visitor.visitDate} >= ${startOfThisWeek} THEN 1 END`),
        checkedInLastWeek: count(sql`CASE WHEN ${visitor.status} = 'checked-in' AND ${visitor.visitDate} >= ${startOfLastWeek} AND ${visitor.visitDate} < ${startOfThisWeek} THEN 1 END`),

        pendingToday: count(sql`CASE WHEN ${visitor.status} = 'pending' AND ${visitor.visitDate} >= ${startOfToday} THEN 1 END`),
        pendingYesterday: count(sql`CASE WHEN ${visitor.status} = 'pending' AND ${visitor.visitDate} >= ${startOfYesterday} AND ${visitor.visitDate} < ${startOfToday} THEN 1 END`),

        // Keep static absolute totals for general info
        totalAllTime: count(visitor.id),
        approvedAbs: count(sql`CASE WHEN ${visitor.status} = 'approved' THEN 1 END`),
        checkedInAbs: count(sql`CASE WHEN ${visitor.status} = 'checked-in' THEN 1 END`),
        pendingAbs: count(sql`CASE WHEN ${visitor.status} = 'pending' THEN 1 END`),
      })
      .from(visitor)
      .where(eq(visitor.studentId, studentId));

    return {
      totalVisitors: {
        value: result?.totalAllTime ?? 0,
        percentage: calcChange(result?.totalThisMonth ?? 0, result?.totalLastMonth ?? 0),
        period: "monthly" as Period,
      },
      approved: {
        value: result?.approvedAbs ?? 0,
        percentage: calcChange(result?.approvedThisMonth ?? 0, result?.approvedLastMonth ?? 0),
        period: "monthly" as Period,
      },
      checkedIn: {
        value: result?.checkedInAbs ?? 0,
        percentage: calcChange(result?.checkedInThisWeek ?? 0, result?.checkedInLastWeek ?? 0),
        period: "weekly" as Period,
      },
      pending: {
        value: result?.pendingAbs ?? 0,
        percentage: calcChange(result?.pendingToday ?? 0, result?.pendingYesterday ?? 0),
        period: "daily" as Period,
      },
    };
  };

  const getVisitorForStudentById = (visitorId: number) => {
    return db
      .query
      .visitor
      .findFirst({
        ...visitorWithRelations,
        where: { id: visitorId },
      });
  };

  const createVisitor = async (data: VisitorCreate) => {
    const [newVisitor] = await db
      .insert(visitor)
      .values(data)
      .returning();
    return newVisitor;
  };

  const updateVisitorForStudent = async (visitorId: number, data: InsertEditVisitor) => {
    const [updatedVisitor] = await db
      .update(visitor)
      .set(data)
      .where(eq(visitor.id, visitorId))
      .returning();
    return updatedVisitor;
  };

  const checkRoomVisitorLimit = async (roomId: number, hostelId: number, visitDate: string) => {
    const [hSettings] = await db
      .select({ maxVisitorsPerRoom: hostelSettings.maxVisitorsPerRoom })
      .from(hostelSettings)
      .where(eq(hostelSettings.hostelId, hostelId));

    if (hSettings && hSettings.maxVisitorsPerRoom > 0) {
      const roomStudentIds = await db
        .select({ id: allocation.studentId })
        .from(allocation)
        .where(
          and(
            eq(allocation.roomId, roomId),
            inArray(allocation.status, ["active", "pending"])
          )
        );

      const studentIds = roomStudentIds.map((s) => s.id);

      if (studentIds.length === 0) return true; // No students, so limit isn't reached

      const [visitorCount] = await db
        .select({ count: sql<number>`cast(count(*) as integer)` })
        .from(visitor)
        .where(
          and(
            inArray(visitor.studentId, studentIds),
            eq(visitor.visitDate, visitDate),
            inArray(visitor.status, ["pending", "approved", "checked-in"])
          )
        );

      if (visitorCount && visitorCount.count >= hSettings.maxVisitorsPerRoom) {
        throw createError({
          statusCode: 400,
          message: `The maximum limit of ${hSettings.maxVisitorsPerRoom} visitor(s) per room has been reached for this date.`,
        });
      }
    }
    return true;
  };

  return {
    getScopedVisitors,
    getVisitorById,
    getVisitorByIds,
    getVisitorStatusCount,
    deleteVisitorsByIds,
    getVisitorsForStudent,
    getVisitorStatusCountForStudent,
    getVisitorForStudentById,
    createVisitor,
    updateVisitorForStudent,
    checkRoomVisitorLimit,
  };
}

// export type Visitor = NonNullable<Awaited<ReturnType<Awaited<ReturnType<typeof visitorQueries>>["getVisitorById"]>>>;

type VisitorWithRelations = Awaited<ReturnType<Awaited<ReturnType<typeof visitorQueries>>["getVisitorById"]>>;
export type Visitor = NonNullable<VisitorWithRelations>;
export type StudentVisitorStats = NonNullable<Awaited<ReturnType<Awaited<ReturnType<typeof visitorQueries>>["getVisitorStatusCountForStudent"]>>>;

export type VisitorStats = NonNullable<Awaited<ReturnType<Awaited<ReturnType<typeof visitorQueries>>["getVisitorStatusCount"]>>>;
