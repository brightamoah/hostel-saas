export function useFetchBillingDataStudent() {
  const { user } = usePortalUserSession();

  const billingKey = computed(() => `billingData:${user.value?.id}`);

  const { data, status, error, refresh } = useFetch<BillingDataResponseStudent>("/api/billing/student/billings", {
    method: "GET",
    key: billingKey,
    lazy: true,
    cache: "default",
    default: () => ({
      billings: [],
      stats: {
        totalBilled: { value: 0, percentage: 0, period: "monthly" as const },
        totalPaid: { value: 0, percentage: 0, period: "monthly" as const },
        balance: { value: 0, percentage: 0, period: "weekly" as const },
        overdue: { value: 0, percentage: 0, period: "daily" as const },
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
