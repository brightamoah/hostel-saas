import { roomQueries } from "~~/server/db/queries";

export default defineEventHandler(async (event) => {
  try {
    await adminSessionCheck(event);

    const query = getQuery(event);
    const batchId = query.batchId as string;

    if (!batchId) {
      throw createError({
        statusCode: 400,
        message: "batchId query parameter is required.",
      });
    }

    const { getResidencyResetBatchDetails } = await roomQueries(event);
    const details = await getResidencyResetBatchDetails(batchId);

    return {
      success: true,
      data: details,
    };
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;
    handleError(error, "Get Residency Reset Batch Details", event);
  }
});
