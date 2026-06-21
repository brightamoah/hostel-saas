import { billingQueries } from "~~/server/db/queries";

export default defineEventHandler(async (event) => {
  const scope = await adminSessionCheck(event);

  try {
    const { getScopedPaymentsAdmin } = await billingQueries(event);

    const transactions = await getScopedPaymentsAdmin(scope);

    return {
      data: transactions,
    };
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;
    handleError(error, "Get Local Transactions", event);
  }
});
