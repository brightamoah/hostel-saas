import { roomQueries } from "~~/server/db/queries";

export default defineEventHandler(async (event) => {
  try {
    const scope = await adminSessionCheck(event);

    const body = await readValidatedBody(event, body => residencyResetRollback.safeParse(body));

    if (!body.success) {
      throw createError({
        statusCode: 400,
        message: `Invalid request: ${body.error.issues
          .map(i => i.message)
          .join(", ")}`,
      });
    }

    const { batchId } = body.data;

    const auditContext = getAuditContext({
      event,
      kind: "admin",
      scope,
      target: {
        companyId: scope.companyId,
        hostelId: scope.hostelId,
      },
    });

    const { rollbackResidencyReset } = await roomQueries(event);

    const result = await rollbackResidencyReset({
      batchId,
      adminUserId: scope.userId,
      auditContext,
    });

    return {
      success: true,
      message: `Residency reset rolled back. Restored ${result.restoredCount} allocations. ${result.conflictCount} conflicts.`,
      data: result,
    };
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;
    handleError(error, "Rollback Residency Reset", event);
  }
});
