export default defineEventHandler(async (event) => {
  await adminSessionCheck(event);

  try {
    const transactions = await fetchTransactions();

    return {
      data: transactions,
    };
  }
  catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) throw error;
    handleError(error, "Get Paystack Transactions", event);
  }
});
