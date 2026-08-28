import { sql } from "drizzle-orm";
import { check, pgEnum, snakeCase, uniqueIndex } from "drizzle-orm/pg-core";

import { company } from "./company";
import { academicPeriodEnum, allocation, hostel } from "./room";
import { student } from "./user";

export const billingStatus = pgEnum("billing_status", [
  "unpaid",
  "fully paid",
  "partially paid",
  "overdue",
  "cancelled",
]);

export const billingType = pgEnum("billing_type", [
  "hostel fee",
  "security deposit",
  "utility fee",
  "maintenance fee",
  "late payment penalty",
  "other",
]);

export const paymentMethod = pgEnum("payment_method", [
  "card",
  "mobile money",
  "bank transfer",
  "cash",
  "other",
]);

export const paymentStatus = pgEnum("payment_status", [
  "completed",
  "failed",
  "pending",
  "refunded",
]);



export const paymentSplitTypeEnum = pgEnum("payment_split_type", [
  "company",
  "hostel",
  "platform",
]);

export const reminderType = pgEnum("reminder_type", [
  "upcoming",
  "overdue",
]);

export const billing = snakeCase.table("billing", t => ({
  id: t.integer().primaryKey().generatedAlwaysAsIdentity(),
  studentId: t.integer().notNull().references(() => student.id, { onDelete: "cascade" }),
  allocationId: t.integer().notNull().references(() => allocation.id, { onDelete: "restrict" }),
  hostelId: t.integer().notNull().references(() => hostel.id, { onDelete: "restrict" }),
  amount: t.numeric({ precision: 10, scale: 2 }).notNull(),
  type: billingType().default("hostel fee").notNull(),
  academicPeriod: academicPeriodEnum().default("first semester").notNull(),
  description: t.text().notNull(),
  dateIssued: t.timestamp().defaultNow().notNull(),
  dueDate: t.date().notNull(),
  status: billingStatus().default("unpaid").notNull(),
  lateFee: t.numeric({ precision: 10, scale: 2 }).default("0.00"),
  paidAmount: t.numeric({ precision: 10, scale: 2 }).default("0.00"),
  companyId: t.integer().notNull().references(() => company.id, { onDelete: "restrict" }),
  createdAt: t.timestamp().defaultNow().notNull(),
  updatedAt: t.timestamp()
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
}), () => [
  check("chk_paid_amount", sql`paid_amount >= 0 AND paid_amount <= (amount + COALESCE(late_fee, 0))`),
]);

export const payment = snakeCase.table("payment", t => ({
  id: t.integer().primaryKey().generatedAlwaysAsIdentity(),
  studentId: t.integer().notNull().references(() => student.id, { onDelete: "cascade" }),
  billingId: t.integer().notNull().references(() => billing.id, { onDelete: "cascade" }),
  amount: t.numeric({ precision: 10, scale: 2 }).notNull(),
  paymentDate: t.timestamp().defaultNow().notNull(),
  transactionReference: t.text().notNull().unique(),
  paymentMethod: paymentMethod().notNull(),
  status: paymentStatus().default("pending").notNull(),
  companyId: t.integer().notNull().references(() => company.id, { onDelete: "restrict" }),
  paystackSubaccountCode: t.varchar({ length: 100 }),
  splitType: paymentSplitTypeEnum().default("company").notNull(),
  createdAt: t.timestamp().defaultNow().notNull(),
  updatedAt: t.timestamp()
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
}));

export const billingRemindersLog = snakeCase.table("billing_reminders_log", t => ({
  id: t.integer().primaryKey().generatedAlwaysAsIdentity(),
  billingId: t.integer().notNull().references(() => billing.id, { onDelete: "cascade" }),
  reminderType: reminderType().notNull(), // 'upcoming' or 'overdue'
  daysOffset: t.integer().notNull(), // E.g., 3, 7, 14, 0
  sentAt: t.timestamp().defaultNow().notNull(),
}), table => [
  uniqueIndex("billing_reminder_unique").on(table.billingId, table.reminderType, table.daysOffset),
]);
