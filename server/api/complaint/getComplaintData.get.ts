import { complaintQueries } from "~~/server/db/queries";

export default defineEventHandler(async (event) => {
  const scope = await adminSessionCheck(event);

  try {
    const {
      getComplaintStatusCount,
      getAllComplaintsScoped,
    } = await complaintQueries();

    const complaints = await getAllComplaintsScoped(scope);

    const {
      totalComplaints,
      totalInProgress,
      totalPending,
      totalResolved,
    } = await getComplaintStatusCount(scope);

    return {
      complaints,
      totalComplaints,
      totalInProgress,
      totalPending,
      totalResolved,
    };
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;

    handleError(error, "Get Complaint Data", event);
  }
});
