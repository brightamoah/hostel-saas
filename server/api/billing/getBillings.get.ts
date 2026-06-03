import { billingQueries } from "~~/server/db/queries";

export default defineEventHandler(async (event) => {
  const scope = await adminSessionCheck(event);

  try {
    const {
      getScopedBillingsAdmin,
      getBillingStatusCount,
    } = await billingQueries(event);

    const stats = await getBillingStatusCount(scope);

    const billings = await getScopedBillingsAdmin(scope);

    return {
      billings,
      stats,
    };
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;

    handleError(error, "Get Billing Data", event);
  }
});
