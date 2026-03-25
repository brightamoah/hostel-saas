export function useFetchBillingDataAdmin() {
  const { user } = usePortalUserSession();
  const billingKey = computed(() => `bilingData: ${user.value?.adminData?.accessLevel}`);

  const { data, status, error, refresh } = useFetch<BillingResponse>("/api/billing/getBillings", {
    method: "GET",
    key: billingKey,
    lazy: true,
    cache: "default",
    default: () => ({
      billings: [],
      stats: {
        totalBillings: { value: 0, percentage: 0, period: "monthly" as const },
        totalPaid: { value: 0, percentage: 0, period: "monthly" as const },
        totalPending: { value: 0, percentage: 0, period: "weekly" as const },
        totalOverdue: { value: 0, percentage: 0, period: "daily" as const },
      },
    }),
    getCachedData: (key, nuxtApp, ctx) => {
      if (ctx.cause === "refresh:manual" || ctx.cause === "refresh:hook") return undefined;
      return nuxtApp.payload.data[key] ?? nuxtApp.static.data[key];
    },
  });

  const billings = computed<Billing[]>(() => data.value.billings);

  const {
    canResend,
    coolDownTime,
    isLoading,
    handleRefresh,
  } = useDataRefresh(
    "billingDataCoolDown",
    "useFetchBillingDataAdmin",
    refresh,
  );

  return {
    data,
    billings,
    status,
    error,
    canResend,
    coolDownTime,
    isLoading,
    refresh,
    handleRefresh,
  };
}
