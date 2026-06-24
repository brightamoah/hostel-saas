import { reportQueries } from "~~/server/db/queries";

export default defineEventHandler(async (event) => {
  try {
    const scope = await adminSessionCheck(event);

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
    handleError(error, "Get Report Templates", event);
  }
});
