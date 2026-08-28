import { roomQueries } from "~~/server/db/queries";

export default defineEventHandler(async (event) => {
  try {
    const scope = await adminSessionCheck(event);

    const body = await readBody<{ logId: string }>(event);

    if (!body?.logId || typeof body.logId !== "string") {
      throw createError({
        statusCode: 400,
        message: "Valid logId is required.",
      });
    }

    const auditContext = getAuditContext({
      event,
      kind: "admin",
      scope,
      target: {
        companyId: scope.companyId,
        hostelId: scope.hostelId,
      },
    });

    const { rollbackSingleResidencyLog } = await roomQueries(event);

    const result = await rollbackSingleResidencyLog({
      logId: body.logId,
      adminUserId: scope.userId,
      auditContext,
    });

    return {
      success: true,
      message: `Residency reset undone for ${result.userName} (Room ${result.roomNumber}).`,
      data: result,
    };
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;
    handleError(error, "Rollback Single Residency Reset", event);
  }
});
