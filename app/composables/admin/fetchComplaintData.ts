export function useFetchComplaintData() {
  const { user } = usePortalUserSession();

  const { data, status, refresh } = useFetch<ComplaintDataResponse>("/api/complaint/getComplaintData", {
    method: "get",
    key: computed(() => `complaintData:${user.value?.adminData?.accessLevel}`),
    lazy: true,
    default: () => ({
      complaints: [],
      stats: {
        total: { value: 0, percentage: 0, period: "daily" as const },
        pending: { value: 0, percentage: 0, period: "daily" as const },
        inProgress: { value: 0, percentage: 0, period: "weekly" as const },
        resolved: { value: 0, percentage: 0, period: "monthly" as const },
      },
    }),
    getCachedData: (key, nuxtApp, ctx) => {
      if (ctx.cause === "refresh:manual" || ctx.cause === "refresh:hook") return undefined;
      return nuxtApp.payload.data[key] ?? nuxtApp.static.data[key];
    },
  });

  const complaints = computed<Complaint[]>(() => data.value.complaints ?? []);

  const {
    canResend,
    coolDownTime,
    isLoading,
    handleRefresh,
  } = useDataRefresh(
    "complaintDataCoolDown",
    "useFetchComplaintData",
    refresh,
  );

  return {
    data,
    status,
    complaints,
    canResend,
    coolDownTime,
    isLoading,
    handleRefresh,
  };
}
