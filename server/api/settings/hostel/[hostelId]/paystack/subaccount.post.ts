import { roomQueries } from "~~/server/db/queries";

export default defineEventHandler(async (event): Promise<CreateSubaccountResponseData> => {
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

    const { getHostelByIdScoped, createHostelSubaccount } = await roomQueries(event);

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
      createSubaccountSchema.safeParse(body));

    if (!body.success) {
      throw createError({
        statusCode: 400,
        message: body.error.issues.map(i => i.message).join(", "),
      });
    }

    const data = body.data;

    const auditContext = getAuditContext({
      kind: "admin",
      scope,
      event,
      target: {
        companyId: hostelRecord.companyId,
        hostelId,
      },
    });

    const subaccount = await createHostelSubaccount(
      hostelId,
      hostelRecord.companyId,
      scope,
      data,
      auditContext,
    );

    return {
      success: true,
      message: "Hostel Paystack subaccount created. Enable it in settings to activate per-hostel payment routing.",
      data: {
        subaccountCode: subaccount.subaccountCode,
        businessName: subaccount.businessName,
        bankCode: subaccount.settlementBank,
        subaccountId: subaccount.id,
        isVerified: true,
        useHostelSubaccount: false,
        accountNumberMasked: `****${data.accountNumber.slice(-4)}`,
      },
    };
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;
    handleError(error, "Create Hostel Paystack Subaccount", event);
  }
});
