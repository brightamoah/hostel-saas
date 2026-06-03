import { companyQueries } from "~~/server/db/queries";

export default defineEventHandler(async (event) => {
  const scope = await adminSessionCheck(event);

  try {
    requireCompanyRole(scope, ["owner", "admin"]);

    const companyId = scope.isPlatformAdmin
      ? (() => {
          const raw = getQuery(event).companyId;
          const parsed = Number(raw);
          if (!raw || Number.isNaN(parsed)) {
            throw createError({
              statusCode: 400,
              message: "Platform admins must supply ?companyId=",
            });
          }
          return parsed;
        })()
      : scope.companyId!;

    requireCompanyScope(scope, companyId);

    const body = await readValidatedBody(event, body =>
      upsertCompanySettingsSchema.safeParse(body));

    if (!body.success) {
      throw createError({
        statusCode: 400,
        message: body.error.issues.map(i => i.message).join(", "),
      });
    }

    const data = body.data;

    if (Object.keys(data).length === 0) {
      throw createError({
        statusCode: 400,
        message: "Request body must contain at least one field to update.",
      });
    }

    const paystackKeys = [
      "paystackSubaccountCode",
      "paystackSubaccountId",
      "paystackBusinessName",
      "paystackBankCode",
      "paystackAccountNumber",
      "paystackPercentageCharge",
      "paystackSettlementBank",
      "paystackIsVerified",
    ] as const;

    for (const key of paystackKeys) {
      if (key in data) {
        throw createError({
          statusCode: 400,
          message: `Paystack fields cannot be updated here. Use the /paystack/subaccount endpoint.`,
        });
      }
    }

    const { updateCompanySettings } = await companyQueries(event);

    const auditContext = getAuditContext({
      event,
      kind: "admin",
      scope,
      target: {
        companyId,
        hostelId: null,
      },
    });

    const result = await updateCompanySettings(
      companyId,
      {
        ...data,
        lateFeeValue: data.lateFeeValue?.toString(),
        minimumPartialPaymentPercent: data.minimumPartialPaymentPercent?.toString(),
      },
      auditContext,
    );

    if (!result) {
      throw createError({
        statusCode: 500,
        message: "Failed to update company settings.",
      });
    }

    return {
      success: true,
      message: "Company settings updated successfully.",
    };
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;
    handleError(error, "Update Company Settings", event);
  }
});
