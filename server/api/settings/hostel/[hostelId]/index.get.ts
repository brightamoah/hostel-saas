import { roomQueries } from "~~/server/db/queries";

export default defineEventHandler(async (event): Promise<HostelSettingsResponseData> => {
  const scope = await adminSessionCheck(event);

  try {
    requireCompanyRole(scope, ["owner", "admin"]);

    const hostelId = (() => {
      const parsed = Number(getRouterParam(event, "hostelId"));
      if (Number.isNaN(parsed) || parsed <= 0) {
        throw createError({ statusCode: 400, message: "Invalid hostelId." });
      }
      return parsed;
    })();

    const { getHostelByIdScoped, getHostelSettings } = await roomQueries();

    const hostelRecord = await getHostelByIdScoped(hostelId, scope);

    if (!hostelRecord) {
      throw createError({
        statusCode: 404,
        message: "Hostel not found.",
      });
    }

    requireHostelScope(
      scope,
      hostelRecord.companyId,
      hostelId,
    );

    const settings = await getHostelSettings(hostelId);

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
      data: newSettings,
      isFirstSetup: !settings,
    };
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;
    handleError(error, "Get Hostel Settings", event);
  }
});
