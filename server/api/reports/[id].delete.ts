import { reportQueries } from "~~/server/db/queries";

export default defineEventHandler(async (event) => {
  try {
    const scope = await adminSessionCheck(event);

    const { companyId, companyRole } = scope;

    if (!companyId) {
      throw createError({
        statusCode: 403,
        statusMessage: "You don't have permission to perform this action.",
      });
    }

    if (companyRole !== "owner") {
      throw createError({
        statusCode: 403,
        statusMessage: "You don't have permission to perform this action.",
      });
    }

    const templateId = Number(getRouterParam(event, "id")) ?? Number(event.context.params?.id);

    if (!templateId || Number.isNaN(templateId)) {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid template id.",
      });
    }

    const { deleteTemplate } = await reportQueries(event);

    const deleted = await deleteTemplate(templateId, scope);

    if (!deleted) {
      throw createError({
        statusCode: 404,
        statusMessage: "Template not found.",
      });
    }

    return {
      success: true,
      message: "Template deleted successfully.",
    };
  }
  catch (error) {
    handleError(error, "Delete Report Template", event);
  }
});
