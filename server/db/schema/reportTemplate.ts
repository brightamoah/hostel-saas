import { pgEnum, pgTable } from "drizzle-orm/pg-core";

import { company } from "./company";
import { hostel } from "./room";
import { user } from "./user";

export const reportModuleEnum = pgEnum("report_module", [
  "billing",
  "rooms",
  "student",
  "visitor",
  "maintenanceRequest",
  "complaint",
  "user",
]);

export const reportTemplate = pgTable("report_template", t => ({
  id: t.integer().primaryKey().generatedAlwaysAsIdentity(),
  companyId: t.integer().notNull().references(() => company.id, { onDelete: "cascade" }),
  userId: t.integer().notNull().references(() => user.id, { onDelete: "cascade" }),
  hostelId: t.integer().references(() => hostel.id, { onDelete: "cascade" }),
  title: t.text().notNull(),
  description: t.text(),
  module: reportModuleEnum().notNull(),
  config: t.jsonb().notNull(),
  isPrebuilt: t.boolean().default(false).notNull(),
  createdAt: t.timestamp().defaultNow().notNull(),
  updatedAt: t.timestamp()
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
}));
