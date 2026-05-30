import { roomQueries } from "~~/server/db/queries";

export default defineEventHandler(async (event) => {
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

    const { getHostelByIdScoped, updateHostelSettings } = await roomQueries();

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

    const body = await readValidatedBody(event, body =>
      upsertHostelSettingsSchema.safeParse(body));

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
      "useHostelSubaccount",
      "paystackSubaccountCode",
      "paystackSubaccountId",
      "paystackBusinessName",
      "paystackBankCode",
      "paystackAccountNumber",
      "paystackPercentageCharge",
      "paystackIsVerified",
    ] as const;

    for (const key of paystackKeys) {
      if (key in data) {
        throw createError({
          statusCode: 400,
          message: "Paystack fields cannot be updated here. Use the /paystack/subaccount endpoint.",
        });
      }
    }

    const auditContext = getAuditContext({
      event,
      kind: "admin",
      scope,
      target: {
        companyId: hostelRecord.companyId,
        hostelId,
      },
    });

    const result = await updateHostelSettings(
      hostelId,
      hostelRecord.companyId,
      data,
      scope,
      auditContext,
    );

    if (!result) {
      throw createError({
        statusCode: 500,
        message: "Failed to update hostel settings.",
      });
    }

    return {
      success: true,
      message: "Hostel settings updated successfully.",
    };
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;
    handleError(error, "Update Hostel Settings", event);
  }
});
