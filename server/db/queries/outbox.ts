import type { H3Event } from "h3";

import { eq, sql } from "drizzle-orm";

import { useDB } from "~~/server/utils/db";
import { emailOutbox } from "../schema";

export interface EnqueueEmailInput {
  recipientEmail: string;
  recipientName?: string | null;
  fromName: string;
  fromEmail: string;
  replyTo?: string | null;
  subject: string;
  html: string;
  text?: string | null;
  emailType?: EmailType;
  attachments?: Array<{
    filename: string;
    key: string;
    mimeType: string;
  }>;
}

export async function outboxQueries(event?: H3Event) {
  const { db } = useDB(event);

  const enqueueEmail = async (
    input: EnqueueEmailInput,
    txn?: DbOrTxn,
  ) => {
    const client = txn ?? db;

    const [inserted] = await client
      .insert(emailOutbox)
      .values({
        recipientEmail: input.recipientEmail,
        recipientName: input.recipientName ?? null,
        fromName: input.fromName,
        fromEmail: input.fromEmail,
        replyTo: input.replyTo ?? null,
        subject: input.subject,
        html: input.html,
        text: input.text ?? null,
        emailType: input.emailType ?? "transactional",
        status: "pending",
        attachments: input.attachments ?? null,
      })
      .returning();

    return inserted;
  };

  const fetchPendingEmails = async (limit = 50) => {
    return db
      .query
      .emailOutbox
      .findMany({
        where: {
          status: "pending",
          retryCount: { lte: 5 },
        },
        orderBy: { createdAt: "asc" },
        limit,
      });
  };

  const markEmailSent = async (id: string) => {
    const [updated] = await db
      .update(emailOutbox)
      .set({
        status: "sent",
        sentAt: new Date(),
      })
      .where(eq(emailOutbox.id, id))
      .returning();

    return updated;
  };

  const markEmailFailed = async (id: string, error: string) => {
    const [updated] = await db
      .update(emailOutbox)
      .set({
        status: "failed",
        retryCount: sql`${emailOutbox.retryCount} + 1`,
        lastError: error,
      })
      .where(eq(emailOutbox.id, id))
      .returning();

    return updated;
  };

  return {
    enqueueEmail,
    fetchPendingEmails,
    markEmailSent,
    markEmailFailed,
  };
}
