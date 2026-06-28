import { reportQueries } from "~~/server/db/queries";

export default defineEventHandler(async (event) => {
  try {
    let scope = await adminSessionCheck(event);
    scope = resolveReportScope(event, scope);

    const { companyId } = scope;

    if (!companyId) {
      throw createError({
        statusCode: 400,
        message: "Company ID missing",
      });
    }

    const { getTemplatesForComapany } = await reportQueries(event);

    const templates = await getTemplatesForComapany(scope);

    return {
      success: true,
      data: templates,
    };
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;

    handleError(error, "Get Report Templates", event);
  }
});
