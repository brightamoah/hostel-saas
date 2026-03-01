import { relations } from "drizzle-orm";
import { pgEnum, pgTable, uniqueIndex } from "drizzle-orm/pg-core";

import { hostel } from "./room";
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
}), table => ({
  slugUnique: uniqueIndex("company_slug_unique").on(table.slug),
  nameUnique: uniqueIndex("company_name_unique").on(table.name),
}));

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
}), table => ({
  companyUserUnique: uniqueIndex("company_member_company_user_unique").on(table.companyId, table.userId),
}));

export const companyRelations = relations(company, ({ many }) => ({
  members: many(companyMember),
  hostels: many(hostel),
}));

export const companyMemberRelations = relations(companyMember, ({ one }) => ({
  company: one(company, {
    fields: [companyMember.companyId],
    references: [company.id],
  }),

  user: one(user, {
    fields: [companyMember.userId],
    references: [user.id],
  }),
}));
