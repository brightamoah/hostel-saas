import { roomQueries } from "~~/server/db/queries";

export default defineEventHandler(async (event): Promise<UpdateSubaccountResponse> => {
  const scope = await adminSessionCheck(event);

  try {
    requireCompanyRole(scope, ["owner"]);

    const hostelId = (() => {
      const parsed = Number(getRouterParam(event, "hostelId"));
      if (Number.isNaN(parsed) || parsed <= 0) {
        throw createError({
          statusCode: 400,
          message: "Invalid hostelId.",
        });
      }
      return parsed;
    })();

    const {
      getHostelByIdScoped,
      getHostelSettings,
      updateHostelSubaccount,
    } = await roomQueries();

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

    const rawBody = await readBody(event);

    const toggleParse = hostelSubaccountToggleSchema.safeParse(rawBody);

    const isToggleOnly
      = toggleParse.success
        && Object.keys(rawBody).length === 1
        && Object.keys(toggleParse.data).length === 1
        && "useHostelSubaccount" in toggleParse.data
        && "useHostelSubaccount" in rawBody;

    const auditContext = getAuditContext({
      kind: "admin",
      scope,
      event,
      target: {
        companyId: hostelRecord.companyId,
        hostelId,
      },
    });

    if (isToggleOnly) {
      const toggleResult = await updateHostelSubaccount(
        hostelId,
        hostelRecord.companyId,
        true,
        toggleParse.data,
        {},
        scope,
        auditContext,
      );

      const useHostelSubaccount = Boolean(toggleResult);

      return {
        success: true,
        message: `Hostel subaccount routing ${toggleParse.data!.useHostelSubaccount ? "enabled" : "disabled"}.`,
        data: {
          useHostelSubaccount,
        },
      };
    }

    const body = await readValidatedBody(event, body => updateSubaccountSchema.safeParse(body));

    if (!body.success) {
      throw createError({
        statusCode: 400,
        message: body.error.issues.map(i => i.message).join(", "),
      });
    }

    const existingSettings = await getHostelSettings(hostelId);

    if (!existingSettings?.paystackSubaccountCode) {
      throw createError({
        statusCode: 404,
        message: "No Paystack subaccount found for this hostel. Create one first.",
      });
    }

    const subaccount = await updatePaystackSubaccount(
      existingSettings.paystackSubaccountCode,
      body.data,
    );

    const dbUpdate: Partial<NewHostelSettings> = {};

    if (body.data.businessName !== undefined) dbUpdate.paystackBusinessName = subaccount.businessName;

    if (body.data.percentageCharge !== undefined) dbUpdate.paystackPercentageCharge = String(subaccount.percentageCharge);

    if (body.data.settlementBank && body.data.accountNumber) {
      dbUpdate.paystackBankCode = body.data.settlementBank;
      dbUpdate.paystackAccountNumber = body.data.accountNumber;
      dbUpdate.paystackAccountType = body.data.accountType;
      dbUpdate.paystackSettlementBank = subaccount.settlementBank;
    }

    await updateHostelSubaccount(
      hostelId,
      hostelRecord.companyId,
      false,
      { useHostelSubaccount: false },
      dbUpdate,
      scope,
      auditContext,
    );

    return {
      success: true,
      message: "Hostel Paystack subaccount updated successfully.",
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
    handleError(error, "Update Hostel Paystack Subaccount", event);
  }
});
