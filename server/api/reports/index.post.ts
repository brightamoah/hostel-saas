import { reportQueries } from "~~/server/db/queries";

export default defineEventHandler(async (event) => {
  try {
    let scope = await adminSessionCheck(event);
    scope = resolveReportScope(event, scope);

    const { companyId, userId, hostelId } = scope;

    if (!companyId) {
      throw createError({
        statusCode: 400,
        message: "Company ID missing",
      });
    }

    const body = await readValidatedBody(event, body => createReportTemplateSchema.safeParse(body));

    if (!body.success) {
      throw createError({
        statusCode: 400,
        message: `Invalid request: ${body.error.issues.map(i => i.message).join(", ")}`,
      });
    }

    const data = body.data;

    const { upsertTemplate } = await reportQueries(event);

    const reportData = {
      ...data,
      companyId,
      userId,
      hostelId: hostelId ?? null,
    };

    const newTemplate = await upsertTemplate(reportData, scope);

    return {
      success: true,
      data: newTemplate,
    };
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;

    handleError(error, "Create Report Template Error", event);
  }
});
