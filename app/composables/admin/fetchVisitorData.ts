export function useFetchVisitorData() {
  const { user } = usePortalUserSession();

  const { data, status, refresh } = useFetch<VisitorDataResponse>("/api/visitor/getVisitorData", {
    method: "GET",
    key: computed(() => `visitorData:${user.value?.adminData?.accessLevel}`),
    lazy: true,
    default: () => ({
      visitors: [],
      stats: {
        approved: {
          value: 0,
          percentage: 0,
          period: "monthly" as const,
        },
        checkedIn: {
          value: 0,
          percentage: 0,
          period: "weekly" as const,
        },
        pending: {
          value: 0,
          percentage: 0,
          period: "daily" as const,
        },
        totalVisitors: {
          value: 0,
          percentage: 0,
          period: "monthly" as const,
        },
      },
    }),
    getCachedData: (key, nuxtApp, ctx) => {
      if (ctx.cause === "refresh:manual" || ctx.cause === "refresh:hook") return undefined;
      return nuxtApp.payload.data[key] ?? nuxtApp.static.data[key];
    },
  });

  const visitors = computed<VisitorDataResponse["visitors"]>(() => data.value?.visitors ?? []);

  const {
    canResend,
    coolDownTime,
    isLoading,
    handleRefresh,
  } = useDataRefresh(
    "visitorDataCoolDown",
    "useFetchVisitorData",
    refresh,
  );

  const getVisitorFromCache = (visitorId: number) => {
    return visitors.value.find(v => v.id === visitorId);
  };

  return {
    data,
    visitors,
    status,
    canResend,
    isLoading,
    coolDownTime,
    handleRefresh,
    refresh,
    getVisitorFromCache,
  };
}
