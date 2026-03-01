import { relations } from "drizzle-orm";
import { pgTable, uniqueIndex } from "drizzle-orm/pg-core";

import { user } from "./user";

export const authHandoffToken = pgTable("auth_handoff_token", t => ({
  id: t.integer().primaryKey().generatedAlwaysAsIdentity(),
  tokenHash: t.text().notNull(),
  userId: t.integer().notNull().references(() => user.id, { onDelete: "cascade" }),

  expiresAt: t.timestamp().notNull(),
  usedAt: t.timestamp(),

  createdAt: t.timestamp().defaultNow().notNull(),
  updatedAt: t.timestamp()
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
}), table => [
  uniqueIndex("auth_handoff_token_hash_unique").on(table.tokenHash),
]);

export const authHandoffTokenRelations = relations(authHandoffToken, ({ one }) => ({
  user: one(user, {
    fields: [authHandoffToken.userId],
    references: [user.id],
  }),
}));
