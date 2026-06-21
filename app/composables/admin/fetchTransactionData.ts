export function useFetchTransactionData() {
  const { user } = usePortalUserSession();
  const transactionKey = computed(() => `transactionData:${user.value?.adminData?.accessLevel}`);

  const { data, status, error, refresh } = useFetch<PaymentTransactions>("/api/billing/admin/transactions", {
    method: "GET",
    key: transactionKey,
    lazy: true,
    cache: "default",
    default: () => ({
      data: [],
    }),
    getCachedData: (key, nuxtApp, ctx) => {
      if (ctx.cause === "refresh:manual" || ctx.cause === "refresh:hook") return undefined;
      return nuxtApp.payload.data[key] ?? nuxtApp.static.data[key];
    },
  });

  const transactions = computed(() => data.value.data);

  const {
    canResend,
    coolDownTime,
    isLoading,
    handleRefresh,
  } = useDataRefresh(
    "transactionDataCoolDown",
    "useFetchTransactionData",
    refresh,
  );

  return {
    data,
    transactions,
    status,
    error,
    canResend,
    coolDownTime,
    isLoading,
    refresh,
    handleRefresh,
  };
}
