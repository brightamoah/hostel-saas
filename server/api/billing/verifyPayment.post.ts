import { billingQueries } from "~~/server/db/queries";

export default defineEventHandler(async (event) => {
  const { user } = await requirePortalUserSession(event);

  try {
    const body = await readValidatedBody(event, body => verifyPaymentSchema.safeParse(body));

    if (!body.success) {
      throw createError({
        statusCode: 400,
        message: `${body.error.issues
          .map(i => i.message)
          .join(", ")}`,
      });
    }

    const { billingId, reference } = body.data;

    const {
      checkExistingPayment,
      processSuccessfulPayment,
      markPaymentAsFailed,
      getBillingByIdStudent,

    } = await billingQueries();

    const existingPayment = await checkExistingPayment(reference);

    if (!existingPayment) {
      throw createError({
        statusCode: 404,
        message: "Payment reference not found in system.",
      });
    }

    if (existingPayment.status === "completed") {
      throw createError({
        statusCode: 400,
        message: "This payment has already been verified and completed.",
      });
    }

    const currentBilling = await getBillingByIdStudent(billingId);

    if (!currentBilling) {
      throw createError({
        statusCode: 404,
        message: "Billing record not found.",
      });
    }

    const billingHostelId = "hostelId" in currentBilling && typeof currentBilling.hostelId === "number"
      ? currentBilling.hostelId
      : null;

    const verifyResponse = await verifyPaystackTransaction(reference);

    const surface = getSurface(event);

    const isAdmin = surface === "admin";

    const auditContext = user.role === "admin" && isAdmin
      ? getAuditContext({
          kind: "admin",
          event,
          scope: {
            isPlatformAdmin: user.adminData?.accessLevel === "super",
            companyId: user.companyId ?? null,
            hostelId: user.adminData?.hostelId ?? undefined,
            userId: user.id,
            adminData: user.adminData!,
            companyRole: user.adminData?.accessLevel === "super"
              ? null
              : user.companyRole!,
            isActiveAdmin: true,
            companyMemberStatus: "active",
          },
          target: {
            companyId: existingPayment.companyId ?? null,
            hostelId: billingHostelId,
          },
        })
      : getAuditContext({
          kind: "student",
          companyId: existingPayment.companyId ?? null,
          hostelId: billingHostelId,
          userId: user.id,
          event,
        });

    if (!verifyResponse.status || verifyResponse.data?.status !== "success") {
      await markPaymentAsFailed(reference, auditContext);

      throw createError({
        statusCode: 400,
        message: `Payment failed: ${verifyResponse.data?.gateway_response || "Transaction was not successful"}`,
      });
    }

    const transaction = verifyResponse.data;

    const verifiedAmount = Number(transaction.amount) / 100;
    const prevPaid = Number(currentBilling.paidAmount || 0);
    const newPaidTotal = prevPaid + verifiedAmount;
    const totalDue = Number(currentBilling.amount) + Number(currentBilling.lateFee || 0);

    const paymentMethod = mapPaystackChannel(transaction.channel);

    let newStatus: "partially paid" | "fully paid" = "partially paid";
    if (newPaidTotal >= totalDue - 0.01) {
      newStatus = "fully paid";
    }

    await processSuccessfulPayment(
      billingId,
      reference,
      paymentMethod,
      verifiedAmount,
      auditContext,
    );
    return {
      success: true,
      message: `Payment of ${formatCurrency(verifiedAmount)} verified successfully. ${newStatus === "fully paid" ? "Invoice fully paid!" : `Balance remaining: ${formatCurrency(totalDue - newPaidTotal)}`}`,
      data: {
        amount: verifiedAmount,
        status: newStatus,
        transactionId: transaction.id,
        paidAt: transaction.paid_at,
        remainingBalance: Math.max(0, totalDue - newPaidTotal),
        paymentMethod,
        reference,
      },
    };
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;

    handleError(error, "Verify Payment", event);
  }
});
