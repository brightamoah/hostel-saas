import { companyQueries } from "~~/server/db/queries";

export default defineEventHandler(async (event): Promise<UpdateSubaccountResponse> => {
  const scope = await adminSessionCheck(event);

  try {
    requireCompanyRole(scope, ["owner"]);

    const companyId = scope.isPlatformAdmin
      ? (() => {
          const raw = getQuery(event).companyId;
          const parsed = Number(raw);
          if (!raw || Number.isNaN(parsed)) {
            throw createError({ statusCode: 400, message: "Platform admins must supply ?companyId=" });
          }
          return parsed;
        })()
      : scope.companyId!;

    requireCompanyScope(scope, companyId);

    const body = await readValidatedBody(event, body =>
      updateSubaccountSchema.safeParse(body));

    if (!body.success) {
      throw createError({
        statusCode: 400,
        message: body.error.issues.map(i => i.message).join(", "),
      });
    }

    const data = body.data;

    const { companySettingsExist, updateCompanySubaccount } = await companyQueries(event);

    const existing = await companySettingsExist(companyId);

    if (!existing?.paystackSubaccountCode) {
      throw createError({
        statusCode: 404,
        message: "No Paystack subaccount found for this company. Create one first.",
      });
    }

    const subaccount = await updatePaystackSubaccount(
      existing.paystackSubaccountCode,
      data,
    );

    const dbUpdate: Partial<NewCompanySettings> = { updatedAt: new Date() };

    if (body.data.businessName) dbUpdate.paystackBusinessName = subaccount.businessName;
    if (body.data.percentageCharge !== undefined) dbUpdate.paystackPercentageCharge = subaccount.percentageCharge;
    if (body.data.settlementBank && body.data.accountNumber) {
      dbUpdate.paystackBankCode = body.data.settlementBank;
      dbUpdate.paystackAccountNumber = body.data.accountNumber;
      dbUpdate.paystackAccountType = body.data.accountType;
      dbUpdate.paystackSettlementBank = subaccount.settlementBank;
    }

    const auditContext = getAuditContext({
      kind: "admin",
      scope,
      event,
      target: {
        companyId,
        hostelId: null,
      },
    });

    const result = await updateCompanySubaccount(
      companyId,
      dbUpdate,
      auditContext,
    );

    if (!result) {
      throw createError({
        statusCode: 500,
        message: "Failed to update company settings after updating Paystack subaccount.",
      });
    }

    return {
      success: true,
      message: "Company Paystack subaccount updated successfully.",
      data: {
        subaccountCode: subaccount.subaccountCode,
        businessName: subaccount.businessName,
        isVerified: subaccount.isVerified,
        active: subaccount.active,
        ...(body.data.accountNumber && {
          accountNumberMasked: `****${body.data.accountNumber.slice(-4)}`,
        }),
      },
    };
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;
    handleError(error, "Update Company Paystack Subaccount", event);
  }
});
