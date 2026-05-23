import { getLocalTimeZone, today } from "@internationalized/date";
import { billingQueries, roomQueries } from "~~/server/db/queries";

export default defineEventHandler(async (event) => {
  const scope = await adminSessionCheck(event);
  const {
    companyId,
    hostelId,
    isPlatformAdmin,
    userId,
    adminData,
    companyRole,
  } = scope;
  const runtimeConfig = useRuntimeConfig(event);

  try {
    const body = await readValidatedBody(event, body => createBillingSchema.omit({ paymentTerms: true }).safeParse(body));

    if (!body.success) {
      throw createError({
        statusCode: 400,
        message: `${body.error.issues
          .map(i => i.message)
          .join(", ")}`,
      });
    }

    const {
      studentId,
      amount,
      academicPeriod,
      description,
      dueDate,
      type,
      sendNotification,
    } = body.data;

    if (!companyId && !isPlatformAdmin) {
      throw createError({
        statusCode: 403,
        message: "Unauthorized: No company association found.",
      });
    }

    const { createBilling } = await billingQueries();
    const { getAllocationByStudentId } = await roomQueries();

    const now = today(getLocalTimeZone());

    if (dueDate.compare(now) < 0) {
      throw createError({
        statusCode: 400,
        message: "Due date cannot be in the past.",
      });
    }

    const studentAllocation = await getAllocationByStudentId(studentId);

    if (!studentAllocation) {
      throw createError({
        statusCode: 404,
        message: "Student has no active room allocation to be billed.",
      });
    }

    const targetHostelId = studentAllocation?.room?.hostelId;

    if (!targetHostelId) {
      throw createError({
        statusCode: 400,
        message: "Student's room allocation is missing hostel information.",
      });
    }

    const mode = getScopeMode(scope);

    if (mode === "hostel" && hostelId !== targetHostelId) {
      throw createError({
        statusCode: 403,
        message: "Unauthorized: You can only create bills for students in your assigned hostel.",
      });
    }

    if (mode === "company" && studentAllocation?.room?.hostel?.companyId !== companyId) {
      throw createError({
        statusCode: 403,
        message: "Unauthorized: You can only create bills for students in your company.",
      });
    }

    const log = useLogger(event);

    const auditContext = getAuditContext({
      kind: "admin",
      event,
      scope: {
        isPlatformAdmin,
        companyId,
        hostelId,
        userId,
        adminData,
        companyRole: adminData?.accessLevel === "super"
          ? null
          : companyRole,
        isActiveAdmin: true,
        companyMemberStatus: "active",
      },
      target: {
        companyId: companyId ?? null,
        hostelId: hostelId ?? null,
      },
    });

    const newBilling = await createBilling({
      studentId,
      allocationId: studentAllocation.id,
      hostelId: targetHostelId,
      amount: amount.toString(),
      academicPeriod,
      description,
      status: "unpaid",
      dueDate: dueDate.toString(),
      type,
      companyId: isPlatformAdmin ? studentAllocation?.room!.hostel!.companyId : companyId!,
    }, auditContext);

    log.audit({
      action: "billing.create",
      actor: { type: "admin", id: scope.userId, adminId: scope.adminData.id },
      target: { type: "billing", id: newBilling.id },
      outcome: "success",
      reason: "Admin created a new billing record for a student.",
    });

    if (sendNotification) {
      const studentEmail = studentAllocation?.student?.user?.email;
      const studentName = studentAllocation?.student?.user?.name;
      const hostelName = studentAllocation?.room?.hostel?.name;

      const billingTemplate = getBillingTemplate({
        studentName: studentName ?? "Student",
        hostelName: hostelName ?? "Hostel",
        amount: formatCurrency(amount),
        purpose: type,
        dueDate: formatDate(dueDate.toString()),
        dashboardUrl: runtimeConfig.public.siteBaseUrl,
        invoiceNumber: `INV-${String(newBilling?.id).padStart(6, "0")}`,
        supportEmail: runtimeConfig.supportEmail,
      });

      try {
        if (import.meta.dev) {
          const { sendMail } = useNodeMailer();

          await sendMail({
            to: studentEmail,
            subject: `New Billing Created - ${hostelName}`,
            html: billingTemplate.html,
            text: billingTemplate.text,
          });
        }
        else {
          const mailer = await useWorkerMailer();

          await mailer.send({
            from: { name: runtimeConfig.emailFromName, email: runtimeConfig.emailFromEmail },
            to: { name: studentName!, email: studentEmail! },
            subject: "New Billing Created - Kings Hostel Management",
            html: billingTemplate.html,
            text: billingTemplate.text,
          });
        }
      }
      catch (emailError) {
        console.error("Failed to send verification email:", emailError);
      }
    }

    return {
      success: true,
      message: "Billing created successfully.",
      data: newBilling,
    };
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;

    handleError(error, "Create Billing", event);
  }
});
