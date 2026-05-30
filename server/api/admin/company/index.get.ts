import { companyQueries } from "~~/server/db/queries";

export default defineEventHandler(async (event): Promise<Companies> => {
  const scope = await adminSessionCheck(event);

  if (!scope.isPlatformAdmin) {
    throw createError({
      statusCode: 403,
      message: "Only platform admins access this resource.",
    });
  }

  try {
    const { getAllCompaniesWithRelations } = await companyQueries();

    const companies = await getAllCompaniesWithRelations(scope);

    return companies;
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;
    handleError(error, "Create Company Paystack Subaccount", event);
  }
});
