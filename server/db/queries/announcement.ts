import type { AdminScope, AnnouncementInsert } from "~~/shared/types";

import { useDB } from "~~/server/utils/db";
import { and, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";

import { announcement, announcementReads } from "../schema";

const announcementWithRelations = {
  orderBy: desc(announcement.postedAt),
  with: {
    postedByAdmin: {
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    },
    targetHostel: true,
    targetRoom: true,
    targetUser: {
      columns: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
    },
  },
} as const;

export async function announcementQueries() {
  const { db } = useDB();

  const applyAnnouncementScope = (scope: AdminScope) => {
    const mode = getScopeMode(scope);
    if (mode === "platform") return [];

    if (mode === "company") return [eq(announcement.companyId, scope.companyId!)];

    if (mode === "hostel") {
      return [
        or(
          eq(announcement.targetHostelId, scope.hostelId!),
          eq(announcement.postedBy, scope.adminData.id),
          and(
            eq(announcement.companyId, scope.companyId!),
            isNull(announcement.targetHostelId),
            inArray(announcement.targetAudience, ["all", "admins"]),
          ),
          and(
            isNull(announcement.companyId),
            inArray(announcement.targetAudience, ["all", "admins"],
            ),
          ),
        ),
      ];
    }

    return [sql`FALSE`];
  };

  const createAnnouncement = async (data: AnnouncementInsert, scope: AdminScope) => {
    const payload = {
      ...data,
      companyId: scope.isPlatformAdmin ? data.companyId : scope.companyId!,
    };

    const [newAnnouncement] = await db
      .insert(announcement)
      .values(payload)
      .returning();
    return newAnnouncement;
  };

  const editAnnouncement = async (
    announcementId: number,
    scope: AdminScope,
    data: Partial<AnnouncementInsert>,
    resetReadStatus = false,
  ) => {
    const [updatedAnnouncement] = await db
      .update(announcement)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(
        eq(announcement.id, announcementId),
        ...applyAnnouncementScope(scope),
      ))
      .returning();

    if (updatedAnnouncement && resetReadStatus) {
      await db
        .delete(announcementReads)
        .where(eq(announcementReads.announcementId, announcementId));
    }

    return updatedAnnouncement;
  };

  const getAllAnnouncementsForAdmin = async (scope: AdminScope) => {
    const userId = scope.userId;

    return await db.query.announcement.findMany({
      ...announcementWithRelations,
      where: and(...applyAnnouncementScope(scope)),
      orderBy: desc(announcement.postedAt),
      extras: {
        isRead: sql<boolean>`EXISTS (
        SELECT 1 FROM ${announcementReads} ar
        WHERE ar.announcement_id = ${announcement.id}
        AND ar.user_id = ${userId}
      )`.as("is_read"),
      },
    });
  };

  const getAnnouncementById = async (announcementId: number, scope: AdminScope) => {
    return await db
      .query
      .announcement
      .findFirst({
        ...announcementWithRelations,
        where: and(
          eq(announcement.id, announcementId),
          ...applyAnnouncementScope(scope),
        ),
        extras: {
          isRead: sql<boolean>`EXISTS (
          SELECT 1 FROM ${announcementReads} ar
          WHERE ar.announcement_id = ${announcement.id}
          AND ar.user_id = ${scope.userId}
        )`.as("is_read"),
        },
      });
  };

  const updateAnnouncementReadStatus = async (
    announcementId: number,
    companyId: number,
    userId: number,
    isRead: boolean,
  ) => {
    if (isRead) {
      await db
        .insert(announcementReads)
        .values({
          announcementId,
          userId,
          companyId,
        })
        .onConflictDoNothing();
    }
    else {
      await db
        .delete(announcementReads)
        .where(and(
          eq(announcementReads.announcementId, announcementId),
          eq(announcementReads.userId, userId),
        ));
    }
  };

  const getAllAnnouncementForStudent = async (
    userId: number,
    hostelId: number | null | undefined,
    roomId: number | null | undefined,
    companyId: number,
  ) => {
    const audienceFilters = [
      and(
        isNull(announcement.companyId),
        inArray(announcement.targetAudience, ["students", "all"]),
      ),
      and(
        inArray(announcement.targetAudience, ["students", "all"]),
        eq(announcement.companyId, companyId),
        isNull(announcement.targetHostelId),
      ),
      and(
        eq(announcement.targetAudience, "user"),
        eq(announcement.targetUserId, userId),
      ),
    ];

    if (hostelId) {
      audienceFilters.push(
        and(
          eq(announcement.companyId, companyId),
          eq(announcement.targetHostelId, hostelId),
          inArray(announcement.targetAudience, ["hostel", "all", "students"]),
        ),
      );
    }

    if (roomId) {
      audienceFilters.push(
        and(
          eq(announcement.targetAudience, "room"),
          eq(announcement.targetRoomId, roomId),
        ),
      );
    }

    const result = await db.query.announcement.findMany({
      ...announcementWithRelations,
      where: or(...audienceFilters),
      orderBy: desc(announcement.postedAt),
      extras: {
        isRead: sql<boolean>`EXISTS (
        SELECT 1 FROM ${announcementReads} ar
        WHERE ar.announcement_id = ${announcement.id}
        AND ar.user_id = ${userId}
      )`.as("is_read"),
      },
    });

    return result;
  };

  return {
    createAnnouncement,
    getAllAnnouncementsForAdmin,
    getAnnouncementById,
    updateAnnouncementReadStatus,
    editAnnouncement,
    getAllAnnouncementForStudent,
  };
}

type AnnouncementWithRelations = Awaited<ReturnType<Awaited<ReturnType<typeof announcementQueries>>["getAnnouncementById"]>>;

export type AnnouncementType = NonNullable<AnnouncementWithRelations>;
