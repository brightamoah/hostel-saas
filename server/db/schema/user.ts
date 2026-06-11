import { sql } from "drizzle-orm";
import {
  check,
  pgEnum,
  pgTable,
} from "drizzle-orm/pg-core";

import { company } from "./company";
import { hostel } from "./room";

export const rolesEnum = pgEnum("roles", [
  "student",
  "admin",
]);

export const genderEnum = pgEnum("gender", [
  "male",
  "female",
]);

export const residencyStatusEnum = pgEnum("residency_status", [
  "active",
  "inactive",
  "suspended",
  "graduated",
  "withdrawn",
]);

export const accessLevelEnum = pgEnum("access_level", [
  "regular",
  "super",
  "support",
]);

export const adminStatusEnum = pgEnum("admin_status", [
  "active",
  "inactive",
]);

export const user = pgTable("user", t => ({
  id: t.integer().primaryKey().generatedAlwaysAsIdentity(),
  name: t.varchar({ length: 255 }).notNull(),
  email: t.varchar({ length: 255 }).notNull().unique(),
  password: t.text().notNull(),
  role: rolesEnum().default("student").notNull(),
  image: t.text(),
  emailVerified: t.boolean().default(false).notNull(),
  verificationToken: t.text(),
  verificationTokenExpiresAt: t.timestamp(),
  resetToken: t.text(),
  resetTokenExpiresAt: t.timestamp(),
  createdAt: t.timestamp().defaultNow().notNull(),
  updatedAt: t.timestamp()
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
  lastLogin: t.timestamp(),
}));

export const student = pgTable("student", t => ({
  id: t.integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: t.integer().notNull().references(() => user.id, { onDelete: "cascade" }),
  gender: genderEnum().notNull(),
  dateOfBirth: t.date().notNull(),
  phoneNumber: t.varchar({ length: 20 }).notNull(),
  address: t.text().notNull(),
  emergencyContactName: t.text().notNull(),
  emergencyContactPhoneNumber: t.varchar({ length: 20 }).notNull(),
  emergencyContactEmail: t.varchar({ length: 255 }),
  healthConditions: t.text(),
  enrollmentDate: t.date(),
  residencyStatus: residencyStatusEnum().default("inactive").notNull(),
  companyId: t.integer().references(() => company.id, { onDelete: "restrict" }),
  hostelId: t.integer().references(() => hostel.id, { onDelete: "restrict" }),
  createdAt: t.timestamp().defaultNow().notNull(),
  updatedAt: t.timestamp()
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
}));

export const admin = pgTable("admin", t => ({
  id: t.integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: t.integer().notNull().references(() => user.id, { onDelete: "cascade" }),
  phoneNumber: t.varchar({ length: 20 }).notNull(),
  department: t.text().notNull(),
  accessLevel: accessLevelEnum().default("regular").notNull(),
  hostelId: t.integer().references(() => hostel.id, { onDelete: "set null" }),
  status: adminStatusEnum().default("active").notNull(),
  createdAt: t.timestamp().defaultNow().notNull(),
  updatedAt: t.timestamp()
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
  companyId: t.integer().references(() => company.id, { onDelete: "restrict" }),
}), () => [
  check("chk_admin_scope", sql`
    (
      access_level = 'super'
      AND hostel_id IS NULL
      AND company_id IS NULL
    )
    OR
    (
      access_level IN ('regular', 'support')
      AND hostel_id IS NOT NULL
      AND company_id IS NOT NULL
    )
  `),
]);

export const loginAttempts = pgTable("login_attempts", t => ({
  id: t.integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: t.integer().references(() => user.id, { onDelete: "cascade" }),
  ip: t.text().notNull(),
  timestamp: t.timestamp().notNull(),
  success: t.boolean().notNull(),
}));

export type UserWithRelations = typeof user & {
  student?: typeof student;
  admin?: typeof admin;
};
