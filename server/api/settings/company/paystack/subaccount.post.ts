import { companyQueries } from "~~/server/db/queries";

export default defineEventHandler(async (event): Promise<CreateSubaccountResponseData> => {
  const scope = await adminSessionCheck(event);

  try {
    requireCompanyRole(scope, ["owner"]);

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
      createSubaccountSchema.safeParse(body));

    if (!body.success) {
      throw createError({
        statusCode: 400,
        message: body.error.issues.map(i => i.message).join(", "),
      });
    }

    const { companySettingsExist, createSubaccount } = await companyQueries();

    if (!companySettingsExist(companyId)) {
      throw createError({
        statusCode: 422,
        message: "Company settings must be created before creating a subaccount.",
      });
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

    const subaccount = await createSubaccount(
      companyId,
      body.data,
      auditContext,
    );

    return {
      success: true,
      message: "Paystack subaccount created successfully.",
      data: {
        subaccountId: subaccount.id,
        subaccountCode: subaccount.subaccountCode,
        businessName: subaccount.businessName,
        bankCode: subaccount.settlementBank,
        accountNumberMasked: `****${body.data.accountNumber.slice(-4)}`,
        isVerified: subaccount.isVerified,
      },
    };
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;
    handleError(error, "Create Company Paystack Subaccount", event);
  }
});
