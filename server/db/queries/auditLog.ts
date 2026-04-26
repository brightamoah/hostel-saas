import type { AuditContext, AuditInsert, DbOrTxn } from "~~/shared/types";

import { computeAuditDiff, redact } from "~~/server/utils/auditLogUtils";

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
  }

  return {
    actorFields,
    logAudit,
  };
}
