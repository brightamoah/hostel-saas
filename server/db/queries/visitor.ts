import type { AdminScope, InsertEditVisitor, VisitorCreate } from "~~/shared/types";

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
    const [result] = await db
      .select({
        totalVisitors: count(visitor.id),
        approved: count(sql`CASE WHEN ${visitor.status} = 'approved' THEN 1 END`),
        checkedIn: count(sql`CASE WHEN ${visitor.status} = 'checked-in' THEN 1 END`),
        pending: count(sql`CASE WHEN ${visitor.status} = 'pending' THEN 1 END`),
      })
      .from(visitor)
      .where(and(...applyVisitorScope(scope)));

    return {
      totalVisitors: result?.totalVisitors ?? 0,
      approved: result?.approved ?? 0,
      checkedIn: result?.checkedIn ?? 0,
      pending: result?.pending ?? 0,
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
    const [result] = await db
      .select({
        totalVisitors: count(visitor.id),
        approved: count(sql`CASE WHEN ${visitor.status} = 'approved' THEN 1 END`),
        checkedIn: count(sql`CASE WHEN ${visitor.status} = 'checked-in' THEN 1 END`),
        pending: count(sql`CASE WHEN ${visitor.status} = 'pending' THEN 1 END`),
      })
      .from(visitor)
      .where(eq(visitor.studentId, studentId));

    return {
      totalVisitors: result?.totalVisitors,
      approved: result?.approved,
      checkedIn: result?.checkedIn,
      pending: result?.pending,
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
