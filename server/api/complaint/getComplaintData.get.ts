import { complaintQueries } from "~~/server/db/queries";

export default defineEventHandler(async (event) => {
  const scope = await adminSessionCheck(event);

  try {
    const {
      getComplaintStatusCount,
      getAllComplaintsScoped,
    } = await complaintQueries(event);

    const complaints = await getAllComplaintsScoped(scope);

    const stats = await getComplaintStatusCount(scope);

    return {
      complaints,
      stats,
    };
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;

    handleError(error, "Get Complaint Data", event);
  }
});
