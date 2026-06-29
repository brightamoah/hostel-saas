import { billingQueries } from "~~/server/db/queries";

export default defineEventHandler(async (event) => {
  try {
    const scope = await adminSessionCheck(event);

    const body = await readValidatedBody(event, body => recordManualPaymentSchema.safeParse(body));

    if (!body.success) {
      throw createError({
        statusCode: 400,
        message: `${body.error.issues
          .map(i => i.message)
          .join(", ")}`,
      });
    }

    const {
      amount,
      totalAmount,
      billingId,
      paymentDate,
      paymentMethod,
      transactionReference,
    } = body.data;

    const { getBillingById, recordManualPayment } = await billingQueries(event);

    const billing = await getBillingById(billingId, scope);

    if (!billing) {
      throw createError({
        statusCode: 404,
        message: "Billing record not found.",
      });
    }

    if (!scope.isPlatformAdmin && billing.companyId !== scope.companyId) {
      throw createError({
        statusCode: 403,
        message: "You are not authorized to record payments for this company.",
      });
    }

    if (!scope.isPlatformAdmin && scope.companyRole !== "owner" && scope.hostelId && billing.hostelId !== scope.hostelId) {
      throw createError({
        statusCode: 403,
        message: "You are not authorized to record payments for this hostel.",
      });
    }

    const balanceDue = Number(billing.amount) + Number(billing.lateFee || 0) - Number(billing.paidAmount);

    if (amount > balanceDue) {
      throw createError({
        statusCode: 400,
        message: `Amount cannot exceed the remaining balance of GH₵${balanceDue}`,
      });
    }

    const auditContext = getAuditContext({
      kind: "admin",
      event,
      scope,
      target: {
        companyId: billing.companyId,
        hostelId: billing.hostelId,
      },
    });

    const paymentPayload = {
      billingId,
      studentId: billing.studentId,
      companyId: billing.companyId,
      amount,
      totalAmount,
      paymentMethod,
      transactionReference,
      paymentDate,
    };

    const newPayment = await recordManualPayment(paymentPayload, auditContext);

    return {
      success: true,
      message: "Payment successfully recorded.",
      data: newPayment,
    };
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) {
      throw error;
    }

    handleError(error, "Record Manual Payment", event);
  }
});
