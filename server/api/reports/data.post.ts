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

    const body = await readValidatedBody(event, body => reportConfigSchema.safeParse(body));

    if (!body.success) {
      throw createError({
        statusCode: 400,
        message: `Invalid request: ${body.error.issues
          .map(i => i.message)
          .join(", ")}`,
      });
    }

    const config = body.data;

    const reportData = await fetchReportData(config, scope, event);

    return {
      success: true,
      data: reportData,
    };
  }
  catch (error) {
    handleError(error, "Fetch Report Data", event);
  }
});
