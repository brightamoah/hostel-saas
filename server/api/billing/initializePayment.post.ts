import { randomUUID } from "uncrypto";
import { billingQueries, companyQueries } from "~~/server/db/queries";
import { resolveSubaccount } from "~~/server/libs/paystack/resolveSubaccount";

export default defineEventHandler(async (event) => {
  const { user } = await requirePortalUserSession(event, {
    message: "Unauthorized Access: Please log in to continue.",
  });

  const runtimeConfig = useRuntimeConfig(event);

  try {
    const body = await readValidatedBody(event, body => paymentSchema.safeParse(body));

    if (!body.success) {
      throw createError({
        statusCode: 400,
        message: `${body.error.issues
          .map(i => i.message)
          .join(", ")}`,
      });
    }

    const { companyId } = user;

    if (!companyId) {
      throw createError({
        statusCode: 403,
        message: "You do not have permission to make a payment. Please contact support if you believe this is an error.",
      });
    }

    const {
      billingId,
      amount,
      email,
      phoneNumber,
      totalAmount,
    } = body.data;

    const { getBillingByIdStudent, createPaymentIntent } = await billingQueries(event);
    const billing = await getBillingByIdStudent(billingId);

    if (!billing) {
      throw createError({
        statusCode: 404,
        message: "Billing record not found.",
      });
    }

    if (user.role === "student" && billing.studentId !== user.studentId) {
      throw createError({
        statusCode: 403,
        message: "You are not authorized to make payment for this billing.",
      });
    }

    const balanceDue = totalAmount - Number(billing.paidAmount || 0);

    if (amount > balanceDue) {
      throw createError({
        statusCode: 400,
        message: `Payment amount (${formatCurrency(amount)}) exceeds balance due (${formatCurrency(balanceDue)})`,
      });
    }

    const { getCompanySettings } = await companyQueries(event);
    const cSettings = await getCompanySettings(companyId);

    if (cSettings) {
      if (!cSettings.allowPartialPayments && amount < balanceDue) {
        throw createError({
          statusCode: 400,
          message: `Partial payments are not allowed. You must pay the full balance of ${formatCurrency(balanceDue)}.`,
        });
      }

      if (
        cSettings.allowPartialPayments
        && cSettings.minimumPartialPaymentPercent
      ) {
        const minAmount = (totalAmount * Number(cSettings.minimumPartialPaymentPercent)) / 100;

        if (amount < minAmount && amount < balanceDue) {
          throw createError({
            statusCode: 400,
            message: `The minimum partial payment allowed is ${cSettings.minimumPartialPaymentPercent}% (${formatCurrency(minAmount)}).`,
          });
        }
      }
    }

    // reference format: KH-{billingId}-{randomHash}
    const reference = `KH-${billing.id}-${randomUUID().split("-")[0]}`;

    const portalUrl = getRequestHeader(event, "origin");

    const baseUrl: string = import.meta.dev
      ? "http://localhost:3000"
      : (portalUrl ?? runtimeConfig.public?.siteUrl);

    if (billing.hostelId === null) {
      throw createError({
        statusCode: 400,
        message: "Billing record is not associated with a hostel.",
      });
    }

    const { subaccountCode, splitType } = await resolveSubaccount(
      billing.hostelId,
      companyId,
    );

    const response = await initializePaystackTransaction({
      email,
      amount,
      currency: "GHS",
      reference,
      subaccountCode: subaccountCode ?? undefined,
      channels: ["card", "bank", "ussd", "qr", "mobile_money", "bank_transfer"],
      callbackUrl: `${baseUrl}/billing/verify?reference=${reference}`,
      metadata: {
        billingId: billing.id,
        studentId: billing.studentId,
        invoiceNumber: billing.invoiceNumber,
        description: billing.description,
        phoneNumber,
        billingType: billing.type,
        studentName: billing.student!.user!.name,
        amountGHS: totalAmount.toFixed(2),
        custom_fields: [
          {
            display_name: "Invoice Number",
            variable_name: "invoice_number",
            value: billing.invoiceNumber,
          },
          {
            display_name: "Student Name",
            variable_name: "student_name",
            value: billing.student!.user!.name,
          },
          {
            display_name: "Phone Number",
            variable_name: "phone_number",
            value: phoneNumber,
          },
          {
            display_name: "Billing Type",
            variable_name: "billing_type",
            value: billing.type,
          },
        ],
      },
    });

    if (!response.status) {
      throw createError({
        statusCode: 500,
        message: "Failed to initialize payment. Please try again later.",
      });
    }

    const auditContext = getAuditContext({
      kind: "student",
      companyId,
      userId: user.id,
      event,
      hostelId: billing.hostelId,
    });

    await createPaymentIntent(
      {
        billingId,
        studentId: billing.studentId,
        companyId,
        amount,
        reference,
        subaccountCode,
        splitType,
      },
      auditContext,
    );

    const data = response.data;

    return {
      success: true,
      message: "Payment initialized successfully.",
      data: {
        authorizationUrl: data?.authorization_url,
        accessCode: data?.access_code,
        reference: data?.reference,
      },
    };
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;

    handleError(error, "Initialize Payment", event);
  }
});
