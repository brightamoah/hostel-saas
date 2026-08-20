import type { H3Event } from "h3";

import { desc, eq } from "drizzle-orm";
import { outboxQueries } from "../db/queries/outbox";
import { allocation, company, companyMember, hostel, hostelSettings, student } from "../db/schema";
import { useDB } from "./db";

export interface ResolvedSenderContext {
  fromName: string;
  fromEmail: string;
  replyTo: string;
}

export interface SendEmailOptions {
  to: { name?: string | null; email: string };
  subject: string;
  html: string;
  text?: string | null;
  recipientUserId?: number;
  isTransactional?: boolean;
  emailType?: EmailType;
  hostelName?: string;
  attachments?: Array<{
    filename: string;
    key: string;
    mimeType: string;
  }>;
}

export async function resolveSenderContext(
  event?: H3Event,
  recipientUserId?: number,
  isTransactional = true,
  hostelNameOverride?: string,
): Promise<ResolvedSenderContext> {
  const runtimeConfig = useRuntimeConfig(event);
  const { db } = useDB(event);

  const defaultAppName = runtimeConfig.public.appName || runtimeConfig.emailFromName || "Kayanest";
  const defaultNoReplyEmail = runtimeConfig.emailNoReplyEmail || "no-reply@mails.kayanest.app";
  const defaultSupportEmail = runtimeConfig.supportEmail || "support@mails.kayanest.app";

  let hostelName: string | undefined = hostelNameOverride;
  let companyName: string | undefined;
  let hostelSupportEmail: string | undefined;

  if (recipientUserId) {
    try {
      const [activeAllocation] = await db
        .select({
          hostelName: hostel.name,
          companyName: company.name,
          hostelSupportEmail: hostelSettings.supportEmail,
        })
        .from(allocation)
        .innerJoin(student, eq(allocation.studentId, student.id))
        .innerJoin(hostel, eq(allocation.hostelId, hostel.id))
        .innerJoin(company, eq(allocation.companyId, company.id))
        .leftJoin(hostelSettings, eq(hostel.id, hostelSettings.hostelId))
        .where(eq(student.userId, recipientUserId))
        .orderBy(desc(allocation.createdAt))
        .limit(1);

      if (activeAllocation) {
        if (!hostelNameOverride) hostelName = activeAllocation.hostelName;
        companyName = activeAllocation.companyName;
        hostelSupportEmail = activeAllocation.hostelSupportEmail ?? undefined;
      }

      else {
        const [adminMember] = await db
          .select({
            companyName: company.name,
          })
          .from(companyMember)
          .innerJoin(company, eq(companyMember.companyId, company.id))
          .where(eq(companyMember.userId, recipientUserId))
          .limit(1);

        if (adminMember) {
          companyName = adminMember.companyName;
        }
      }
    }
    catch (e) {
      console.error("Error resolving sender context for user", recipientUserId, e);
    }
  }

  const fromName = hostelName ?? companyName ?? defaultAppName;
  const fromEmail = isTransactional ? defaultNoReplyEmail : defaultSupportEmail;
  const replyTo = hostelSupportEmail ?? defaultSupportEmail;

  return {
    fromName,
    fromEmail,
    replyTo,
  };
}

export async function enqueueApplicationEmail(
  event: H3Event | undefined,
  options: SendEmailOptions,
  txn?: DbOrTxn,
) {
  const senderContext = await resolveSenderContext(
    event,
    options.recipientUserId,
    options.isTransactional ?? true,
    options.hostelName,
  );

  const { enqueueEmail } = await outboxQueries(event);

  const result = await enqueueEmail(
    {
      recipientEmail: options.to.email,
      recipientName: options.to.name ?? null,
      fromName: senderContext.fromName,
      fromEmail: senderContext.fromEmail,
      replyTo: senderContext.replyTo,
      subject: options.subject,
      html: options.html,
      text: options.text ?? null,
      emailType: options.emailType ?? "transactional",
      attachments: options.attachments,
    },
    txn,
  );

  // Trigger dispatch immediately after enqueuing
  const dispatchPromise
    = runTask("dispatchEmailOutbox")
      .catch(err =>
        console.error("Failed to execute dispatchEmailOutbox task immediately:", err),
      );

  if (event) event.waitUntil(dispatchPromise);

  return result;
}
