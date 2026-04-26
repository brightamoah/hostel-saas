import type { AdminScope, Period } from "~~/shared/types";

import { calcChange, getTimePeriod } from "~~/server/utils/calcChange";
import { useDB } from "~~/server/utils/db";
import { getScopeMode } from "~~/server/utils/permissionScope";
import { and, asc, countDistinct, desc, eq, exists, gt, inArray, like, or, sql } from "drizzle-orm";

import { allocation, hostel, room } from "../schema";

const roomWithRelations = {
  with: {
    hostel: true,
  },
} as const;

export async function roomQueries() {
  const { db } = useDB();

  const applyRoomScope = (scope: AdminScope) => {
    const mode = getScopeMode(scope);

    if (mode === "platform") return [];

    if (mode === "company" && scope.companyId) return [eq(room.companyId, scope.companyId)];

    if (mode === "hostel" && scope.hostelId) return [eq(room.hostelId, scope.hostelId)];

    return [sql`FALSE`];
  };

  const applyHostelScope = (scope: AdminScope) => {
    const mode = getScopeMode(scope);

    if (mode === "platform") return [];
    if (mode === "company" && scope.companyId) return [eq(hostel.companyId, scope.companyId)];

    if (mode === "hostel" && scope.hostelId) return [eq(hostel.id, scope.hostelId)];

    return [sql`FALSE`];
  }; ;

  // --- STUDENT & pUBLIC QUERIES ---
  const getHostelByCode = async (joinCode: string) => {
    return await db
      .query
      .hostel
      .findFirst({
        where: and(eq(hostel.joinCode, joinCode), eq(hostel.status, "active")),
        columns: {
          primaryColor: false,
          createdAt: false,
          updatedAt: false,
        },
      });
  };

  const getHostelBySlug = async (slug: string) => {
    const hostelResult = db
      .query
      .hostel
      .findFirst({
        where: and(
          eq(hostel.slug, slug),
          eq(hostel.status, "active"),
        ),
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
      where: and(
        eq(room.hostelId, hostelId),
        eq(room.allowedGender, gender),
        inArray(room.status, ["vacant", "partially occupied"]),
        gt(sql`${room.capacity} - ${room.currentOccupancy}`, 0),
      ),
      orderBy: asc(room.roomNumber),
    });
  };

  // --- ADMIN QUERIES ---
  const getScopedRooms = async (scope: AdminScope) => {
    return await db.query.room.findMany({
      where: and(...applyRoomScope(scope)),
      with: { hostel: { columns: { name: true } } },
      orderBy: asc(room.roomNumber),
    });
  };

  const getRoomByIdScoped = async (id: number, scope: AdminScope) => {
    return await db.query.room.findFirst({
      where: and(eq(room.id, id), ...applyRoomScope(scope)),
    });
  };

  const getRoomStatusCount = async (scope: AdminScope) => {
    const {
      startOfThisMonth,
      startOfThisWeek,
    } = getTimePeriod();

    const [result] = await db
      .select({
        vacant: countDistinct(sql`CASE WHEN ${room.status} = 'vacant' THEN ${room.id} END`),
        fullyOccupied: countDistinct(sql`CASE WHEN ${room.status} = 'fully occupied' THEN ${room.id} END`),
        partiallyOccupied: countDistinct(sql`CASE WHEN ${room.status} = 'partially occupied' THEN ${room.id} END`),
        underMaintenance: countDistinct(sql`CASE WHEN ${room.status} = 'under maintenance' THEN ${room.id} END`),
        reserved: countDistinct(sql`CASE WHEN ${room.status} = 'reserved' THEN ${room.id} END`),
        available: countDistinct(sql`CASE WHEN ${room.status} IN ('vacant', 'partially occupied') THEN ${room.id} END`),
        allRooms: countDistinct(room.id),
        occupied: countDistinct(sql`CASE WHEN ${room.currentOccupancy} > 0 THEN ${room.id} END`),
        prevTotalRooms: countDistinct(sql`CASE WHEN ${room.createdAt} < ${startOfThisMonth} THEN ${room.id} END`),
        prevOccupied: countDistinct(sql`CASE WHEN ${room.status} = 'fully occupied' AND ${room.updatedAt} < ${startOfThisMonth} THEN ${room.id} END`),
        prevAvailable: countDistinct(sql`CASE WHEN ${room.status} IN ('vacant', 'partially occupied') AND ${room.updatedAt} < ${startOfThisMonth} THEN ${room.id} END`),
        prevMaintenance: countDistinct(sql`CASE WHEN ${room.status} = 'under maintenance' AND ${room.updatedAt} < ${startOfThisWeek} THEN ${room.id} END`),
      })
      .from(room)
      .where(and(...applyRoomScope(scope)));

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
        where: and(
          eq(allocation.studentId, studentId),
          inArray(allocation.status, ["active", "pending"]),
        ),
        columns: { id: true, roomId: true, status: true },
      });
    return activeAllocation;
  };

  const getAllRooms = async () => {
    const rooms = await db
      .query
      .room
      .findMany({ limit: 100, orderBy: asc(room.id) });
    return rooms;
  };

  const getRoomsByIds = async (ids: number[]) => {
    const rooms = await db
      .query
      .room
      .findMany({ where: inArray(room.id, ids) });
    return rooms;
  };

  const getOccupiedRoomsCount = async () => {
    const count = await db
      .query
      .room
      .findMany()
      .then(rooms => rooms.filter(r => r.currentOccupancy > 0).length);
    return count;
  };

  const getRoomsUnderMaintenance = async () => {
    const rooms = await db
      .query
      .room
      .findMany({ where: eq(room.status, "under maintenance") });
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
        where: and(
          eq(room.roomNumber, roomNumber),
          eq(room.hostelId, hostelId),
        ),
      });

    return existingRoom;
  };

  const deleteRoomsByIds = async (ids: number[], scope: AdminScope) => {
    if (ids.length === 0) return [];

    const deletedRooms = await db
      .delete(room)
      .where(and(inArray(room.id, ids), ...applyRoomScope(scope)))
      .returning();

    return deletedRooms;
  };

  const editRoomById = async (
    roomId: number,
    data: Partial<typeof room.$inferInsert>,
    scope: AdminScope,
  ) => {
    const [updatedRoom] = await db
      .update(room)
      .set(data)
      .where(and(eq(room.id, roomId), ...applyRoomScope(scope)))
      .returning();

    return updatedRoom;
  };

  const getAllHostels = async (gender: "male" | "female") => {
    const hostels = await db
      .query
      .hostel
      .findMany({
        where: and(
          eq(hostel.status, "active"),
          exists(
            db.select().from(room).where(
              and(
                eq(room.hostelId, hostel.id),
                eq(room.allowedGender, gender),
                inArray(room.status, ["vacant", "partially occupied"]),
                gt(room.capacity, room.currentOccupancy),
              ),
            ),
          ),
        ),
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
        with: {
          rooms: {
            where: eq(room.allowedGender, gender),
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
          minimumRoomPrice: sql<number>`(SELECT MIN("room"."amount_per_year") FROM "room" WHERE "room"."hostel_id" = "hostel"."id")`.as("minimumRoomPrice"),
          maximumRoomPrice: sql<number>`(SELECT MAX("room"."amount_per_year") FROM "room" WHERE "room"."hostel_id" = "hostel"."id")`.as("maximumRoomPrice"),
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

  const addNewRoom = async (data: typeof room.$inferInsert, scope: AdminScope) => {
    if (!scope.isPlatformAdmin) {
      const targetHostel = await db.query.hostel.findFirst({
        where: and(eq(hostel.id, data.hostelId), ...applyHostelScope(scope)),
      });
      if (!targetHostel) throw createError({ statusCode: 403, message: "Unauthorized hostel assignment" });
    }

    const [newRoom] = await db
      .insert(room)
      .values(data)
      .returning();

    return newRoom;
  };

  const getAllHostelsScoped = async (scope: AdminScope) => {
    const mode = getScopeMode(scope);

    if (mode === "platform") return await db.query.hostel.findMany();

    if (mode === "company") {
      return await db
        .query
        .hostel
        .findMany({
          where: eq(hostel.companyId, scope.companyId!),
        });
    }

    if (mode === "hostel" && scope.hostelId) {
      return await db.query.hostel.findMany({
        where: eq(hostel.id, scope.hostelId),
      });
    }

    return [];
  };

  const cancelAllocation = async (allocationId: number, scope: AdminScope) => {
    return await db.transaction(async (tx) => {
      const targetAllocation = await tx
        .query
        .allocation
        .findFirst({
          where: eq(allocation.id, allocationId),
          with: { room: true },
        });

      if (!targetAllocation) throw new Error("Allocation not found");

      const mode = getScopeMode(scope);
      const isAuthorized = mode === "platform"
        || (mode === "company" && targetAllocation.room.companyId === scope.companyId)
        || (mode === "hostel" && targetAllocation.room.hostelId === scope.hostelId);

      if (!isAuthorized) throw new Error("Unauthorized access to allocation");

      const [updatedAllocation] = await tx
        .update(allocation)
        .set({ status: "cancelled" })
        .where(eq(allocation.id, allocationId))
        .returning();

      const currentRoom = targetAllocation.room;
      const newOccupancy = Math.max(0, currentRoom.currentOccupancy - 1);
      const newStatus = newOccupancy === 0
        ? "vacant"
        : newOccupancy < currentRoom.capacity ? "partially occupied" : "fully occupied";

      await tx
        .update(room)
        .set({
          currentOccupancy: newOccupancy,
          status: newStatus,
        })
        .where(eq(room.id, targetAllocation.roomId));

      return updatedAllocation;
    });
  };

  const getRoomsInHostel = async (hostelId: number) => {
    const rooms = await db
      .query
      .room
      .findMany({
        columns: {
          id: true,
          roomNumber: true,
          floor: true,
        },
        where: eq(room.hostelId, hostelId),
      });
    return rooms;
  };

  const getAllocationByStudentId = async (studentId: number) => {
    const allocations = await db
      .query
      .allocation
      .findFirst({
        where: and(
          eq(allocation.studentId, studentId),
          eq(allocation.status, "active"),
        ),
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
          eq(room.allowedGender, gender),
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
        availableRooms: sql<number>`COUNT(*) FILTER (WHERE ${room.status} IN ('vacant', 'partially occupied') AND ${room.currentOccupancy} < ${room.capacity} AND ${room.allowedGender} = ${gender})`,
        minimumPrice: sql<number>`COALESCE(MIN(${room.amountPerYear}) FILTER (WHERE ${room.allowedGender} = ${gender}), 0)`,
        maximumPrice: sql<number>`COALESCE(MAX(${room.amountPerYear}) FILTER (WHERE ${room.allowedGender} = ${gender}), 0)`,
      })
      .from(room)
      .where(eq(room.hostelId, hostelId));

    return stats;
  };

  const createNewHostel = async (data: typeof hostel.$inferInsert) => {
    const [newHostel] = await db
      .insert(hostel)
      .values(data)
      .returning();
    return newHostel;
  };

  const getHostelByIdScoped = async (id: number, scope: AdminScope) => {
    const hostelResult = await db
      .query
      .hostel
      .findFirst({
        where: and(eq(hostel.id, id), ...applyHostelScope(scope)),
        columns: {
          id: true,
          name: true,
          address: true,
          contactNumber: true,
          email: true,
          primaryColor: true,
          logoUrl: true,
          status: true,
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
      ? or(
          like(hostel.name, `%${searchTerm}%`),
          like(hostel.address, `%${searchTerm}%`),
        )
      : undefined;

    const roomStatsSubquery = db
      .select({
        hostelId: room.hostelId,
        availableRooms: sql<number>`COUNT(*) FILTER (WHERE ${room.status} IN ('vacant', 'partially occupied') AND ${room.currentOccupancy} < ${room.capacity} AND ${room.allowedGender} = ${gender})`.as("availableRooms"),
        minimumRoomPrice: sql<number>`MIN(${room.amountPerYear}) FILTER (WHERE ${room.allowedGender} = ${gender})`.as("minimumRoomPrice"),
        maximumRoomPrice: sql<number>`MAX(${room.amountPerYear}) FILTER (WHERE ${room.allowedGender} = ${gender})`.as("maximumRoomPrice"),
        roomTypes: sql<string[]>`ARRAY_AGG(DISTINCT ${room.roomType}::text) FILTER (WHERE ${room.allowedGender} = ${gender})`.as("roomTypes"),
        totalCapacity: sql<number>`SUM(${room.capacity}) FILTER (WHERE ${room.allowedGender} = ${gender})`.as("totalCapacity"),
        currentOccupancy: sql<number>`SUM(${room.currentOccupancy}) FILTER (WHERE ${room.allowedGender} = ${gender})`.as("currentOccupancy"),
      })
      .from(room)
      .groupBy(room.hostelId)
      .as("room_stats");

    const whereConditions = [
      eq(hostel.status, "active"),
      exists(
        db.select().from(room).where(
          and(
            eq(room.hostelId, hostel.id),
            eq(room.allowedGender, gender),
          ),
        ),
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
        minimumRoomPrice: sql<number>`COALESCE(${roomStatsSubquery.minimumRoomPrice}, 0)`.as("minimumRoomPrice"),
        maximumRoomPrice: sql<number>`COALESCE(${roomStatsSubquery.maximumRoomPrice}, 0)`.as("maximumRoomPrice"),
        availableRooms: sql<number>`COALESCE(${roomStatsSubquery.availableRooms}, 0)`.as("availableRooms"),
        roomTypes: sql<string[]>`COALESCE(${roomStatsSubquery.roomTypes}, ARRAY[]::text[])`.as("roomTypes"),
        totalCapacity: sql<number>`COALESCE(${roomStatsSubquery.totalCapacity}, 0)`.as("totalCapacity"),
        currentOccupancy: sql<number>`COALESCE(${roomStatsSubquery.currentOccupancy}, 0)`.as("currentOccupancy"),
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

  return {
    getAllRooms,
    getRoomByIdScoped,
    getOccupiedRoomsCount,
    getRoomsUnderMaintenance,
    getOccupiedRooms,
    getAvailableRoomsForStudent,
    deleteRoomsByIds,
    editRoomById,
    getRoomsByIds,
    getAllHostels,
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
  };
}

type RoomWithRelations = Awaited<ReturnType<Awaited<ReturnType<typeof roomQueries>>["getScopedRooms"]>>;

export type Room = NonNullable<RoomWithRelations>[number];

export type HostelRoomType = NonNullable<Awaited<ReturnType<Awaited<ReturnType<typeof roomQueries>>["getAvailableRoomsForStudent"]>>>[number];

export type AdminRoomStats = Awaited<ReturnType<Awaited<ReturnType<typeof roomQueries>>["getRoomStatusCount"]>>;

export type PaginatedHostel = Awaited<ReturnType<Awaited<ReturnType<typeof roomQueries>>["getHostelsPaginated"]>>;
