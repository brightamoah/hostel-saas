import { roomQueries } from "~~/server/db/queries";

export default defineEventHandler(async (event) => {
  try {
    const scope = await adminSessionCheck(event);

    const body = await readValidatedBody(event, body => residencyResetPreview.safeParse(body));

    if (!body.success) {
      throw createError({
        statusCode: 400,
        message: `Invalid request: ${body.error.issues
          .map(i => i.message)
          .join(", ")}`,
      });
    }

    const { hostelId, academicPeriod, academicYear } = body.data;

    if (!hostelId) {
      throw createError({
        statusCode: 400,
        message: "hostelId is required.",
      });
    }

    const { previewResidencyReset, getHostelByIdScoped } = await roomQueries(event);

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

    if (!hostelId) {
      throw createError({
        statusCode: 400,
        message: "hostelId is required.",
      });
    }

    const preview = await previewResidencyReset({
      hostelId: Number(hostelId),
      academicYear,
      academicPeriod,
    });

    return {
      success: true,
      data: preview,
    };
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;
    handleError(error, "Preview Residency Reset", event);
  }
});
