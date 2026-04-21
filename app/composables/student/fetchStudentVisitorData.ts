export function useFetchStudentVisitorData() {
  const { user } = usePortalUserSession();

  const { data, status, refresh, error } = useFetch<VisitorDataResponse>("/api/student/getVisitors", {
    method: "get",
    key: computed(() => `visitorData:${user.value?.id}`),
    lazy: true,
    default: (): VisitorDataResponse => ({
      visitors: [],
      stats: {
        totalVisitors: { value: 0, percentage: 0, period: "monthly" as const },
        approved: { value: 0, percentage: 0, period: "monthly" as const },
        checkedIn: { value: 0, percentage: 0, period: "weekly" as const },
        pending: { value: 0, percentage: 0, period: "daily" as const },
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
    "useFetchStudentVisitorData",
    refresh,
  );

  return {
    visitors,
    data,
    status,
    canResend,
    coolDownTime,
    isLoading,
    handleRefresh,
    refresh,
    error,
  };
}
