import { pgEnum, pgTable, uniqueIndex } from "drizzle-orm/pg-core";

import { company } from "./company";
import { hostel } from "./room";
import { admin, user } from "./user";

export const notificationTypeEnum = pgEnum("notification_type", [
  "complaint_created",
  "maintenance_created",
  "visitor_created",
  "visitor_approved",
  "billing_created",
  "payment_completed",
  "allocation_created",
  "admin_created",
  "announcement_posted",
  "generic",
]);

export const notification = pgTable("notification", t => ({
  id: t.integer().primaryKey().generatedAlwaysAsIdentity(),
  type: notificationTypeEnum().default("generic").notNull(),
  title: t.varchar({ length: 180 }).notNull(),
  message: t.text().notNull(),
  actorUserId: t.integer().references(() => user.id, { onDelete: "set null" }),
  actorAdminId: t.integer().references(() => admin.id, { onDelete: "set null" }),
  companyId: t.integer().references(() => company.id, { onDelete: "cascade" }),
  hostelId: t.integer().references(() => hostel.id, { onDelete: "cascade" }),
  linkName: t.varchar({ length: 120 }),
  linkQuery: t.json(),
  meta: t.json(),
  createdAt: t.timestamp().defaultNow().notNull(),
  updatedAt: t.timestamp()
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
}), table => [
  uniqueIndex("notification_company_created_at_idx").on(table.companyId, table.createdAt),
]);

export const notificationRead = pgTable("notification_read", t => ({
  id: t.integer().primaryKey().generatedAlwaysAsIdentity(),
  notificationId: t.integer().notNull().references(() => notification.id, { onDelete: "cascade" }),
  adminId: t.integer().notNull().references(() => admin.id, { onDelete: "cascade" }),
  readAt: t.timestamp().defaultNow().notNull(),
  createdAt: t.timestamp().defaultNow().notNull(),
}), table => [
  uniqueIndex("notification_read_admin_notification_unique").on(table.adminId, table.notificationId),
]);
