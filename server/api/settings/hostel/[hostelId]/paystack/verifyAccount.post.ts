import { roomQueries } from "~~/server/db/queries";

export default defineEventHandler(async (event): Promise<VerifyAccountResponseData> => {
  const scope = await adminSessionCheck(event);

  try {
    requireCompanyRole(scope, ["owner"]);

    const hostelId = (() => {
      const parsed = Number(getRouterParam(event, "hostelId"));
      if (Number.isNaN(parsed) || parsed <= 0) {
        throw createError({ statusCode: 400, message: "Invalid hostelId." });
      }
      return parsed;
    })();

    const { getHostelByIdScoped } = await roomQueries(event);

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
      verifyBankAccountSchema.safeParse(body));

    if (!body.success) {
      throw createError({
        statusCode: 400,
        message: body.error.issues.map(i => i.message).join(", "),
      });
    }

    const {
      accountNumber,
      bankCode,
    } = body.data;

    const response = await verifyBankAccount(accountNumber, bankCode);

    if (!response.status || !response.data) {
      throw createError({
        statusCode: 422,
        message: "Could not verify this account. Please check the account number and bank.",
      });
    }

    return {
      success: true,
      data: {
        accountName: response.data.account_name,
      },
    };
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;
    handleError(error, "Verify Hostel Bank Account", event);
  }
});
