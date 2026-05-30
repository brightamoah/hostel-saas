import { sql } from "drizzle-orm";
import { pgEnum, pgTable, uniqueIndex } from "drizzle-orm/pg-core";

import { academicPeriodEnum } from "./room";
import { user } from "./user";

export const companyStatusEnum = pgEnum("company_status", [
  "active",
  "inactive",
]);

export const companyMemberRoleEnum = pgEnum("company_member_role", [
  "owner",
  "admin",
  "finance",
  "support",
  "staff",
]);

export const companyMemberStatusEnum = pgEnum("company_member_status", [
  "active",
  "invited",
  "disabled",
]);

export const lateFeeTypeEnum = pgEnum("late_fee_type", ["flat", "percent"]);

export const paystackAccountTypeEnum = pgEnum("paystack_account_type", [
  "bank_account",
  "mobile_money",
]);

export const company = pgTable("company", t => ({
  id: t.integer().primaryKey().generatedAlwaysAsIdentity(),
  name: t.text().notNull(),
  slug: t.varchar({ length: 80 }).notNull(),
  status: companyStatusEnum().default("active").notNull(),
  createdAt: t.timestamp().defaultNow().notNull(),
  updatedAt: t.timestamp({ withTimezone: true })
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
}), table => [
  uniqueIndex("company_slug_unique").on(table.slug),
  uniqueIndex("company_name_unique").on(table.name),
]);

export const companyMember = pgTable("company_member", t => ({
  id: t.integer().primaryKey().generatedAlwaysAsIdentity(),
  companyId: t.integer().notNull().references(() => company.id, { onDelete: "cascade" }),
  userId: t.integer().notNull().references(() => user.id, { onDelete: "cascade" }),
  role: companyMemberRoleEnum().default("staff").notNull(),
  status: companyMemberStatusEnum().default("active").notNull(),
  createdAt: t.timestamp().defaultNow().notNull(),
  updatedAt: t.timestamp({ withTimezone: true })
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
}), table => [
  uniqueIndex("company_member_company_user_unique").on(table.companyId, table.userId),
]);

export const companySettings = pgTable("company_settings", t => ({
  id: t.integer().primaryKey().generatedAlwaysAsIdentity(),
  companyId: t.integer().notNull().references(() => company.id, { onDelete: "cascade" }),

  paystackSubaccountCode: t.varchar({ length: 100 }),
  paystackSubaccountId: t.varchar({ length: 100 }),
  paystackBusinessName: t.varchar({ length: 255 }),
  paystackBankCode: t.varchar({ length: 10 }),
  paystackAccountNumber: t.varchar({ length: 20 }),
  paystackAccountType: paystackAccountTypeEnum(),
  paystackPercentageCharge: t.numeric({ precision: 5, scale: 2 }).default("100.00"),
  paystackSettlementBank: t.varchar({ length: 100 }),
  paystackIsVerified: t.boolean().default(false).notNull(),

  logoUrl: t.text(),
  faviconUrl: t.text(),
  primaryColor: t.varchar({ length: 32 }),
  accentColor: t.varchar({ length: 32 }),
  companyWebsite: t.text(),

  supportEmail: t.varchar({ length: 255 }),
  supportPhone: t.varchar({ length: 30 }),
  billingEmail: t.varchar({ length: 255 }),
  invoiceFooterText: t.text(),
  termsUrl: t.text(),
  privacyUrl: t.text(),

  lateFeeEnabled: t.boolean().default(false).notNull(),
  lateFeeType: lateFeeTypeEnum().default("flat").notNull(),
  lateFeeValue: t.numeric({ precision: 10, scale: 2 }).default("0.00").notNull(),
  lateFeeGracePeriodDays: t.integer().default(0).notNull(),
  autoSendInvoices: t.boolean().default(true).notNull(),
  invoiceDueDays: t.integer().default(7).notNull(),
  allowPartialPayments: t.boolean().default(true).notNull(),
  minimumPartialPaymentPercent: t
    .numeric({ precision: 5, scale: 2 })
    .default("20.00")
    .notNull(),

  notifyOnPayment: t.boolean().default(true).notNull(),
  notifyOnOverdue: t.boolean().default(true).notNull(),
  notifyOnAllocation: t.boolean().default(true).notNull(),
  notifyOnMaintenance: t.boolean().default(true).notNull(),
  overdueReminderDays: t
    .integer()
    .array()
    .default(sql`ARRAY[3,7,14]::integer[]`)
    .notNull(),

  allowStudentSelfCheckout: t.boolean().default(true).notNull(),
  allowStudentViewRoommates: t.boolean().default(true).notNull(),
  allowStudentMaintenanceRequests: t.boolean().default(true).notNull(),
  allowStudentComplaints: t.boolean().default(true).notNull(),
  studentPortalMessage: t.text(),

  defaultAcademicYear: t.varchar({ length: 9 }).default("2025/2026").notNull(),
  defaultAcademicPeriod: academicPeriodEnum().default("first semester").notNull(),

  createdAt: t.timestamp().defaultNow().notNull(),
  updatedAt: t
    .timestamp()
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
}));
