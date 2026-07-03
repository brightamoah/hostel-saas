import { z } from "zod";
import { auditLogQueries, billingQueries } from "~~/server/db/queries";
import { formatDate, formatMoney } from "~~/server/utils/formatters";
import { adminSessionCheck } from "~~/server/utils/sessionChecks";

const bodySchema = z.object({
  billingId: z.number().int().positive(),
});

export default defineEventHandler(async (event) => {
  const scope = await adminSessionCheck(event);

  try {
    const body = await readValidatedBody(event, body => bodySchema.safeParse(body));
    if (!body.success) {
      throw createError({
        statusCode: 400,
        message: body
          .error
          .issues
          .map(i => i.message)
          .join(", "),
      });
    }

    const { billingId } = body.data;

    const { getBillingById } = await billingQueries(event);
    const billingRecord = await getBillingById(billingId, scope);

    if (!billingRecord) {
      throw createError({
        statusCode: 404,
        message: "Billing record not found or access denied.",
      });
    }

    if (billingRecord.status === "fully paid" || billingRecord.status === "cancelled") {
      throw createError({
        statusCode: 400,
        message: `Cannot send reminder for a ${billingRecord.status} invoice.`,
      });
    }

    const studentUser = billingRecord.student?.user;
    if (!studentUser || !studentUser.email) {
      throw createError({
        statusCode: 400,
        message: "Student email not found.",
      });
    }

    const runtimeConfig = useRuntimeConfig();
    const amountTotal = Number(billingRecord.amount);
    const amountPaid = Number(billingRecord.paidAmount);
    const amountDue = amountTotal - amountPaid;
    const isOverdue = billingRecord.status === "overdue";

    const { htmlTemplate, textTemplate, emailSubject } = getReminderEmailTemplate(
      studentUser.name,
      billingRecord.invoiceNumber,
      formatDate(billingRecord.dateIssued.toString()),
      formatDate(billingRecord.dueDate.toString()),
      formatMoney(amountTotal),
      formatMoney(amountPaid),
      formatMoney(amountDue),
      billingRecord.hostel?.name ?? "",
      billingRecord.hostel?.email ?? billingRecord.hostel?.supportEmail ?? undefined,
      billingRecord.hostel?.contactNumber ?? billingRecord.hostel?.supportPhone ?? undefined,
      billingRecord.hostel?.address ?? undefined,
      isOverdue,
    );

    if (import.meta.dev) {
      const { sendMail } = useNodeMailer();
      await sendMail({
        to: studentUser.email,
        subject: emailSubject,
        html: htmlTemplate,
        text: textTemplate,
      });
    }
    else {
      const mailer = await useWorkerMailer();
      await mailer.send({
        from: {
          name: runtimeConfig.emailFromName,
          email: runtimeConfig.supportEmail ?? runtimeConfig.emailFromEmail,
        },
        to: { name: studentUser.name, email: studentUser.email },
        subject: emailSubject,
        html: htmlTemplate,
        text: textTemplate,
      });
    }

    const { useDB } = await import("~~/server/utils/db");
    const { db } = useDB(event);
    const { logAudit } = await auditLogQueries(event);

    const auditContext = getAuditContext({
      kind: "admin",
      event,
      scope,
      target: {
        companyId: scope.companyId ?? null,
        hostelId: scope.hostelId ?? null,
      },
    });

    await logAudit(db, auditContext, {
      entityId: billingId,
      entityType: "billing",
      actionType: "OTHER",
      action: "billing.send_manual_reminder",
      description: `Sent manual payment reminder for invoice ${billingRecord.invoiceNumber} to ${studentUser.email}`,
      before: null,
      after: {
        invoiceNumber: billingRecord.invoiceNumber,
        amountDue,
      },
    });

    return {
      success: true,
      message: `Payment reminder sent successfully to ${studentUser.email}.`,
    };
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;
    handleError(error, "Send Payment Reminder", event);
  }
});
