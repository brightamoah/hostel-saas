import type { AdminScope, InsertEditVisitor, Period, VisitorCreate } from "~~/shared/types";

import { calcChange, getTimePeriod } from "~~/server/utils/calcChange";
import { useDB } from "~~/server/utils/db";
import { and, count, desc, eq, inArray, or, sql } from "drizzle-orm";

import { allocation, visitor, visitorLogs } from "../schema";

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
        allocation: {
          where: or(eq(allocation.status, "active"), eq(allocation.status, "pending")),
          with: {
            room: {
              columns: {
                roomNumber: true,
                building: true,
                roomType: true,
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
      orderBy: desc(visitorLogs.timestamp),
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

  const applyVisitorScope = (scope: AdminScope) => {
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

  const getScopedVisitors = async (scope: AdminScope) => {
    return await db.query.visitor.findMany({
      ...visitorWithRelations,
      where: and(...applyVisitorScope(scope)),
      orderBy: desc(visitor.visitDate),
    });
  };

  const getVisitorById = async (visitorId: number, scope: AdminScope) => {
    return await db.query.visitor.findFirst({
      ...visitorWithRelations,
      where: and(eq(visitor.id, visitorId), ...applyVisitorScope(scope)),
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
      .where(and(...applyVisitorScope(scope)));

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
        where: and(inArray(visitor.id, visitorIds), ...applyVisitorScope(scope)),
        ...visitorWithRelations,
      });
    return visitors;
  };

  const deleteVisitorsByIds = async (visitorIds: number[], scope: AdminScope) => {
    if (visitorIds.length === 0) return [];

    const deleteResult = await db
      .delete(visitor)
      .where(and(inArray(visitor.id, visitorIds), ...applyVisitorScope(scope)))
      .returning();
    return deleteResult;
  };

  const getVisitorsForStudent = async (studentId: number) => {
    return await db.query.visitor.findMany({
      where: eq(visitor.studentId, studentId),
      ...visitorWithRelations,
      orderBy: desc(visitor.visitDate),
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
      })
      .from(visitor)
      .where(eq(visitor.studentId, studentId));

    return {
      total: {
        value: result?.totalThisMonth,
        percentage: calcChange(result?.totalThisMonth ?? 0, result?.totalLastMonth ?? 0),
        period: "monthly" as Period,
      },
      approved: {
        value: result?.approvedThisMonth,
        percentage: calcChange(result?.approvedThisMonth ?? 0, result?.approvedLastMonth ?? 0),
        period: "monthly" as Period,
      },
      checkedIn: {
        value: result?.checkedInThisWeek,
        percentage: calcChange(result?.checkedInThisWeek ?? 0, result?.checkedInLastWeek ?? 0),
        period: "weekly" as Period,
      },
      pending: {
        value: result?.pendingToday,
        percentage: calcChange(result?.pendingToday ?? 0, result?.pendingYesterday ?? 0),
        period: "daily" as Period,
      },
    };
  };

  const getVisitorForStudentById = (visitorId: number) => {
    return db.query.visitor.findFirst({
      ...visitorWithRelations,
      where: eq(visitor.id, visitorId),
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
  };
}

// export type Visitor = NonNullable<Awaited<ReturnType<Awaited<ReturnType<typeof visitorQueries>>["getVisitorById"]>>>;

type VisitorWithRelations = Awaited<ReturnType<Awaited<ReturnType<typeof visitorQueries>>["getVisitorById"]>>;
export type Visitor = NonNullable<VisitorWithRelations>;
export type StudentVisitorStats = NonNullable<Awaited<ReturnType<Awaited<ReturnType<typeof visitorQueries>>["getVisitorStatusCountForStudent"]>>>;

export type VisitorStats = NonNullable<Awaited<ReturnType<Awaited<ReturnType<typeof visitorQueries>>["getVisitorStatusCount"]>>>;
