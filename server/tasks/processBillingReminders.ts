import type { OverdueAndUpcomingBillings } from "~~/shared/types";

import { createError, createLogger } from "evlog";
import { billingRemindersLog } from "~~/server/db/schema";
import { billingQueries } from "../db/queries";

const BATCH_SIZE = 100;
const MAX_EMAILS_PER_RUN = 10000;

export default defineTask({
  meta: {
    name: "processBillingReminders",
    description: "Send automated upcoming and overdue billing reminders based on company settings.",
  },
  async run({ context }) {
    const { db } = useDB(context);
    const {
      getUpcomingBillingsBatch,
      getOverdueBillingsBatch,
      getExistingRemindersBatch,
    } = await billingQueries(context);

    const log = createLogger({
      task: "processBillingReminders",
      service: "scheduler",
    });

    log.set({ taskStatus: "started" });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      log.info("Fetching companies with billing reminder settings...");

      const companies = await db
        .query
        .company
        .findMany({
          with: {
            settings: true,
          },
          where: {
            OR: [
              { settings: { notifyOnUpcoming: true } },
              { settings: { notifyOnOverdue: true } },
            ],
          },
        });

      if (companies.length === 0) {
        log.warn("No companies found with billing reminder settings.");

        log.set({
          taskStatus: "completed",
          message: "No companies with reminder settings",
        });
        return { result: "success", emailsSent: 0 };
      }

      const companySettingsMap = new Map<number, {
        upcomingDays: Set<number>;
        overdueDays: Set<number>;
      }>();

      const companiesWithUpcoming: number[] = [];
      const companiesWithOverdue: number[] = [];

      for (const company of companies) {
        const settings = company.settings;

        if (!settings) continue;

        const upcomingDays = settings.upcomingReminderDays?.length > 0
          ? new Set(settings.upcomingReminderDays)
          : new Set<number>();

        const overdueDays = settings.overdueReminderDays?.length > 0
          ? new Set(settings.overdueReminderDays)
          : new Set<number>();

        if (upcomingDays.size > 0 || overdueDays.size > 0) {
          companySettingsMap.set(company.id, { upcomingDays, overdueDays });

          if (settings.notifyOnUpcoming && upcomingDays.size > 0) {
            companiesWithUpcoming.push(company.id);
          }

          if (settings.notifyOnOverdue && overdueDays.size > 0) {
            companiesWithOverdue.push(company.id);
          }
        }
      }

      const [upcomingBillings, overdueBillings] = await Promise.all([
        getUpcomingBillingsBatch(companiesWithUpcoming),
        getOverdueBillingsBatch(companiesWithOverdue),
      ]);

      log.info(`Found ${upcomingBillings.length} upcoming billings and ${overdueBillings.length} overdue billings`);

      const billingsByCompany = new Map<number, Array<{
        billing: OverdueAndUpcomingBillings[number];
        type: "upcoming" | "overdue";
        daysOffset: number;
        isOverdue: boolean;
      }>>();

      for (const billing of upcomingBillings) {
        const companyId = billing.companyId;
        const settings = companySettingsMap.get(companyId);

        if (!settings) continue;

        const dueDate = new Date(billing.dueDate);
        dueDate.setHours(0, 0, 0, 0);

        const diffTime = dueDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays >= 0 && settings.upcomingDays.has(diffDays)) {
          if (!billingsByCompany.has(companyId)) {
            billingsByCompany.set(companyId, []);
          }

          billingsByCompany.get(companyId)!.push({
            billing,
            type: "upcoming",
            daysOffset: diffDays,
            isOverdue: false,
          });
        }
      }

      for (const billing of overdueBillings) {
        const companyId = billing.companyId;
        const settings = companySettingsMap.get(companyId);

        if (!settings) continue;

        const dueDate = new Date(billing.dueDate);
        dueDate.setHours(0, 0, 0, 0);

        const diffTime = today.getTime() - dueDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > 0 && settings.overdueDays.has(diffDays)) {
          if (!billingsByCompany.has(companyId)) {
            billingsByCompany.set(companyId, []);
          }

          billingsByCompany.get(companyId)!.push({
            billing,
            type: "overdue",
            daysOffset: diffDays,
            isOverdue: true,
          });
        }
      }

      const allBillingIds = Array
        .from(billingsByCompany.values())
        .flat()
        .map(item => item.billing.id);

      const existingReminders = await getExistingRemindersBatch(allBillingIds);

      const existingReminderSet = new Set<string>(
        existingReminders.map(reminder => `${reminder.billingId}-${reminder.reminderType}-${reminder.daysOffset}`),
      );

      const emailTasks: Array<() => Promise<boolean>> = [];

      let totalEmailsToSend = 0;
      let skippedDueToNoEmail = 0;
      let skippedDueToExisting = 0;

      for (const [_companyId, items] of billingsByCompany) {
        for (const item of items) {
          if (!item.billing.student?.user?.email) {
            skippedDueToNoEmail++;
            continue;
          };

          const reminderKey = `${item.billing.id}-${item.type}-${item.daysOffset}`;

          if (existingReminderSet.has(reminderKey)) {
            skippedDueToExisting++;
            continue;
          };

          emailTasks.push(() => sendReminderEmail(
            db,
            item.billing,
            item.daysOffset,
            item.type,
            item.isOverdue,
          ));

          totalEmailsToSend++;

          if (totalEmailsToSend >= MAX_EMAILS_PER_RUN) {
            log.warn(`Reached max emails per run limit: ${MAX_EMAILS_PER_RUN}`);
            break;
          }
        }
        if (totalEmailsToSend >= MAX_EMAILS_PER_RUN) break;
      }

      log.info(`Prepared ${totalEmailsToSend} emails to send`);
      log.info(`Skipped ${skippedDueToNoEmail} due to missing email`);
      log.info(`Skipped ${skippedDueToExisting} due to existing reminders`);

      let emailsSent = 0;
      let failedEmails = 0;

      const totalBatches = Math.ceil(emailTasks.length / BATCH_SIZE);

      for (let i = 0; i < emailTasks.length; i += BATCH_SIZE) {
        const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
        const batch = emailTasks.slice(i, i + BATCH_SIZE);

        log.info(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} emails)`);

        const results = await Promise.all(batch.map(task => task()));
        const batchSent = results.filter(Boolean).length;
        const batchFailed = results.filter(r => r === false).length;

        emailsSent += batchSent;
        failedEmails += batchFailed;

        log.info(`Batch ${batchNumber} completed: ${batchSent} sent, ${batchFailed} failed`);

        log.set({
          emailsSent,
          progress: `${Math.min(i + BATCH_SIZE, emailTasks.length)}/${emailTasks.length}`,
          failedEmails,
        });

        if (i + BATCH_SIZE < emailTasks.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      log.info(`Task completed: ${emailsSent} emails sent, ${failedEmails} failed`);

      log.set({
        emailsSent,
        taskStatus: "success",
        failedEmails,
        totalProcessed: allBillingIds.length,
        totalSkipped: skippedDueToNoEmail + skippedDueToExisting,
      });

      log.emit();

      return {
        result: "success",
        emailsSent,
        failedEmails,
        totalProcessed: allBillingIds.length,
        totalSkipped: skippedDueToNoEmail + skippedDueToExisting,
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
        message: "Failed to process billing reminders",
        why: "An error occurred while executing the database query or audit log insertion.",
        fix: "Check the database connection, query logic, or audit log configuration.",
      }), "Process Billing Reminders");
    }
  },
});

async function sendReminderEmail(
  db: DbOrTxn,
  billingRecord: OverdueAndUpcomingBillings[number],
  daysOffset: number,
  reminderType: "upcoming" | "overdue",
  isOverdue: boolean,
): Promise<boolean> {
  const emailLogger = createLogger({
    task: "sendReminderEmail",
    service: "scheduler",
    billingId: billingRecord.id,
    reminderType,
    daysOffset,
  });

  const MAX_RETRIES = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const amountTotal = Number(billingRecord.amount);
      const amountPaid = Number(billingRecord.paidAmount);
      const amountDue = amountTotal - amountPaid;
      const user = billingRecord.student?.user;

      if (!user?.email) {
        emailLogger.warn(`No email for student ${billingRecord.studentId}`);
        return false;
      }

      emailLogger.info(`Preparing ${reminderType} reminder email for ${user.email} (attempt ${attempt}/${MAX_RETRIES})`);

      const { htmlTemplate, textTemplate, emailSubject } = getReminderEmailTemplate(
        String(user?.name),
        billingRecord.invoiceNumber,
        formatDate(billingRecord.dateIssued.toString()),
        formatDate(billingRecord.dueDate.toString()),
        formatMoney(amountTotal),
        formatMoney(amountPaid),
        formatMoney(amountDue),
        String(billingRecord.hostel?.name),
        String(billingRecord.hostel?.email ?? billingRecord.hostel?.supportEmail),
        String(billingRecord.hostel?.contactNumber ?? billingRecord.hostel?.supportPhone),
        String(billingRecord.hostel?.address),
        isOverdue,
      );

      const runtimeConfig = useRuntimeConfig();

      if (import.meta.dev) {
        const { sendMail } = useNodeMailer();
        await sendMail({
          to: user?.email,
          subject: emailSubject,
          html: htmlTemplate,
          text: textTemplate,
        });
      }
      else {
        const mailer = await useWorkerMailer();
        await mailer.send({
          from: {
            name: runtimeConfig.emailFromName || "Kayanest Hostel Management",
            email: runtimeConfig.supportEmail ?? runtimeConfig.emailFromEmail,
          },
          to: { name: user!.name, email: user!.email },
          subject: emailSubject,
          html: htmlTemplate,
          text: textTemplate,
        });
      }

      await db
        .insert(billingRemindersLog)
        .values({
          billingId: billingRecord.id,
          reminderType,
          daysOffset,
          sentAt: new Date(),
        });

      emailLogger.info(`Successfully sent ${reminderType} reminder to ${user.email}`);
      emailLogger.set({ taskStatus: "success" });
      emailLogger.emit();

      return true;
    }
    catch (error) {
      lastError = error as Error;

      emailLogger.warn(`Attempt ${attempt}/${MAX_RETRIES} failed for ${reminderType} reminder`, {
        error: lastError.message,
        email: billingRecord.student?.user?.email,
      });

      if (attempt < MAX_RETRIES) {
        const backoffDelay = 1000 * 2 ** (attempt - 1);
        emailLogger.warn(`Waiting ${backoffDelay}ms before retry`);
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
      }
    }
  }

  emailLogger.error(`Failed to send ${reminderType} reminder after ${MAX_RETRIES} attempts`, {
    billingId: billingRecord.id,
    studentEmail: billingRecord.student?.user?.email,
    lastError: lastError?.message,
  });
  emailLogger.set({ taskStatus: "failed" });
  emailLogger.emit();

  return false;
}
