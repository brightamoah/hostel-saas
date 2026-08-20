import type { H3Event } from "h3";
import type { AcademicPeriod, AdminScope, AuditContext, NewHostelSettings, Period } from "~~/shared/types";

import { and, asc, desc, eq, exists, gt, inArray, like, or, sql } from "drizzle-orm";
import { calcChange, getTimePeriod } from "~~/server/utils/calcChange";
import { useDB } from "~~/server/utils/db";
import { enqueueApplicationEmail } from "~~/server/utils/emailSender";

import { getScopeMode } from "~~/server/utils/permissionScope";
import { allocation, hostel, hostelSettings, residencyResetBatch, residencyResetLog, room, student, user } from "../schema";
import { auditLogQueries } from "./auditLog";

const roomWithRelations = {
  with: {
    hostel: true,
  },
} as const;

export async function roomQueries(event?: H3Event) {
  const { db } = useDB(event);
  const { logAudit } = await auditLogQueries(event);

  const applyRoomScopeSql = (scope: AdminScope) => {
    const mode = getScopeMode(scope);

    if (mode === "platform") return [];

    if (mode === "company" && scope.companyId) return [eq(room.companyId, scope.companyId)];

    if (mode === "hostel" && scope.hostelId) return [eq(room.hostelId, scope.hostelId)];

    return [sql`FALSE`];
  };

  const applyRoomScope = (scope: AdminScope) => {
    const mode = getScopeMode(scope);

    if (mode === "platform") return {};

    if (mode === "company" && scope.companyId) return { companyId: scope.companyId };

    if (mode === "hostel" && scope.hostelId) return { hostelId: scope.hostelId };

    return { RAW: () => sql`FALSE` };
  };

  // const applyHostelScopeSql = (scope: AdminScope) => {
  //   const mode = getScopeMode(scope);

  //   if (mode === "platform") return [];
  //   if (mode === "company" && scope.companyId) return [eq(hostel.companyId, scope.companyId)];

  //   if (mode === "hostel" && scope.hostelId) return [eq(hostel.id, scope.hostelId)];

  //   return [sql`FALSE`];
  // };

  const applyHostelScope = (scope: AdminScope) => {
    const mode = getScopeMode(scope);

    if (mode === "platform") return {};
    if (mode === "company" && scope.companyId) return { companyId: scope.companyId };

    if (mode === "hostel" && scope.hostelId) return { id: scope.hostelId };

    return { RAW: () => sql`FALSE` };
  };

  // --- STUDENT & pUBLIC QUERIES ---
  const getHostelByCode = async (joinCode: string) => {
    return await db.query.hostel.findFirst({
      where: {
        joinCode,
        status: "active",
      },
      columns: {
        primaryColor: false,
        createdAt: false,
        updatedAt: false,
      },
    });
  };

  const getHostelBySlug = async (slug: string) => {
    const hostelResult = db.query.hostel.findFirst({
      where: {
        slug,
        status: "active",
      },
      columns: {
        primaryColor: false,
        createdAt: false,
        updatedAt: false,
      },
    });

    return hostelResult;
  };

  const getAvailableRoomsForStudent = async (hostelId: number, gender: "male" | "female") => {
    return await db.query.room.findMany({
      ...roomWithRelations,
      where: {
        hostelId,
        allowedGender: { in: [gender, "unassigned", "mixed"] },
        status: { in: ["vacant", "partially occupied"] },
        RAW: table => sql`${table.capacity} - ${table.currentOccupancy} > 0`,
      },
      orderBy: {
        roomNumber: "asc",
      },
    });
  };

  // --- ADMIN QUERIES ---
  const getScopedRooms = async (scope: AdminScope) => {
    return await db.query.room.findMany({
      where: {
        ...applyRoomScope(scope),
      },
      with: {
        hostel: {
          columns: {
            name: true,
          },
        },
      },
      orderBy: { roomNumber: "asc" },
    });
  };

  const getRoomByIdScoped = async (id: number, scope: AdminScope) => {
    return await db.query.room.findFirst({
      where: {
        id,
        ...applyRoomScope(scope),
      },
    });
  };

  const getRoomStatusCount = async (scope: AdminScope) => {
    const { startOfThisMonth, startOfThisWeek } = getTimePeriod();

    const [result] = await db
      .select({
        vacant: sql<number>`COUNT(*) FILTER (WHERE ${room.status} = 'vacant')`,
        fullyOccupied: sql<number>`COUNT(*) FILTER (WHERE ${room.status} = 'fully occupied')`,
        partiallyOccupied: sql<number>`COUNT(*) FILTER (WHERE ${room.status} = 'partially occupied')`,
        underMaintenance: sql<number>`COUNT(*) FILTER (WHERE ${room.status} = 'under maintenance')`,
        reserved: sql<number>`COUNT(*) FILTER (WHERE ${room.status} = 'reserved')`,
        available: sql<number>`COUNT(*) FILTER (WHERE ${room.status} IN ('vacant', 'partially occupied'))`,
        allRooms: sql<number>`COUNT(*)`,
        occupied: sql<number>`COUNT(*) FILTER (WHERE ${room.currentOccupancy} > 0)`,

        prevTotalRooms: sql<number>`COUNT(*) FILTER (WHERE ${room.createdAt} < ${startOfThisMonth})`,
        prevOccupied: sql<number>`COUNT(*) FILTER (WHERE ${room.status} = 'fully occupied' AND ${room.updatedAt} < ${startOfThisMonth})`,
        prevAvailable: sql<number>`COUNT(*) FILTER (WHERE ${room.status} IN ('vacant', 'partially occupied') AND ${room.updatedAt} < ${startOfThisMonth})`,
        prevMaintenance: sql<number>`COUNT(*) FILTER (WHERE ${room.status} = 'under maintenance' AND ${room.updatedAt} < ${startOfThisWeek})`,
      })
      .from(room)
      .where(and(...applyRoomScopeSql(scope)));

    return {
      totalVacantRooms: Number(result?.vacant),
      totalFullyOccupiedRooms: Number(result?.fullyOccupied),
      totalPartiallyOccupiedRooms: Number(result?.partiallyOccupied),
      totalUnderMaintenance: Number(result?.underMaintenance),
      totalReservedRooms: Number(result?.reserved),
      totalAvailableRooms: Number(result?.available),
      totalRooms: Number(result?.allRooms),
      totalOccupiedRooms: Number(result?.occupied),
      totalRoomsNew: {
        value: Number(result?.allRooms),
        percentage: calcChange(Number(result?.allRooms), Number(result?.prevTotalRooms)),
        period: "monthly" as Period,
      },
      occupiedRooms: {
        value: Number(result?.occupied),
        percentage: calcChange(Number(result?.occupied), Number(result?.prevOccupied)),
        period: "monthly" as Period,
      },
      availableRooms: {
        value: Number(result?.available),
        percentage: calcChange(Number(result?.available), Number(result?.prevAvailable)),
        period: "monthly" as Period,
      },
      maintenanceRooms: {
        value: Number(result?.underMaintenance),
        percentage: calcChange(Number(result?.underMaintenance), Number(result?.prevMaintenance)),
        period: "weekly" as Period,
      },
    };
  };

  const checkActiveOrPendingAllocation = async (studentId: number) => {
    const activeAllocation = await db
      .query
      .allocation
      .findFirst({
        where: {
          studentId,
          status: { in: ["active", "pending"] },
        },
        columns: {
          id: true,
          roomId: true,
          status: true,
        },
      });
    return activeAllocation;
  };

  const getAllRooms = async () => {
    const rooms = await db
      .query
      .room
      .findMany({
        limit: 100,
        orderBy: { roomNumber: "asc" },
      });
    return rooms;
  };

  const getRoomsByIds = async (ids: number[]) => {
    const rooms = await db
      .query
      .room
      .findMany({ where: { id: { in: ids } } });
    return rooms;
  };

  const getOccupiedRoomsCount = async () => {
    const count = await db.query.room
      .findMany()
      .then(rooms => rooms.filter(r => r.currentOccupancy > 0).length);
    return count;
  };

  const getRoomsUnderMaintenance = async () => {
    const rooms = await db
      .query
      .room
      .findMany({ where: { status: "under maintenance" } });
    return rooms;
  };

  const getOccupiedRooms = async () => {
    const rooms = await db
      .select()
      .from(room)
      .where(gt(room.currentOccupancy, 0));
    return rooms;
  };

  const getExistingRoomByRoomNumberAndHostel = async (roomNumber: string, hostelId: number) => {
    const existingRoom = await db
      .query
      .room
      .findFirst({
        where: {
          roomNumber,
          hostelId,
        },
      });
    return existingRoom;
  };

  const deleteRoomsByIds = async (ids: number[], scope: AdminScope, ctx: AuditContext) => {
    if (ids.length === 0) return [];

    return await db.transaction(async (tx) => {
      const before = await tx
        .query
        .room
        .findMany({
          where: {
            id: { in: ids },
            ...applyRoomScope(scope),
          },
        });

      if (!before.length) return [];

      const deleted = await tx
        .delete(room)
        .where(and(inArray(room.id, ids), ...applyRoomScopeSql(scope)))
        .returning();

      if (deleted.length) {
        await logAudit(tx, ctx, {
          action: "room.delete_bulk",
          actionType: "DELETE",
          entityType: "room",
          entityId: null,
          description: `${ctx.actor.actorType} with ID ${ctx.actor.actorUserId} deleted ${deleted.length} rooms with IDs: ${deleted.map(r => r.id).join(", ")}`,
          before,
          after: null,
        });
      }
    });
  };

  const editRoomById = async (
    roomId: number,
    data: Partial<typeof room.$inferInsert>,
    scope: AdminScope,
    ctx: AuditContext,
  ) => {
    return await db.transaction(async (tx) => {
      const targetRoom = await tx
        .query
        .room
        .findFirst({
          where: {
            id: roomId,
            ...applyRoomScope(scope),
          },
        });

      if (!targetRoom) return null;

      const [updatedRoom] = await tx
        .update(room)
        .set({ ...data, updatedAt: new Date() })
        .where(and(eq(room.id, roomId), ...applyRoomScopeSql(scope)))
        .returning();

      if (updatedRoom) {
        await logAudit(tx, ctx, {
          action: "room.update",
          actionType: "UPDATE",
          entityType: "room",
          entityId: updatedRoom.id,
          description: `${ctx.actor.actorType} with ID ${ctx.actor.actorUserId} updated room with ID ${updatedRoom.id}`,
          before: targetRoom,
          after: updatedRoom,
          diff: computeAuditDiff(redact(targetRoom), redact(updatedRoom)),
        });
      }

      return updatedRoom;
    });
  };

  const getHostelById = async (hostelId: number) => {
    const hostel = await db
      .query
      .hostel
      .findFirst({
        where: { id: hostelId },
        columns: {
          name: true,
          address: true,
          logoUrl: true,
          primaryColor: true,
          slug: true,
          supportEmail: true,
          supportPhone: true,
        },
      });
    return hostel;
  };

  const getAllHostels = async (gender: "male" | "female") => {
    const hostels = await db
      .query
      .hostel
      .findMany({
        where: {
          status: "active",
          RAW: (hostel, { sql }) => sql`EXISTS (
          SELECT 1 FROM ${room}
          WHERE ${room.hostelId} = ${hostel.id}
          AND ${room.allowedGender} IN (${gender}, 'unassigned', 'mixed')
          AND ${room.status} IN ('vacant', 'partially occupied')
          AND ${room.capacity} > ${room.currentOccupancy}
          )`,
        },
        columns: {
          id: true,
          name: true,
          address: true,
          logoUrl: true,
          status: true,
          companyId: true,
          slug: true,
          joinCode: true,
        },

        // (room, { inArray }) => inArray(room.allowedGender, [gender, "unassigned", "mixed"])
        with: {
          rooms: {
            where: {
              allowedGender: {
                in: [gender, "unassigned", "mixed"],
              },
            },
            columns: {
              amountPerYear: true,
              roomType: true,
              allowedGender: true,
              status: true,
              currentOccupancy: true,
              capacity: true,
            },
          },
        },
        extras: {
          minimumRoomPrice: (hostel, { sql }) => sql<number>`SELECT MIN(amount_per_year) FROM ${room} WHERE ${room.hostelId} = ${hostel.id} AND ${room.allowedGender} IN (${gender}, 'unassigned', 'mixed') AND ${room.status} IN ('vacant', 'partially occupied') AND ${room.capacity} > ${room.currentOccupancy}`,

          maximumRoomPrice: (hostel, { sql }) => sql<number>`SELECT MAX(amount_per_year) FROM ${room} WHERE ${room.hostelId} = ${hostel.id} AND ${room.allowedGender} IN (${gender}, 'unassigned', 'mixed') AND ${room.status} IN ('vacant', 'partially occupied') AND ${room.capacity} > ${room.currentOccupancy}`,
        },
      });
    return hostels;
  };

  const getScopedHostels = (hostelId?: number) => {
    let query = db
      .select()
      .from(hostel)
      .where(eq(hostel.status, "active"))
      .$dynamic();

    if (hostelId) query = query.where(eq(hostel.id, hostelId));

    return query;
  };

  const addNewRoom = async (
    data: typeof room.$inferInsert,
    scope: AdminScope,
    ctx: AuditContext,
  ) => {
    return await db.transaction(async (tx) => {
      if (!scope.isPlatformAdmin) {
        const targetHostel = await tx
          .query
          .hostel
          .findFirst({
            where: {
              id: data.hostelId,
              ...applyHostelScope(scope),
            },
          });

        if (!targetHostel) throw createError({ statusCode: 403, message: "Unauthorized hostel assignment" });
      }

      const [newRoom] = await tx.insert(room).values(data).returning();

      if (newRoom) {
        await logAudit(tx, ctx, {
          action: "room.create",
          actionType: "CREATE",
          entityType: "room",
          entityId: newRoom.id,
          description: `${ctx.actor.actorType} with ID ${ctx.actor.actorUserId} created room with ID ${newRoom.id}`,
          before: null,
          after: newRoom,
        });
      }

      return newRoom;
    });
  };

  const getAllHostelsScoped = async (scope: AdminScope) => {
    const mode = getScopeMode(scope);

    if (mode === "platform") return await db.query.hostel.findMany();

    if (mode === "company") {
      return await db.query.hostel.findMany({
        where: { companyId: scope.companyId! },
      });
    }

    if (mode === "hostel" && scope.hostelId) {
      return await db.query.hostel.findMany({
        where: { id: scope.hostelId },
      });
    }

    return [];
  };

  const cancelAllocation = async (
    allocationId: number,
    scope: AdminScope,
    ctx: AuditContext,
  ) => {
    return await db.transaction(async (tx) => {
      const targetAllocation = await tx
        .query
        .allocation
        .findFirst({
          where: { id: allocationId },
          with: { room: true },
        });

      if (!targetAllocation) throw new Error("Allocation not found");

      const mode = getScopeMode(scope);
      const isAuthorized
        = mode === "platform"
          || (mode === "company" && targetAllocation?.room?.companyId === scope.companyId)
          || (mode === "hostel" && targetAllocation?.room?.hostelId === scope.hostelId);

      if (!isAuthorized) throw new Error("Unauthorized access to allocation");

      if (targetAllocation.status === "cancelled") throw new Error("Allocation is already cancelled");

      if (targetAllocation.status === "expired") throw new Error("Cannot cancel an expired allocation");

      const [updatedAllocation] = await tx
        .update(allocation)
        .set({
          status: "cancelled",
          updatedAt: new Date(),
        })
        .where(eq(allocation.id, allocationId))
        .returning();

      if (!updatedAllocation) {
        throw createError({
          status: 500,
          message: "Failed to cancel allocation",
        });
      }

      const shouldDecrement = ["active", "pending"].includes(targetAllocation.status);

      if (shouldDecrement) {
        const currentRoom = targetAllocation.room;

        if (!currentRoom) {
          throw createError({
            status: 500,
            message: "Associated room not found for allocation",
          });
        }

        const newOccupancy = Math.max(0, currentRoom.currentOccupancy - 1);

        let newStatus = currentRoom.status;

        if (currentRoom.status !== "under maintenance") {
          newStatus
            = newOccupancy === 0
              ? "vacant"
              : newOccupancy < currentRoom.capacity
                ? "partially occupied"
                : "fully occupied";
        }

        const [updatedRoom] = await tx
          .update(room)
          .set({
            currentOccupancy: newOccupancy,
            status: newStatus,
            allowedGender: sql`CASE WHEN ${room.currentOccupancy} - 1 <= 0 THEN 'unassigned' ELSE ${room.allowedGender} END`,
            updatedAt: new Date(),
          })
          .where(eq(room.id, targetAllocation.roomId))
          .returning();

        if (!updatedRoom) {
          throw createError({
            status: 500,
            message: "Failed to update room occupancy",
          });
        }

        await logAudit(tx, ctx, {
          action: "room.update",
          actionType: "UPDATE",
          entityType: "room",
          entityId: currentRoom.id,
          description: `${ctx.actor.actorType} with ID ${ctx.actor.actorUserId} updated room with ID ${currentRoom.id} due to allocation cancellation`,
          before: currentRoom,
          after: updatedRoom,
          diff: computeAuditDiff(redact(currentRoom), redact(updatedRoom)),
        });
      }

      await logAudit(tx, ctx, {
        action: "allocation.cancel",
        actionType: "CANCEL_ALLOCATION",
        entityType: "allocation",
        entityId: updatedAllocation.id,
        description: `${ctx.actor.actorType} with ID ${ctx.actor.actorUserId} cancelled allocation with ID ${updatedAllocation.id}`,
        before: targetAllocation,
        after: updatedAllocation,
        diff: computeAuditDiff(redact(targetAllocation), redact(updatedAllocation)),
      });

      return updatedAllocation;
    });
  };

  const getRoomsInHostel = async (hostelId: number) => {
    const rooms = await db.query.room.findMany({
      columns: {
        id: true,
        roomNumber: true,
        floor: true,
      },
      where: { hostelId },
    });
    return rooms;
  };

  const getAllocationByStudentId = async (studentId: number) => {
    const allocations = await db.query.allocation.findFirst({
      where: {
        studentId,
        status: "active",
      },
      with: {
        room: {
          columns: {
            id: true,
            roomNumber: true,
            hostelId: true,
          },
          with: {
            hostel: {
              columns: {
                name: true,
                companyId: true,
              },
            },
          },
        },
        student: {
          columns: {
            id: true,
            residencyStatus: true,
          },
          with: {
            user: {
              columns: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });
    return allocations;
  };

  const getRoomTypes = async (hostelId: number, gender: "male" | "female") => {
    const roomTypesResult = await db
      .select({
        type: room.roomType,
        price: room.amountPerYear,
        count: sql<number>`count(${room.id})`,
      })
      .from(room)
      .where(
        and(
          eq(room.hostelId, hostelId),
          inArray(room.allowedGender, [gender, "unassigned", "mixed"]),
          eq(room.status, "vacant"),
        ),
      )
      .groupBy(room.roomType, room.amountPerYear);

    return roomTypesResult;
  };

  const getGenderSpecificRoomStats = async (hostelId: number, gender: "male" | "female") => {
    const [stats] = await db
      .select({
        totalRooms: sql<number>`COUNT(*)`,
        availableRooms: sql<number>`COUNT(*) FILTER (WHERE ${room.status} IN ('vacant', 'partially occupied') AND ${room.currentOccupancy} < ${room.capacity} AND ${room.allowedGender} IN (${gender}, 'unassigned', 'mixed'))`,
        minimumPrice: sql<number>`COALESCE(MIN(${room.amountPerYear}) FILTER (WHERE ${room.allowedGender} IN (${gender}, 'unassigned', 'mixed')), 0)`,
        maximumPrice: sql<number>`COALESCE(MAX(${room.amountPerYear}) FILTER (WHERE ${room.allowedGender} IN (${gender}, 'unassigned', 'mixed')), 0)`,
      })
      .from(room)
      .where(eq(room.hostelId, hostelId));

    return stats;
  };

  const createNewHostel = async (
    data: typeof hostel.$inferInsert,
    scope: AdminScope,
    ctx: AuditContext,
  ) => {
    const canCreate = canManageHostels(scope);

    if (!canCreate) {
      throw createError({
        statusCode: 403,
        message: "Unauthorized to create hostel",
      });
    }

    return await db.transaction(async (tx) => {
      const [newHostel] = await tx.insert(hostel).values(data).returning();

      if (newHostel) {
        await logAudit(tx, ctx, {
          action: "hostel.create",
          actionType: "CREATE",
          entityType: "hostel",
          entityId: newHostel.id,
          description: `${ctx.actor.actorType} with ID ${ctx.actor.actorUserId} created hostel with ID ${newHostel.id}`,
          before: null,
          after: newHostel,
        });
      }

      return newHostel;
    });
  };

  const getHostelByIdScoped = async (id: number, scope: AdminScope) => {
    const hostelResult = await db.query.hostel.findFirst({
      where: {
        id,
        ...applyHostelScope(scope),
      },
      columns: {
        id: true,
        name: true,
        address: true,
        contactNumber: true,
        email: true,
        primaryColor: true,
        logoUrl: true,
        status: true,
        companyId: true,
        slug: true,
        joinCode: true,
      },
    });
    return hostelResult;
  };

  const getHostelsPaginated = async (params: {
    gender: "male" | "female";
    searchTerm?: string;
    sort?: "price_asc" | "price_desc" | "availability" | "name";
    page?: number;
    limit?: number;
  }) => {
    const { gender, searchTerm, sort = "availability", page = 1, limit = 20 } = params;

    const offset = (page - 1) * limit;

    const searchCondition = searchTerm?.trim()
      ? or(like(hostel.name, `%${searchTerm}%`), like(hostel.address, `%${searchTerm}%`))
      : undefined;

    const roomStatsSubquery = db
      .select({
        hostelId: room.hostelId,
        availableRooms:
          sql<number>`COUNT(*) FILTER (WHERE ${room.status} IN ('vacant', 'partially occupied') AND ${room.currentOccupancy} < ${room.capacity} AND ${room.allowedGender} IN (${gender}, 'unassigned', 'mixed'))`.as(
            "availableRooms",
          ),
        minimumRoomPrice:
          sql<number>`MIN(${room.amountPerYear}) FILTER (WHERE ${room.allowedGender} IN (${gender}, 'unassigned', 'mixed'))`.as(
            "minimumRoomPrice",
          ),
        maximumRoomPrice:
          sql<number>`MAX(${room.amountPerYear}) FILTER (WHERE ${room.allowedGender} IN (${gender}, 'unassigned', 'mixed'))`.as(
            "maximumRoomPrice",
          ),
        roomTypes: sql<
          string[]
        >`ARRAY_AGG(DISTINCT ${room.roomType}::text) FILTER (WHERE ${room.allowedGender} IN (${gender}, 'unassigned', 'mixed'))`.as(
          "roomTypes",
        ),
        totalCapacity:
          sql<number>`SUM(${room.capacity}) FILTER (WHERE ${room.allowedGender} IN (${gender}, 'unassigned', 'mixed'))`.as(
            "totalCapacity",
          ),
        currentOccupancy:
          sql<number>`SUM(${room.currentOccupancy}) FILTER (WHERE ${room.allowedGender} IN (${gender}, 'unassigned', 'mixed'))`.as(
            "currentOccupancy",
          ),
      })
      .from(room)
      .groupBy(room.hostelId)
      .as("room_stats");

    const whereConditions = [
      eq(hostel.status, "active"),
      exists(
        db
          .select()
          .from(room)
          .where(and(eq(room.hostelId, hostel.id), inArray(room.allowedGender, [gender, "unassigned", "mixed"]))),
      ),
    ];

    if (searchCondition) whereConditions.push(searchCondition);

    let orderByClause;
    switch (sort) {
      case "price_asc":
        orderByClause = asc(sql`COALESCE(${roomStatsSubquery.minimumRoomPrice}, 0)`);
        break;
      case "price_desc":
        orderByClause = desc(sql`COALESCE(${roomStatsSubquery.minimumRoomPrice}, 0)`);
        break;
      case "name":
        orderByClause = asc(hostel.name);
        break;
      case "availability":
      default:
        orderByClause = desc(sql`COALESCE(${roomStatsSubquery.availableRooms}, 0)`);
        break;
    }

    const hostelsQuery = db
      .select({
        id: hostel.id,
        name: hostel.name,
        slug: hostel.slug,
        address: hostel.address,
        logoUrl: hostel.logoUrl,
        status: hostel.status,
        companyId: hostel.companyId,
        joinCode: hostel.joinCode,
        minimumRoomPrice: sql<number>`COALESCE(${roomStatsSubquery.minimumRoomPrice}, 0)`.as(
          "minimumRoomPrice",
        ),
        maximumRoomPrice: sql<number>`COALESCE(${roomStatsSubquery.maximumRoomPrice}, 0)`.as(
          "maximumRoomPrice",
        ),
        availableRooms: sql<number>`COALESCE(${roomStatsSubquery.availableRooms}, 0)`.as(
          "availableRooms",
        ),
        roomTypes: sql<string[]>`COALESCE(${roomStatsSubquery.roomTypes}, ARRAY[]::text[])`.as(
          "roomTypes",
        ),
        totalCapacity: sql<number>`COALESCE(${roomStatsSubquery.totalCapacity}, 0)`.as(
          "totalCapacity",
        ),
        currentOccupancy: sql<number>`COALESCE(${roomStatsSubquery.currentOccupancy}, 0)`.as(
          "currentOccupancy",
        ),
      })
      .from(hostel)
      .leftJoin(roomStatsSubquery, eq(hostel.id, roomStatsSubquery.hostelId))
      .where(and(...whereConditions))
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);

    const countQuery = db
      .select({ total: sql<number>`COUNT(DISTINCT ${hostel.id})` })
      .from(hostel)
      .leftJoin(roomStatsSubquery, eq(hostel.id, roomStatsSubquery.hostelId))
      .where(and(...whereConditions));

    const [hostels, [countResult]] = await Promise.all([hostelsQuery, countQuery]);

    return {
      data: hostels,
      total: Number(countResult?.total) || 0,
      page,
      limit,
    };
  };

  const updateHostelSettings = async (
    hostelId: number,
    hostelCompanyId: number,
    data: Partial<NewHostelSettings>,
    scope: AdminScope,
    auditCtx: AuditContext,
  ) => {
    return await db.transaction(async (tx) => {
      const existingHostelSettings = await tx
        .query
        .hostelSettings
        .findFirst({
          where: { hostelId, companyId: scope.companyId ?? hostelCompanyId },
          columns: { id: true },
        });

      if (existingHostelSettings) {
        const [updated] = await tx
          .update(hostelSettings)
          .set({ ...data, updatedAt: new Date() })
          .where(eq(hostelSettings.hostelId, hostelId))
          .returning();

        await logAudit(tx, auditCtx, {
          action: "HostelSettings.update",
          actionType: "UPDATE",
          entityType: "hostel_settings",
          description: "Updated the hostel settings",
          before: existingHostelSettings,
          after: updated,
          diff: computeAuditDiff(redact(existingHostelSettings), redact(updated)),
          entityId: updated?.id,
        });
      }
      else {
        const [insert] = await tx
          .insert(hostelSettings)
          .values({ hostelId, companyId: hostelCompanyId, ...data })
          .returning();

        await logAudit(tx, auditCtx, {
          action: "HostelSettings.update",
          actionType: "CREATE",
          entityType: "hostel_settings",
          description: "Created hostel settings",
          before: null,
          after: insert,
          entityId: insert?.id,
        });
      }

      return true;
    });
  };

  const updateHostelSubaccount = async (
    hostelId: number,
    companyId: number,
    isToggleOnly: boolean,
    toggleParse: HostelSubaccountToggleSchema,
    data: Partial<NewHostelSettings>,
    scope: AdminScope,
    auditCtx: AuditContext,
  ) => {
    return await db.transaction(async (tx) => {
      const existing = await tx
        .query
        .hostelSettings
        .findFirst({
          where: { hostelId, companyId: scope.companyId ?? companyId },
          columns: {
            id: true,
            paystackSubaccountCode: true,
            paystackIsVerified: true,
            useHostelSubaccount: true,
          },
        });

      if (!existing?.paystackSubaccountCode) {
        throw createError({
          statusCode: 404,
          message: "No existing subaccount found for this hostel. Use the create endpoint to set up a subaccount first.",
        });
      }

      if (isToggleOnly) {
        if (toggleParse.useHostelSubaccount && !existing.paystackIsVerified) {
          throw createError({
            statusCode: 422,
            message: "Cannot activate routing to an unverified subaccount",
          });
        }

        const [updated] = await tx
          .update(hostelSettings)
          .set({
            useHostelSubaccount: toggleParse.useHostelSubaccount,
            updatedAt: new Date(),
          })
          .where(eq(hostelSettings.hostelId, hostelId))
          .returning();

        await logAudit(tx, auditCtx, {
          action: "HostelSettings.toggleSubaccount",
          actionType: "UPDATE",
          entityType: "hostel_settings",
          description: `${toggleParse.useHostelSubaccount ? "Activated" : "Deactivated"} routing to hostel subaccount`,
          before: existing,
          after: { ...existing, useHostelSubaccount: updated?.useHostelSubaccount },
          diff: computeAuditDiff(redact(existing), redact({ ...existing, useHostelSubaccount: updated?.useHostelSubaccount })),
          entityId: existing.id,
        });

        return updated?.useHostelSubaccount;
      }
      else {
        const [updated] = await tx
          .update(hostelSettings)
          .set({
            ...data,
            updatedAt: new Date(),
          })
          .where(eq(hostelSettings.hostelId, hostelId))
          .returning();

        await logAudit(tx, auditCtx, {
          action: "HostelSettings.updateSubaccount",
          actionType: "UPDATE",
          entityType: "hostel_settings",
          description: "Updated hostel Paystack subaccount details",
          before: existing,
          after: updated,
          diff: computeAuditDiff(redact(existing), redact(updated)),
          entityId: existing.id,
        });

        return updated;
      }
    });
  };

  const getHostelSettings = async (hostelId: number) => {
    return await db.query.hostelSettings.findFirst({
      where: { hostelId },
      // columns: {
      //   paystackAccountNumber: false,
      // },
    });
  };

  const createHostelSubaccount = async (
    hostelId: number,
    companyId: number,
    scope: AdminScope,
    data: CreateSubaccountSchema,
    auditCtx: AuditContext,
  ) => {
    const preCheck = await db.query.hostelSettings.findFirst({
      where: { hostelId, companyId: scope.companyId ?? companyId },
      columns: { paystackSubaccountCode: true },
    });

    if (preCheck?.paystackSubaccountCode) {
      throw createError({
        statusCode: 409,
        message: "A Paystack subaccount already exists for this hostel. Use the update endpoint instead.",
      });
    }

    const subaccount = await createPaystackSubaccount(data);

    if (!subaccount) {
      throw createError({
        statusCode: 500,
        message: "Failed to create Paystack subaccount. Please try again.",
      });
    }

    return await db.transaction(async (tx) => {
      const existing = await tx.query.hostelSettings.findFirst({
        where: {
          hostelId,
          companyId: scope.companyId ?? companyId,
        },
        columns: { id: true, paystackSubaccountCode: true },
      });

      if (existing?.paystackSubaccountCode) {
        throw createError({
          statusCode: 409,
          message: "A Paystack subaccount already exists for this hostel. Use the update endpoint instead.",
        });
      }

      const paystackFields = {
        paystackSubaccountCode: subaccount.subaccountCode,
        paystackSubaccountId: String(subaccount.id),
        paystackBusinessName: subaccount.businessName,
        paystackBankCode: data.settlementBank,
        paystackAccountNumber: data.accountNumber,
        paystackAccountType: data.accountType,
        paystackPercentageCharge: data.percentageCharge,
        paystackIsVerified: true,
        useHostelSubaccount: false,
      } as const;

      const [created] = existing
        ? await tx
            .update(hostelSettings)
            .set({ ...paystackFields, updatedAt: new Date() })
            .where(eq(hostelSettings.hostelId, hostelId))
            .returning()
        : await tx
            .insert(hostelSettings)
            .values({ hostelId, companyId, ...paystackFields })
            .returning();

      await logAudit(tx, auditCtx, {
        action: existing ? "HostelSettings.updateSubaccount" : "HostelSettings.createSubaccount",
        actionType: existing ? "UPDATE" : "CREATE",
        entityType: "hostel_settings",
        description: existing ? "Updated the hostel subaccount settings" : "Created a new hostel subaccount",
        before: existing ? redact(existing) : null,
        after: redact(created),
        entityId: created?.id,
        diff: existing ? computeAuditDiff(redact(existing), redact(created)) : null,
      });

      return subaccount;
    });
  };

  const previewResidencyReset = async (params: {
    hostelId: number;
    academicYear?: string;
    academicPeriod?: string;
  }) => {
    const conditions = [
      eq(allocation.hostelId, params.hostelId),
      eq(allocation.status, "active"),
    ];

    if (params.academicYear) {
      conditions.push(eq(allocation.academicYear, params.academicYear));
    }
    if (params.academicPeriod) {
      conditions.push(eq(allocation.academicPeriod, params.academicPeriod as any));
    }

    const activeAllocations = await db
      .select({
        allocationId: allocation.id,
        studentId: allocation.studentId,
        studentName: user.name,
        studentEmail: user.email,
        roomId: room.id,
        roomNumber: room.roomNumber,
        currentOccupancy: room.currentOccupancy,
      })
      .from(allocation)
      .innerJoin(student, eq(allocation.studentId, student.id))
      .innerJoin(user, eq(student.userId, user.id))
      .innerJoin(room, eq(allocation.roomId, room.id))
      .where(and(...conditions));

    const affectedRoomIds = [...new Set(activeAllocations.map(a => a.roomId))];
    const freedRoomsCount = activeAllocations.filter(a => a.currentOccupancy === 1).length;
    const partiallyVacatedRoomsCount = affectedRoomIds.length - freedRoomsCount;

    return {
      totalAffectedStudents: activeAllocations.length,
      totalAffectedRooms: affectedRoomIds.length,
      roomsFreedCount: freedRoomsCount,
      roomsPartiallyVacatedCount: partiallyVacatedRoomsCount,
      sampleAllocations: activeAllocations.slice(0, 10),
    };
  };

  const resetHostelResidency = async (params: {
    hostelId: number;
    academicYear?: string;
    academicPeriod?: AcademicPeriod;
    idempotencyKey: string;
    triggerSource: "manual" | "cron" | "checkout";
    triggeredByUserId?: number;
    reason?: string;
    studentId?: number;
    auditContext?: AuditContext;
  }) => {
    const existingBatch = await db
      .query
      .residencyResetBatch
      .findFirst({
        where: {
          idempotencyKey: params.idempotencyKey,
        },
      });

    if (existingBatch) {
      return {
        batchId: existingBatch.id,
        alreadyProcessed: true,
        status: existingBatch.status,
        rollbackDeadline: existingBatch.rollbackDeadline,
      };
    }

    try {
      await db.execute(sql`SELECT pg_advisory_lock(${params.hostelId})`);
    }
    catch (lockError) {
      console.warn("Could not acquire advisory lock for hostel", params.hostelId, lockError);
    }

    try {
      const rollbackDeadline = new Date(Date.now() + 72 * 60 * 60 * 1000);

      const result = await db.transaction(async (txn) => {
        const [batch] = await txn
          .insert(residencyResetBatch)
          .values({
            hostelId: params.hostelId,
            triggerSource: params.triggerSource,
            triggeredBy: params.triggeredByUserId ?? null,
            academicYear: params.academicYear ?? null,
            academicPeriod: params.academicPeriod,
            idempotencyKey: params.idempotencyKey,
            reason: params.reason,
            status: "committed",
            rollbackDeadline,
            createdAt: new Date(),
          })
          .returning();

        if (!batch) {
          throw new Error("Failed to create residency reset batch");
        }

        const conditions = [
          eq(allocation.hostelId, params.hostelId),
          eq(allocation.status, "active"),
        ];

        if (params.academicYear) {
          conditions.push(eq(allocation.academicYear, params.academicYear));
        }
        if (params.academicPeriod) {
          conditions.push(eq(allocation.academicPeriod, params.academicPeriod as any));
        }
        if (params.studentId) {
          conditions.push(eq(allocation.studentId, params.studentId));
        }

        const activeAllocations = await txn
          .select({
            allocationId: allocation.id,
            studentId: allocation.studentId,
            userId: user.id,
            userName: user.name,
            userEmail: user.email,
            roomId: room.id,
            roomNumber: room.roomNumber,
            currentOccupancy: room.currentOccupancy,
            roomStatus: room.status,
            allowedGender: room.allowedGender,
            version: room.version,
          })
          .from(allocation)
          .innerJoin(student, eq(allocation.studentId, student.id))
          .innerJoin(user, eq(student.userId, user.id))
          .innerJoin(room, eq(allocation.roomId, room.id))
          .where(and(...conditions));

        if (!activeAllocations.length) {
          return {
            batchId: batch?.id,
            affectedAllocationsCount: 0,
            roomsFreedCount: 0,
            rollbackDeadline: batch?.rollbackDeadline,
          };
        }

        const nextAllocationStatus = params.triggerSource === "cron" ? "expired" : "expired";

        const roomMap = new Map<number, {
          currentOccupancy: number;
          roomStatus: (typeof room.status.enumValues)[number];
          allowedGender: (typeof room.allowedGender.enumValues)[number];
          version: number;
          decrementCount: number;
        }>();

        for (const item of activeAllocations) {
          await txn
            .insert(residencyResetLog)
            .values({
              batchId: batch.id,
              allocationId: item.allocationId,
              roomId: item.roomId,
              studentId: item.studentId,
              previousAllocationStatus: "active",
              previousRoomOccupancy: item.currentOccupancy,
              previousRoomStatus: item.roomStatus,
              previousAllowedGender: item.allowedGender,
              roomVersionAfterReset: item.version + 1,
            });

          await txn
            .update(allocation)
            .set({
              status: nextAllocationStatus,
            })
            .where(eq(allocation.id, item.allocationId));

          if (!roomMap.has(item.roomId)) {
            roomMap.set(item.roomId, {
              currentOccupancy: item.currentOccupancy,
              roomStatus: item.roomStatus,
              allowedGender: item.allowedGender,
              version: item.version,
              decrementCount: 0,
            });
          }
          roomMap.get(item.roomId)!.decrementCount += 1;

          await enqueueApplicationEmail(
            event,
            {
              to: { name: item.userName, email: item.userEmail },
              subject: "Hostel Residency Tenure Update",
              html: `<p>Hello ${item.userName},</p><p>Your residency status for room ${item.roomNumber} has been updated to <strong>${nextAllocationStatus}</strong>.</p>`,
              text: `Hello ${item.userName}, your residency status for room ${item.roomNumber} has been updated to ${nextAllocationStatus}.`,
              recipientUserId: item.userId,
              isTransactional: true,
            },
            txn,
          );
        }

        let roomsFreedCount = 0;
        for (const [roomId, roomData] of roomMap.entries()) {
          const newOccupancy = Math.max(0, roomData.currentOccupancy - roomData.decrementCount);
          const newAllowedGender = newOccupancy === 0 ? "unassigned" : roomData.allowedGender;
          const newStatus = newOccupancy === 0 ? "vacant" : "partially occupied";

          if (newOccupancy === 0) roomsFreedCount++;

          await txn
            .update(room)
            .set({
              currentOccupancy: newOccupancy,
              allowedGender: newAllowedGender,
              status: newStatus,
              version: sql`${room.version} + 1`,
            })
            .where(eq(room.id, roomId));
        }

        if (params.auditContext) {
          await logAudit(
            txn,
            params.auditContext,
            {
              actionType: "STATUS_CHANGE",
              action: `residency_reset_${params.triggerSource}`,
              entityType: "hostel",
              entityId: params.hostelId,
              description: `Residency reset triggered via ${params.triggerSource}. Affected ${activeAllocations.length} allocations across ${roomMap.size} rooms.`,
            },
          );
        }

        return {
          batchId: batch.id,
          affectedAllocationsCount: activeAllocations.length,
          roomsFreedCount,
          rollbackDeadline: batch.rollbackDeadline,
        };
      });

      return result;
    }
    finally {
      try {
        await db.execute(sql`SELECT pg_advisory_unlock(${params.hostelId})`);
      }
      catch { }
    }
  };

  const rollbackResidencyReset = async (params: {
    batchId: string;
    adminUserId: number;
    auditContext?: AuditContext;
  }) => {
    const [batch] = await db
      .select()
      .from(residencyResetBatch)
      .where(eq(residencyResetBatch.id, params.batchId))
      .limit(1);

    if (!batch) {
      throw createError({
        statusCode: 409,
        message: "Residency reset batch not found.",
      });
    }

    if (batch.status === "rolled_back") {
      throw createError({
        statusCode: 409,
        message: "This residency reset batch has already been rolled back.",
      });
    }

    if (new Date() > new Date(batch.rollbackDeadline)) {
      throw createError({
        statusCode: 410,
        message: "The 48-hour rollback window for this batch has expired.",
      });
    }

    try {
      await db.execute(sql`SELECT pg_advisory_lock(${batch.hostelId})`);
    }
    catch { }

    try {
      return await db.transaction(async (txn) => {
        const logs = await txn
          .select({
            logId: residencyResetLog.id,
            allocationId: residencyResetLog.allocationId,
            roomId: residencyResetLog.roomId,
            studentId: residencyResetLog.studentId,
            previousAllocationStatus: residencyResetLog.previousAllocationStatus,
            previousRoomOccupancy: residencyResetLog.previousRoomOccupancy,
            previousRoomStatus: residencyResetLog.previousRoomStatus,
            previousAllowedGender: residencyResetLog.previousAllowedGender,
            roomVersionAfterReset: residencyResetLog.roomVersionAfterReset,
            currentRoomVersion: room.version,
            currentRoomOccupancy: room.currentOccupancy,
            userId: user.id,
            userName: user.name,
            userEmail: user.email,
          })
          .from(residencyResetLog)
          .innerJoin(room, eq(residencyResetLog.roomId, room.id))
          .innerJoin(student, eq(residencyResetLog.studentId, student.id))
          .innerJoin(user, eq(student.userId, user.id))
          .where(eq(residencyResetLog.batchId, batch.id));

        let restoredCount = 0;
        let conflictCount = 0;
        const conflicts: { roomId: number; reason: string }[] = [];

        for (const logItem of logs) {
          if (logItem.currentRoomVersion !== logItem.roomVersionAfterReset) {
            conflictCount++;
            conflicts.push({
              roomId: logItem.roomId,
              reason: "Room occupancy or details were modified after the reset occurred.",
            });
            continue;
          }

          // Check if student has a new active or pending allocation
          // const [existingActiveAllocation] = await txn
          //   .select({ id: allocation.id })
          //   .from(allocation)
          //   .where(
          //      and(
          //        eq(allocation.studentId, logItem.studentId),
          //        inArray(allocation.status, ["active", "pending"]),
          //        ne(allocation.id, logItem.allocationId)
          //      )
          //   )
          //   .limit(1);

          const existingActiveAllocation = await txn
            .query
            .allocation
            .findFirst({
              where: {
                studentId: logItem.studentId,
                status: { in: ["active", "pending"] },
                id: { ne: logItem.allocationId },
              },
              columns: {
                id: true,
              },
            });

          if (existingActiveAllocation) {
            conflictCount++;
            conflicts.push({
              roomId: logItem.roomId,
              reason: `Student ${logItem.userName} has already booked a new room.`,
            });
            continue;
          }

          // Check if the old room still has capacity for them
          // Since the room version hasn't changed, currentRoomOccupancy is equal to what it was right after the reset.
          // Wait, if the version hasn't changed, capacity check is technically covered, but just in case:
          const roomData = await txn
            .query
            .room
            .findFirst({
              where: {
                id: logItem.roomId,
              },
              columns: {
                capacity: true,
              },
            });

          if (!roomData) {
            conflictCount++;
            conflicts.push({
              roomId: logItem.roomId,
              reason: `Room not found for ${logItem.userName}.`,
            });
            continue;
          }

          if (logItem.currentRoomOccupancy + 1 > roomData.capacity) {
            conflictCount++;
            conflicts.push({
              roomId: logItem.roomId,
              reason: `Room no longer has capacity for ${logItem.userName}.`,
            });
            continue;
          }

          await txn
            .update(allocation)
            .set({ status: logItem.previousAllocationStatus })
            .where(eq(allocation.id, logItem.allocationId));

          await txn
            .update(room)
            .set({
              currentOccupancy: logItem.previousRoomOccupancy,
              status: logItem.previousRoomStatus,
              allowedGender: logItem.previousAllowedGender,
              version: sql`${room.version} + 1`,
            })
            .where(eq(room.id, logItem.roomId));

          await enqueueApplicationEmail(
            event,
            {
              to: { name: logItem.userName, email: logItem.userEmail },
              subject: "Residency Status Restored",
              html: `<p>Hello ${logItem.userName},</p><p>Your room residency allocation has been restored to active status.</p>`,
              text: `Hello ${logItem.userName}, your room residency allocation has been restored to active status.`,
              recipientUserId: logItem.userId,
              isTransactional: true,
            },
            txn,
          );

          restoredCount++;
        }

        await txn
          .update(residencyResetBatch)
          .set({
            status: "rolled_back",
            rolledBackAt: new Date(),
          })
          .where(eq(residencyResetBatch.id, batch.id));

        if (params.auditContext) {
          await logAudit(
            txn,
            params.auditContext,
            {
              actionType: "STATUS_CHANGE",
              action: "residency_reset_rollback",
              entityType: "hostel",
              entityId: batch.hostelId,
              description: `Rolled back residency reset batch ${batch.id}. Restored ${restoredCount} allocations. Conflicts: ${conflictCount}.`,
            },
          );
        }

        return {
          batchId: batch.id,
          restoredCount,
          conflictCount,
          conflicts,
        };
      });
    }
    finally {
      try {
        await db.execute(sql`SELECT pg_advisory_unlock(${batch.hostelId})`);
      }
      catch { }
    }
  };

  const getRecentResidencyResetBatches = async (hostelId: number) => {
    return await db
      .query
      .residencyResetBatch
      .findMany({
        with: {
          user: {
            columns: {
              name: true,
            },
          },
        },
        where: {
          hostelId,
          rollbackDeadline: { gt: new Date() },
        },
        orderBy: {
          createdAt: "desc",
        },
        limit: 20,
      });
  };

  const getResidencyResetBatchDetails = async (batchId: string) => {
    return await db
      .select({
        logId: residencyResetLog.id,
        allocationId: residencyResetLog.allocationId,
        roomId: residencyResetLog.roomId,
        roomNumber: room.roomNumber,
        studentId: residencyResetLog.studentId,
        userName: user.name,
        userEmail: user.email,
        previousAllocationStatus: residencyResetLog.previousAllocationStatus,
        previousRoomOccupancy: residencyResetLog.previousRoomOccupancy,
      })
      .from(residencyResetLog)
      .innerJoin(room, eq(residencyResetLog.roomId, room.id))
      .innerJoin(student, eq(residencyResetLog.studentId, student.id))
      .innerJoin(user, eq(student.userId, user.id))
      .where(eq(residencyResetLog.batchId, batchId));
  };

  return {
    getAllRooms,
    getRoomByIdScoped,
    getOccupiedRoomsCount,
    getRoomsUnderMaintenance,
    getOccupiedRooms,
    previewResidencyReset,
    resetHostelResidency,
    rollbackResidencyReset,
    getRecentResidencyResetBatches,
    getResidencyResetBatchDetails,
    getAvailableRoomsForStudent,
    deleteRoomsByIds,
    editRoomById,
    getRoomsByIds,
    getAllHostels,
    getHostelById,
    getScopedHostels,
    addNewRoom,
    getExistingRoomByRoomNumberAndHostel,
    getScopedRooms,
    getAllHostelsScoped,
    getRoomStatusCount,
    cancelAllocation,
    getRoomsInHostel,
    getAllocationByStudentId,
    checkActiveOrPendingAllocation,
    getHostelByCode,
    getRoomTypes,
    getHostelBySlug,
    getGenderSpecificRoomStats,
    createNewHostel,
    getHostelByIdScoped,
    getHostelsPaginated,
    updateHostelSettings,
    updateHostelSubaccount,
    getHostelSettings,
    createHostelSubaccount,
  };
}

type RoomWithRelations = Awaited<
  ReturnType<Awaited<ReturnType<typeof roomQueries>>["getScopedRooms"]>
>;

export type Room = NonNullable<RoomWithRelations>[number];

export type HostelRoomType = NonNullable<
  Awaited<ReturnType<Awaited<ReturnType<typeof roomQueries>>["getAvailableRoomsForStudent"]>>
>[number];

export type AdminRoomStats = Awaited<
  ReturnType<Awaited<ReturnType<typeof roomQueries>>["getRoomStatusCount"]>
>;

export type PaginatedHostel = Awaited<
  ReturnType<Awaited<ReturnType<typeof roomQueries>>["getHostelsPaginated"]>
>;
