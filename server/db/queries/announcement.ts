import type { AdminScope, AnnouncementInsert, AuditContext } from "~~/shared/types";

import { useDB } from "~~/server/utils/db";
import { and, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";

import { announcement, announcementReads } from "../schema";
import { auditLogQueries } from "./auditLog";

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

  const { logAudit } = await auditLogQueries();

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

  const createAnnouncement = async (
    data: AnnouncementInsert,
    scope: AdminScope,
    ctx: AuditContext,
  ) => {
    const payload = {
      ...data,
      companyId: scope.isPlatformAdmin ? data.companyId : scope.companyId!,
    };

    const [newAnnouncement] = await db
      .insert(announcement)
      .values(payload)
      .returning();

    if (newAnnouncement) {
      await logAudit(db, ctx, {
        action: "announcement.create",
        actionType: "CREATE",
        entityType: "announcement",
        entityId: newAnnouncement.id,
        description: `${ctx.actor.actorType} created announcement with title "${redact(newAnnouncement.title)}" for company ID ${newAnnouncement.companyId}, hostel ID ${newAnnouncement.targetHostelId}, room ID ${newAnnouncement.targetRoomId}, user ID ${newAnnouncement.targetUserId}`,
        before: null,
        after: newAnnouncement,
      });
    }

    return newAnnouncement;
  };

  const editAnnouncement = async (
    announcementId: number,
    scope: AdminScope,
    data: Partial<AnnouncementInsert>,
    resetReadStatus = false,
    ctx: AuditContext,
  ) => {
    const before = await db.query.announcement.findFirst({
      where: and(
        eq(announcement.id, announcementId),
        ...applyAnnouncementScope(scope),
      ),
    });

    if (!before) return null;

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

    if (updatedAnnouncement) {
      await logAudit(db, ctx, {
        action: "announcement.update",
        actionType: "UPDATE",
        entityType: "announcement",
        entityId: updatedAnnouncement.id,
        description: `${ctx.actor.actorType} updated announcement with title "${redact(updatedAnnouncement.title)}" for company ID ${updatedAnnouncement.companyId}, hostel ID ${updatedAnnouncement.targetHostelId}, room ID ${updatedAnnouncement.targetRoomId}, user ID ${updatedAnnouncement.targetUserId}`,
        before,
        after: updatedAnnouncement,
        diff: computeAuditDiff(before, updatedAnnouncement),
      });
    }

    if (updatedAnnouncement && resetReadStatus) {
      const deletedReads = await db
        .delete(announcementReads)
        .where(eq(announcementReads.announcementId, announcementId))
        .returning();

      if (deletedReads.length > 0) {
        await logAudit(db, ctx, {
          action: "announcement.reset_read_status",
          actionType: "DELETE",
          entityType: "announcement_reads",
          entityId: updatedAnnouncement.id,
          description: `${ctx.actor.actorType} reset read status for announcement ID ${updatedAnnouncement.id} by deleting ${deletedReads.length} read receipt(s).`,
          before: deletedReads,
          after: null,
          diff: computeAuditDiff(deletedReads, null),
        });
      }
    }

    return updatedAnnouncement;
  };

  const deleteAnnouncement = async (
    announcementId: number,
    scope: AdminScope,
    ctx: AuditContext,
  ) => {
    const before = await db.query.announcement.findFirst({
      where: and(
        eq(announcement.id, announcementId),
        ...applyAnnouncementScope(scope),
      ),
    });

    if (!before) return null;

    const [deletedAnnouncement] = await db
      .delete(announcement)
      .where(and(
        eq(announcement.id, announcementId),
        ...applyAnnouncementScope(scope),
      ))
      .returning();

    if (deletedAnnouncement) {
      await logAudit(db, ctx, {
        action: "announcement.delete",
        actionType: "DELETE",
        entityType: "announcement",
        entityId: deletedAnnouncement.id,
        description: `${ctx.actor.actorType} deleted announcement ID ${deletedAnnouncement.id}`,
        before,
        after: null,
        diff: computeAuditDiff(before, null),
      });
    }

    return deletedAnnouncement;
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
    ctx: AuditContext,
  ) => {
    if (isRead) {
      const [readAnnouncement] = await db
        .insert(announcementReads)
        .values({
          announcementId,
          userId,
          companyId,
        })
        .onConflictDoNothing()
        .returning();

      if (readAnnouncement) {
        await logAudit(db, ctx, {
          action: "announcement.mark_as_read",
          actionType: "CREATE",
          entityType: "announcement_reads",
          entityId: announcementId,
          description: `${ctx.actor.actorType} marked announcement ID ${announcementId} as read for user ID ${userId}.`,
          before: null,
          after: readAnnouncement,
          diff: computeAuditDiff(null, readAnnouncement),
        });
      }
    }
    else {
      const deletedReads = await db
        .delete(announcementReads)
        .where(and(
          eq(announcementReads.announcementId, announcementId),
          eq(announcementReads.userId, userId),
        ))
        .returning();

      if (deletedReads.length > 0) {
        await logAudit(db, ctx, {
          action: "announcement.mark_as_unread",
          actionType: "DELETE",
          entityType: "announcement_reads",
          entityId: announcementId,
          description: `${ctx.actor.actorType} marked announcement ID ${announcementId} as unread for user ID ${userId}.`,
          before: deletedReads,
          after: null,
          diff: computeAuditDiff(deletedReads, null),
        });
      }
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
    deleteAnnouncement,
    getAllAnnouncementForStudent,
  };
}

type AnnouncementWithRelations = Awaited<ReturnType<Awaited<ReturnType<typeof announcementQueries>>["getAnnouncementById"]>>;

export type AnnouncementType = NonNullable<AnnouncementWithRelations>;
