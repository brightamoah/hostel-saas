import type { AuditContext, AuditInsert, DbOrTxn, ServerEvent } from "~~/shared/types";
import type { AuditActor } from "evlog";
import type { H3Event } from "h3";

import { computeAuditDiff, redact } from "~~/server/utils/auditLogUtils";
import { useLogger } from "evlog";

import { auditLog } from "../schema";

export async function auditLogQueries() {
  const actorFields = (ctx: AuditContext): Pick<AuditInsert, "actorUserId" | "actorAdminId" | "actorType"> => {
    const a = ctx.actor;

    if (a.actorType === "admin") {
      return {
        actorType: "admin",
        actorAdminId: a.actorAdminId,
        actorUserId: a.actorUserId ?? null,
      };
    }

    if (a.actorType === "student") {
      return {
        actorType: "student",
        actorAdminId: null,
        actorUserId: a.actorUserId,
      };
    }

    return {
      actorType: "system",
      actorAdminId: null,
      actorUserId: null,
    };
  };

  async function logAudit(
    db: DbOrTxn,
    ctx: AuditContext,
    entry: Omit<AuditInsert, "companyId" | "hostelId" | "meta" | "actorType" | "actorUserId" | "actorAdminId"> & {
      before?: unknown;
      after?: unknown;
    },
  ) {
    const before = entry.before ? redact(entry.before) : null;
    const after = entry.after ? redact(entry.after) : null;

    const diff
      = before && after
        ? computeAuditDiff(before, after)
        : null;

    const log = useLogger(ctx.event as H3Event & ServerEvent);

    await db.insert(auditLog).values({
      companyId: ctx.companyId,
      hostelId: ctx.hostelId ?? null,
      ...actorFields(ctx),
      entityId: entry.entityId ?? null,
      entityType: entry.entityType,
      actionType: entry.actionType,
      action: entry.action,
      description: entry.description ?? null,
      before,
      after,
      diff: diff ? redact(diff) : null,
      ipAddress: ctx.ipAddress ?? null,
      userAgent: ctx.userAgent ?? null,
      requestId: ctx.requestId ?? null,
    });

    let actorDisplayName = "";
    let actorEmail = "";

    const targetUserId = ctx.actor.actorType === "admin"
      ? ctx.actor.actorUserId
      : ctx.actor.actorType === "student"
        ? ctx.actor.actorUserId
        : null;

    if (targetUserId) {
      const { db: globalDb } = useDB();

      const userData = await globalDb.query.user.findFirst({
        where: {
          id: targetUserId,
        },
        columns: { name: true, email: true },
      });

      actorDisplayName = userData?.name ?? "";
      actorEmail = userData?.email ?? "";
    }

    const mappedActorType: Record<AuditContext["actor"]["actorType"], AuditActor["type"]> = {
      admin: "api",
      student: "user",
      system: "system",
    };

    const actorId = ctx.actor.actorType === "admin"
      ? ctx.actor.actorAdminId
      : actorFields(ctx).actorUserId;

    log.audit?.({
      action: entry.action,
      actor: {
        type: mappedActorType[ctx.actor.actorType] ?? "system",
        id: String(actorId),
        displayName: actorDisplayName,
        email: actorEmail,
        reason: entry.description!,
      },
      target: {
        type: entry.entityType,
        id: String(entry.entityId),
      },
      outcome: "success",
      reason: entry.description ?? "",
      changes: { before, after },
    });
  }

  return {
    actorFields,
    logAudit,
  };
}
