import { billingQueries } from "~~/server/db/queries";

export default defineEventHandler(async (event) => {
  const { studentId } = await studentSessionCheck(event);

  try {
    const {
      getStudentScopedBillings,
      getStudentBillingStatusCount,
    } = await billingQueries(event);

    const stats = await getStudentBillingStatusCount(studentId);

    const billings = await getStudentScopedBillings(studentId);

    return {
      billings,
      stats,
    };
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;

    handleError(error, "Get Student Billing Data", event);
  }
});
