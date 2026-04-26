import { relations } from "drizzle-orm";
import { index, pgEnum, pgTable } from "drizzle-orm/pg-core";

import { company } from "./company";
import { hostel } from "./room";
import { admin, user } from "./user";

export const auditActionEnum = pgEnum("audit_action", [
  "INSERT",
  "UPDATE",
  "DELETE",
  "LOGIN",
  "LOGOUT",
  "ALLOCATE",
  "CANCEL_ALLOCATION",
  "PAYMENT",
  "APPROVE",
  "DENY",
  "CREATE",
  "STATUS_CHANGE",
  "PASSWORD_RESET",
  "ROLE_CHANGE",
  "PERMISSION_CHANGE",
  "DATA_EXPORT",
  "DATA_IMPORT",
  "OTHER",
]);

export const entityTypeEnum = pgEnum("audit_entity_type", [
  "announcement",
  "billing",
  "payment",
  "complaint",
  "complaint_response",
  "maintenance_request",
  "maintenance_response",
  "visitor",
  "visitor_logs",
  "room",
  "hostel",
  "allocation",
  "company",
  "company_member",
  "auth",
  "user",
  "student",
  "admin",
  "notification",
  "audit_log",
  "other",
]);

export const actorTypeEnum = pgEnum("audit_actor_type", [
  "student",
  "admin",
  "system",
]);

export const auditLog = pgTable("audit_log", t => ({
  id: t.integer().primaryKey().generatedAlwaysAsIdentity(),
  companyId: t.integer().references(() => company.id, { onDelete: "restrict" }),
  hostelId: t.integer().references(() => hostel.id, { onDelete: "set null" }),
  actorType: actorTypeEnum().notNull(),
  actorUserId: t.integer().references(() => user.id, { onDelete: "set null" }),
  actorAdminId: t.integer().references(() => admin.id, { onDelete: "set null" }),
  actionType: auditActionEnum().notNull(),
  action: t.varchar({ length: 120 }).notNull(),
  entityType: entityTypeEnum().notNull(),
  entityId: t.integer(),
  description: t.text(),
  before: t.jsonb(),
  after: t.jsonb(),
  diff: t.jsonb(),
  ipAddress: t.varchar({ length: 45 }),
  userAgent: t.text(),
  requestId: t.text(),
  createdAt: t.timestamp().defaultNow().notNull(),
}), table => [
  index("audit_log_company_created_at_idx").on(table.companyId, table.createdAt),
  index("audit_log_entity_lookup_idx").on(table.companyId, table.entityType, table.entityId),
  index("audit_log_actor_idx").on(table.companyId, table.actorType, table.actorUserId, table.actorAdminId),
]);

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  company: one(company, {
    fields: [auditLog.companyId],
    references: [company.id],
  }),
  hostel: one(hostel, {
    fields: [auditLog.hostelId],
    references: [hostel.id],
  }),
  actorUser: one(user, {
    fields: [auditLog.actorUserId],
    references: [user.id],
  }),
  actorAdmin: one(admin, {
    fields: [auditLog.actorAdminId],
    references: [admin.id],
  }),

}));
