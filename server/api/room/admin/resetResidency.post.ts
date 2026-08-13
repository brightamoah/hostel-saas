import { roomQueries } from "~~/server/db/queries";

export default defineEventHandler(async (event) => {
  try {
    const scope = await adminSessionCheck(event);

    // const body = await readBody<{
    //   hostelId: number;
    //   academicYear?: string;
    //   academicPeriod?: string;
    //   idempotencyKey: string;
    // }>(event);

    const body = await readValidatedBody(event, body => residencyResetSchema.safeParse(body));

    if (!body.success) {
      throw createError({
        statusCode: 400,
        message: `Invalid request: ${body.error.issues
          .map(i => i.message)
          .join(", ")}`,
      });
    }

    const { academicPeriod, academicYear, idempotencyKey, hostelId } = body.data;

    if (!hostelId) {
      throw createError({
        statusCode: 400,
        message: "hostelId is required.",
      });
    }

    const auditContext = getAuditContext({
      event,
      kind: "admin",
      scope,
      target: {
        hostelId,
        companyId: scope.companyId,
      },
    });

    const { resetHostelResidency } = await roomQueries(event);

    const result = await resetHostelResidency({
      hostelId: Number(hostelId),
      academicYear,
      academicPeriod,
      idempotencyKey,
      triggerSource: "manual",
      triggeredByUserId: scope.userId,
      auditContext,
    });

    return {
      success: true,
      message: "alreadyProcessed" in result && result.alreadyProcessed
        ? "Residency reset was already processed."
        : "Residency reset completed successfully.",
      data: result,
    };
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;
    handleError(error, "Reset Residency", event);
  }
});
