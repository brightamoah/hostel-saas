import { userQueries } from "~~/server/db/queries";
import { enqueueApplicationEmail } from "~~/server/utils/emailSender";
import { formatDate, formatMoney } from "~~/server/utils/formatters";
import { getInvoiceEmailTemplate } from "~~/server/utils/invoiceEmailTemplate";
import { emailInvoiceSchema } from "~~/shared/utils/schema";

export default defineEventHandler(async (event) => {
  const { user } = await requirePortalUserSession(event, {
    message: "Unauthorized Access: Please log in to continue.",
  });

  try {
    const body = await readMultipartFormData(event);
    if (!body) {
      throw createError({
        statusCode: 400,
        message: "No file uploaded",
      });
    }

    const getField = (name: string) => body.find(p => p.name === name)?.data.toString();

    const filePart = body.find(p => p.name === "file");

    if (!filePart) throw createError({ statusCode: 400, message: "PDF missing" });

    const rawData = {
      studentEmail: getField("studentEmail"),
      studentName: getField("studentName"),
      invoiceNumber: getField("invoiceNumber"),
      studentUserId: getField("studentUserId") ? Number(getField("studentUserId")) : undefined,
      amountTotal: getField("amountTotal") ? Number(getField("amountTotal")) : undefined,
      amountPaid: getField("amountPaid") ? Number(getField("amountPaid")) : undefined,
      amountDue: getField("amountDue") ? Number(getField("amountDue")) : undefined,
      dateIssued: getField("dateIssued"),
      dateDue: getField("dateDue"),
      amount: getField("amount") ? Number(getField("amount")) : undefined,
    };

    const validatedData = emailInvoiceSchema.safeParse(rawData);

    if (!validatedData.success) {
      throw createError({
        statusCode: 400,
        message: `Invalid request data: ${validatedData.error.issues
          .map(i => i.message)
          .join(", ")}`,
      });
    }

    const {
      studentEmail,
      studentName,
      invoiceNumber,
      studentUserId,
      amountTotal,
      amountPaid,
      dateIssued,
      dateDue,
      amountDue,
    } = validatedData.data;

    const isAdmin = user.role === "admin";
    const isOwner = user.role === "student" && Number(studentUserId) === user.id;

    if (!isAdmin && !isOwner) {
      throw createError({
        statusCode: 403,
        message: "Access denied",
      });
    }

    const { getStudentWithRelations } = await userQueries(event);

    const student = await getStudentWithRelations(studentUserId);

    if (!student) {
      throw createError({
        statusCode: 404,
        message: "Student Record not found",
      });
    }

    const studentsActiveAllocation = student.allocations.find(a => a.status === "active" || a.status === "pending");

    // const runtimeConfig = useRuntimeConfig();

    const { htmlTemplate, textTemplate } = getInvoiceEmailTemplate(
      studentName,
      invoiceNumber,
      formatDate(dateIssued),
      formatDate(dateDue),
      formatMoney(amountTotal),
      formatMoney(amountPaid),
      formatMoney(amountDue),
      studentsActiveAllocation?.room?.hostel?.name ?? "",
      (studentsActiveAllocation?.room?.hostel?.email ?? studentsActiveAllocation?.room?.hostel?.supportEmail) ?? undefined,
      (studentsActiveAllocation?.room?.hostel?.contactNumber ?? studentsActiveAllocation?.room?.hostel?.supportPhone) ?? undefined,
      studentsActiveAllocation?.room?.hostel?.address ?? undefined,
    );

    const hostelName = studentsActiveAllocation?.room?.hostel?.name ?? "Hostel";
    const emailSubject = `Invoice #${invoiceNumber} from ${hostelName}`;

    try {
      const storage = useStorage("images");
      const attachmentKey = `attachments/user-${studentUserId}/${Date.now()}-invoice-${invoiceNumber}.pdf`;
      const filename = `invoice-${invoiceNumber}.pdf`;

      await storage.setItemRaw(attachmentKey, filePart.data, {
        httpMetadata: {
          contentType: "application/pdf",
        },
      });

      await enqueueApplicationEmail(event, {
        to: { name: studentName, email: studentEmail },
        subject: emailSubject,
        html: htmlTemplate,
        text: textTemplate,
        recipientUserId: studentUserId,
        hostelName: studentsActiveAllocation?.room?.hostel?.name ?? undefined,
        attachments: [
          {
            filename,
            key: attachmentKey,
            mimeType: "application/pdf",
          },
        ],
      });
    }
    catch (emailError) {
      console.error("Failed to enqueue invoice email:", emailError);
    }

    const { logAudit } = await (await import("~~/server/db/queries/auditLog")).auditLogQueries(event);
    const { useDB } = await import("~~/server/utils/db");
    const { db } = useDB(event);

    const adminData = user.adminData;

    const auditContext = user.role === "admin" && adminData
      ? getAuditContext({
          kind: "admin",
          event,
          scope: {
            isPlatformAdmin: adminData.accessLevel === "super",
            companyId: user.companyId ?? null,
            hostelId: adminData.hostelId ?? null,
            userId: user.id,
            adminData,
            companyRole: user.companyRole ?? null,
            isActiveAdmin: true,
            companyMemberStatus: "active",
          } as any,
          target: {
            companyId: user.companyId ?? null,
            hostelId: adminData.hostelId ?? null,
          },
        })
      : getAuditContext({
          kind: "student",
          event,
          userId: user.id,
          companyId: user.companyId!,
          hostelId: null,
        });

    await logAudit(db as any, auditContext, {
      entityId: null,
      entityType: "billing",
      actionType: "OTHER",
      action: "billing.email_invoice",
      description: `${auditContext.actor.actorType} emailed invoice ${invoiceNumber} to ${studentEmail} for studentUserId=${studentUserId}`,
      before: null,
      after: {
        invoiceNumber,
        studentEmail,
        studentUserId,
        amountTotal,
        amountPaid,
        amountDue,
        dateIssued,
        dateDue,
      },
    });

    return {
      success: true,
      message: `Invoice email sent to ${studentEmail} successfully.`,
    };
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;

    handleError(error, "Generate Invoice PDF", event);
  }
});
