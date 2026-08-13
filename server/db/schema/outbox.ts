import { pgEnum, snakeCase } from "drizzle-orm/pg-core";

export const outboxEmailStatusEnum = pgEnum("outbox_email_status", [
  "pending",
  "sent",
  "failed",
]);

export const emailTypeEnum = pgEnum("email_type", [
  "transactional",
  "support",
  "notification",
  "others",
]);

export const emailOutbox = snakeCase.table("email_outbox", t => ({
  id: t.uuid().primaryKey().defaultRandom(),
  recipientEmail: t.varchar({ length: 255 }).notNull(),
  recipientName: t.varchar({ length: 255 }),
  fromName: t.varchar({ length: 255 }).notNull(),
  fromEmail: t.varchar({ length: 255 }).notNull(),
  replyTo: t.varchar({ length: 255 }),
  subject: t.text().notNull(),
  html: t.text().notNull(),
  text: t.text(),
  emailType: emailTypeEnum().default("transactional").notNull(),
  status: outboxEmailStatusEnum().default("pending").notNull(),
  retryCount: t.integer().default(0).notNull(),
  lastError: t.text(),
  createdAt: t.timestamp().defaultNow().notNull(),
  sentAt: t.timestamp(),
}));
