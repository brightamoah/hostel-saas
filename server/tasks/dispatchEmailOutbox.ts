import type { EmailAttachment } from "~~/shared/types";
import { Buffer } from "node:buffer";
import { createError, createLogger } from "evlog";
import { outboxQueries } from "~~/server/db/queries/outbox";
import { useWorkerMailer } from "~~/server/utils/workerMailer";

export default defineTask({
  meta: {
    name: "dispatchEmailOutbox",
    description: "Process queued transactional emails from email_outbox table",
  },
  async run({ context }) {
    const log = createLogger({
      task: "dispatchEmailOutbox",
      service: "scheduler",
    });

    log.set({ taskStatus: "started" });

    try {
      const {
        fetchPendingEmails,
        markEmailSent,
        markEmailFailed,
      } = await outboxQueries();

      const pendingEmails = await fetchPendingEmails(500);

      if (!pendingEmails.length) {
        log.set({
          count: 0,
          taskStatus: "completed",
        });

        log.emit();

        return {
          result: "No pending emails to dispatch.",
        };
      }

      const getAttachments = async (attachments: unknown): Promise<EmailAttachment[] | undefined> => {
        if (!Array.isArray(attachments) || attachments.length === 0) return undefined;

        const cfBucket = context?.cloudflare?.env?.BUCKET;
        const storage = useStorage("images");
        const loaded: EmailAttachment[] = [];

        for (const item of attachments) {
          if (!item || typeof item !== "object") continue;

          const attachment = item as Record<string, unknown>;

          if (typeof attachment.key !== "string") continue;

          try {
            const fileData = cfBucket
              ? await cfBucket.get(attachment.key).then(object => object?.arrayBuffer())
              : await storage.getItemRaw(attachment.key);

            if (!fileData) continue;

            const buffer = Buffer.isBuffer(fileData)
              ? fileData
              : Buffer.from(fileData);

            loaded.push({
              filename: typeof attachment.filename === "string"
                ? attachment.filename
                : "attachment",

              content: import.meta.dev
                ? buffer
                : buffer.toString("base64"),

              mimeType: typeof attachment.mimeType === "string"
                ? attachment.mimeType
                : "application/octet-stream",
            });
          }
          catch (e) {
            console.error(`Failed to fetch attachment ${attachment.key}:`, e);
          }
        }
        return loaded.length ? loaded : undefined;
      };

      let sentCount = 0;
      let failCount = 0;

      if (import.meta.dev) {
        const { sendMail } = useNodeMailer();

        for (const email of pendingEmails) {
          try {
            const mailAttachments = await getAttachments(email.attachments);

            await sendMail({
              from: `"${email.fromName}" <${email.fromEmail}>`,
              to: email.recipientEmail,
              subject: email.subject,
              html: email.html,
              text: email.text ?? undefined,
              attachments: mailAttachments,
            });

            await markEmailSent(email.id);
            sentCount++;
          }
          catch (error: unknown) {
            console.error(`Failed to dispatch email ID ${email.id} to ${email.recipientEmail}:`, error);

            const errorMessage = error instanceof Error
              ? error.message
              : String(error);

            await markEmailFailed(email.id, errorMessage);
            failCount++;
          }
        }
      }
      else {
        let mailer: Awaited<ReturnType<typeof useWorkerMailer>> | null = null;
        try {
          mailer = await useWorkerMailer();
        }
        catch (err) {
          console.error("Failed to connect WorkerMailer for outbox task:", err);
          log.set({ taskStatus: "failed" });
          log.emit();
          return {
            result: "WorkerMailer connection error",
            error: String(err),
          };
        }

        for (const email of pendingEmails) {
          try {
            const mailAttachments = await getAttachments(email.attachments);

            await mailer.send({
              from: {
                name: email.fromName,
                email: email.fromEmail,
              },
              to: {
                name: email.recipientName ?? email.recipientEmail,
                email: email.recipientEmail,
              },
              ...(email.replyTo
                ? { replyTo: email.replyTo }
                : {}
              ),

              subject: email.subject,
              html: email.html,
              text: email.text ?? undefined,
              attachments: mailAttachments as {
                filename: string;
                content: string;
                mimeType?: string;
              }[] | undefined,
            });

            await markEmailSent(email.id);
            sentCount++;
          }
          catch (error: unknown) {
            console.error(`Failed to dispatch email ID ${email.id} to ${email.recipientEmail}:`, error);

            const errorMessage = error instanceof Error ? error.message : String(error);

            await markEmailFailed(email.id, errorMessage);
            failCount++;
          }
          finally {
            await mailer.close?.();
          }
        }
      }

      log.set({
        count: pendingEmails.length,
        sentCount,
        failCount,
        taskStatus: "completed",
      });

      log.emit();

      return {
        result: `Processed ${pendingEmails.length} emails. Sent: ${sentCount}, Failed: ${failCount}`,
      };
    }
    catch (error) {
      if (error && typeof error === "object" && "statusCode" in error) {
        log.set({ taskStatus: "failed" });
        log.emit();
        throw error;
      }

      log.set({ taskStatus: "failed" });
      log.emit();
      handleError(createError({
        cause: error as Error,
        message: "Failed to dispatch email outbox",
        why: "An error occurred while executing the database queries or sending emails.",
        fix: "Check the database connection, query logic, or email provider configuration.",
      }), "Dispatch Email Outbox");
    }
  },
});
