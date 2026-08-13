import { outboxQueries } from "~~/server/db/queries/outbox";
import { useWorkerMailer } from "~~/server/utils/workerMailer";

export default defineTask({
  meta: {
    name: "dispatchEmailOutbox",
    description: "Process queued transactional emails from email_outbox table",
  },
  async run() {
    const {
      fetchPendingEmails,
      markEmailSent,
      markEmailFailed,
    } = await outboxQueries();
    const pendingEmails = await fetchPendingEmails(200);

    if (!pendingEmails.length) return { result: "No pending emails to dispatch." };

    let sentCount = 0;
    let failCount = 0;

    if (import.meta.dev) {
      const { sendMail } = useNodeMailer();
      for (const email of pendingEmails) {
        try {
          await sendMail({
            from: `"${email.fromName}" <${email.fromEmail}>`,
            to: email.recipientEmail,
            subject: email.subject,
            html: email.html,
            text: email.text ?? undefined,
          });

          await markEmailSent(email.id);
          sentCount++;
        }
        catch (error: any) {
          console.error(`Failed to dispatch email ID ${email.id} to ${email.recipientEmail}:`, error);
          await markEmailFailed(email.id, error?.message || String(error));
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
        return { result: "WorkerMailer connection error", error: String(err) };
      }

      for (const email of pendingEmails) {
        try {
          await mailer.send({
            from: {
              name: email.fromName,
              email: email.fromEmail,
            },
            to: {
              name: email.recipientName ?? email.recipientEmail,
              email: email.recipientEmail,
            },
            ...(email.replyTo ? { replyTo: email.replyTo } : {}),
            subject: email.subject,
            html: email.html,
            text: email.text ?? undefined,
          });

          await markEmailSent(email.id);
          sentCount++;
        }
        catch (error: any) {
          console.error(`Failed to dispatch email ID ${email.id} to ${email.recipientEmail}:`, error);
          await markEmailFailed(email.id, error?.message || String(error));
          failCount++;
        }
      }

      if (mailer && typeof mailer.close === "function") {
        try {
          await mailer.close();
        }
        catch {}
      }
    }

    return {
      result: `Processed ${pendingEmails.length} emails. Sent: ${sentCount}, Failed: ${failCount}`,
    };
  },
});
