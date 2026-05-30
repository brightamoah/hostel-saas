import { companyQueries } from "~~/server/db/queries";

export default defineEventHandler(async (event): Promise<CompanySettingsResponseData> => {
  const scope = await adminSessionCheck(event);

  try {
    requireCompanyRole(scope, ["owner", "finance", "admin"]);

    const companyId = scope.isPlatformAdmin
      ? (() => {
          const raw = getQuery(event).companyId;
          const parsedId = Number(raw);

          if (!raw || Number.isNaN(parsedId)) {
            throw createError({
              statusCode: 400,
              message: "Platform admins must supply ?companyId=",
            });
          }
          return parsedId;
        })()
      : scope.companyId!;

    requireCompanyScope(scope, companyId);

    const { getCompanySettings } = await companyQueries();

    const settings = await getCompanySettings(companyId);

    const newSettings = settings
      ? {
          ...settings,
          paystackAccountNumber: settings.paystackAccountType === "bank_account"
            ? maskAccountNumberPartial(settings.paystackAccountNumber ?? null)
            : maskAccountNumberForApi(settings.paystackAccountNumber ?? null),
        }
      : null;

    return {
      success: true,
      data: newSettings ?? null,
      isFirstSetup: !settings,
    };
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;
    handleError(error, "Get Company Settings", event);
  }
});
