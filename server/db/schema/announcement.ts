import { pgEnum, snakeCase, unique } from "drizzle-orm/pg-core";

import { company } from "./company";
import { hostel, room } from "./room";
import { admin, user } from "./user";

export const announcementPriorityEnum = pgEnum("announcement_priority", [
  "low",
  "medium",
  "high",
  "emergency",
]);

export const targetAudienceEnum = pgEnum("target_audience", [
  "all",
  "students",
  "admins",
  "hostel",
  "room",
  "user",
]);

export const announcement = snakeCase.table("announcement", t => ({
  id: t.integer().primaryKey().generatedAlwaysAsIdentity(),
  postedBy: t.integer().notNull().references(() => admin.id, { onDelete: "cascade" }),
  title: t.varchar({ length: 150 }).notNull(),
  content: t.text().notNull(),
  postedAt: t.timestamp().defaultNow().notNull(),
  priority: announcementPriorityEnum().default("medium").notNull(),
  targetAudience: targetAudienceEnum().default("all").notNull(),
  targetHostelId: t.integer().references(() => hostel.id, { onDelete: "set null" }),
  targetRoomId: t.integer().references(() => room.id, { onDelete: "set null" }),
  targetUserId: t.integer().references(() => user.id, { onDelete: "set null" }),
  companyId: t.integer().references(() => company.id, { onDelete: "restrict" }),
  updatedAt: t.timestamp()
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
}));

export const announcementReads = snakeCase.table("announcement_reads", t => ({
  readId: t.integer().primaryKey().generatedAlwaysAsIdentity(),
  announcementId: t.integer().notNull().references(() => announcement.id, { onDelete: "cascade" }),
  userId: t.integer().notNull().references(() => user.id, { onDelete: "cascade" }),
  readDate: t.timestamp().defaultNow().notNull(),
  companyId: t.integer().references(() => company.id, { onDelete: "restrict" }),
  createdAt: t.timestamp().defaultNow().notNull(),
  updatedAt: t.timestamp(),
}), table => [
  unique("unique_announcement_student").on(table.announcementId, table.userId),
]);
