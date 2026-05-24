import { sql } from "drizzle-orm";
import { check, index, pgEnum, pgTable, unique } from "drizzle-orm/pg-core";

import { company } from "./company";
import { student } from "./user";

export const roomTypeEnum = pgEnum("room_type", [
  "single",
  "double",
  "triple",
  "quad",
]);

export const roomStatusEnum = pgEnum("room_status", [
  "vacant",
  "fully occupied",
  "partially occupied",
  "under maintenance",
  "reserved",
]);

export const hostelStatusEnum = pgEnum("hostel_status", [
  "active",
  "inactive",
  "under renovation",
]);

export const academicPeriodEnum = pgEnum("academic_period", [
  "first semester",
  "second semester",
  "entire year",
  "vacation period",
]);

export const roomGenderEnum = pgEnum("room_gender", [
  "male",
  "female",
  "mixed",
  "unassigned",
]);

export const allocationStatusEnum = pgEnum("allocation_status", ["active", "expired", "pending", "cancelled"]);

export const hostel = pgTable("hostel", t => ({
  id: t.integer().primaryKey().generatedAlwaysAsIdentity(),
  name: t.text().notNull().unique(),
  address: t.text().notNull(),
  contactNumber: t.varchar({ length: 20 }).notNull(),
  email: t.varchar({ length: 255 }).notNull(),
  createdAt: t.timestamp().defaultNow().notNull(),
  updatedAt: t.timestamp()
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
  status: hostelStatusEnum().default("active").notNull(),
  companyId: t.integer().notNull().references(() => company.id, { onDelete: "restrict" }),
  slug: t.varchar({ length: 80 }).notNull(),
  logoUrl: t.text(),
  primaryColor: t.varchar({ length: 32 }),
  supportEmail: t.varchar({ length: 255 }),
  supportPhone: t.varchar({ length: 30 }),
  joinCode: t.varchar({ length: 20 }).unique(),
}), table => [
  unique("unique_hostel_slug").on(table.slug),
]);

export const room = pgTable("room", t => ({
  id: t.integer().primaryKey().generatedAlwaysAsIdentity(),
  roomNumber: t.varchar({ length: 10 }).notNull().unique(),
  hostelId: t.integer().notNull().references(() => hostel.id, { onDelete: "cascade" }),
  floor: t.integer().notNull(),
  capacity: t.integer().notNull(),
  roomType: roomTypeEnum().notNull(),
  currentOccupancy: t.integer().default(0).notNull(),
  features: t.text().array().default(sql`ARRAY[]::text[]`),
  amountPerYear: t.numeric({ precision: 10, scale: 2, mode: "number" }).notNull(),
  status: roomStatusEnum().default("vacant").notNull(),
  allowedGender: roomGenderEnum().default("unassigned").notNull(),
  companyId: t.integer().notNull().references(() => company.id, { onDelete: "restrict" }),
  createdAt: t.timestamp().defaultNow().notNull(),
  updatedAt: t.timestamp()
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
}), table => [
  unique("unique_room_number").on(table.roomNumber, table.hostelId),

  check("chk_capacity", sql`${table.capacity} > 0`),

  check("chk_occupancy", sql`${table.currentOccupancy} >= 0 AND ${table.currentOccupancy} <= ${table.capacity}`),

  check("chk_occupancy_gender_safety", sql`
    (${table.currentOccupancy} = 0 AND ${table.allowedGender} = 'unassigned')
    OR (${table.currentOccupancy} > 0 AND ${table.allowedGender} != 'unassigned')
    OR (${table.allowedGender} = 'mixed')
  `),
]);

export const allocation = pgTable("allocation", t => ({
  id: t.integer().primaryKey().generatedAlwaysAsIdentity(),
  studentId: t.integer().notNull().references(() => student.id, { onDelete: "cascade" }),
  roomId: t.integer().notNull().references(() => room.id, { onDelete: "cascade" }),
  hostelId: t.integer().notNull().references(() => hostel.id, { onDelete: "cascade" }),
  allocationDate: t.date().notNull(),
  academicPeriod: academicPeriodEnum().default("first semester").notNull(),
  academicYear: t.varchar({ length: 9 }).notNull().default("2025/2026"), // e.g., "2023/2024"
  endDate: t.date(),
  status: allocationStatusEnum().default("pending").notNull(),
  createdAt: t.timestamp().defaultNow().notNull(),
  updatedAt: t.timestamp()
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
  companyId: t.integer().notNull().references(() => company.id, { onDelete: "restrict" }),
}), table => [
  check("chk_dates", sql`${table.endDate} IS NULL OR ${table.endDate} >= ${table.allocationDate}`),
  index("idx_allocation_student_status").on(table.studentId, table.status),
]);
