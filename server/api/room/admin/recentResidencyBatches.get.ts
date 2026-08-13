import { roomQueries } from "~~/server/db/queries";

export default defineEventHandler(async (event) => {
  try {
    await adminSessionCheck(event);

    const query = getQuery(event);
    const hostelId = Number(query.hostelId);

    if (!hostelId) {
      throw createError({
        statusCode: 400,
        message: "hostelId query parameter is required.",
      });
    }

    const { getRecentResidencyResetBatches } = await roomQueries(event);
    const batches = await getRecentResidencyResetBatches(hostelId);

    return {
      success: true,
      data: batches,
    };
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;
    handleError(error, "Get Recent Residency Reset Batches", event);
  }
});
