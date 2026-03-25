export function useFetchStudentComplaintData() {
  const { user } = usePortalUserSession();

  const { data, status, refresh, error } = useFetch<ComplaintDataResponse>("/api/complaint/student/getComplaints", {
    method: "get",
    key: computed(() => `complaintData:${user.value?.id}`),
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
    "useFetchStudentComplaintData",
    refresh,
  );

  return {
    data,
    status,
    complaints,
    canResend,
    coolDownTime,
    isLoading,
    error,
    handleRefresh,
    refresh,
  };
}
