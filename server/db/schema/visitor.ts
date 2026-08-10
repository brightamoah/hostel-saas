import { sql } from "drizzle-orm";
import { check, pgEnum, snakeCase } from "drizzle-orm/pg-core";

import { company } from "./company";
import { hostel } from "./room";
import { admin, student } from "./user";

export const visitorStatusEnum = pgEnum("visitor_status", [
  "checked-in",
  "checked-out",
  "pending",
  "cancelled",
  "denied",
  "approved",
]);

export const visitorLogActionEnum = pgEnum("visitor_log_action", [
  "check_in",
  "check_out",
]);

export const visitor = snakeCase.table("visitor", t => ({
  id: t.integer().primaryKey().generatedAlwaysAsIdentity(),
  studentId: t.integer().notNull().references(() => student.id, { onDelete: "cascade" }),
  hostelId: t.integer().notNull().references(() => hostel.id, { onDelete: "cascade" }),
  adminId: t.integer().references(() => admin.id, { onDelete: "set null" }),
  name: t.text().notNull(),
  email: t.text().notNull(),
  phoneNumber: t.text().notNull(),
  visitDate: t.date().notNull(),
  relationship: t.text().notNull(),
  purpose: t.text().notNull(),
  companyId: t.integer().notNull().references(() => company.id, { onDelete: "restrict" }),
  createdAt: t.timestamp().defaultNow().notNull(),
  updatedAt: t.timestamp()
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
  status: visitorStatusEnum().default("pending").notNull(),
}), () => [
  check("chk_visit_date", sql`"visit_date" >= CURRENT_DATE`),
]);

export const visitorLogs = snakeCase.table("visitor_logs", t => ({
  id: t.integer().primaryKey().generatedAlwaysAsIdentity(),
  visitorId: t.integer().notNull().references(() => visitor.id, { onDelete: "cascade" }),
  adminId: t.integer().references(() => admin.id, { onDelete: "set null" }),
  action: visitorLogActionEnum().notNull(),
  timestamp: t.timestamp().defaultNow().notNull(),
  companyId: t.integer().notNull().references(() => company.id, { onDelete: "restrict" }),
  createdAt: t.timestamp().defaultNow().notNull(),
  updatedAt: t.timestamp(),
}));
