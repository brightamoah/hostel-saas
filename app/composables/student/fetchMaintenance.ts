export function useFetchMaintenance() {
  const { user } = usePortalUserSession();

  const {
    data,
    status,
    error,
    refresh,
  } = useFetch<MaintenanceDataResponse>("/api/maintenance/student/getMaintenanceData", {
    method: "GET",
    key: computed(() => `maintenanceData:${user.value?.id}`),
    lazy: true,
    cache: "default",
    default: () => ({
      maintenanceRequests: [] as MaintenanceDataResponse["maintenanceRequests"],
      stats: {
        total: { value: 0, percentage: 0, period: "monthly" as const },
        pending: { value: 0, percentage: 0, period: "daily" as const },
        completed: { value: 0, percentage: 0, period: "monthly" as const },
        inProgress: { value: 0, percentage: 0, period: "weekly" as const },
      },
    }),
    getCachedData: (key, nuxtApp, ctx) => {
      if (ctx.cause === "refresh:manual" || ctx.cause === "refresh:hook") return undefined;
      return nuxtApp.payload.data[key] ?? nuxtApp.static.data[key];
    },
  });

  const maintenanceRequests = computed<MaintenanceType[]>(() => data.value?.maintenanceRequests ?? []);

  const {
    canResend,
    coolDownTime,
    isLoading,
    handleRefresh,
  } = useDataRefresh(
    "maintenanceDataCoolDown",
    "useFetchStudentMaintenanceData",
    refresh,
  );

  return {
    data,
    maintenanceRequests,
    status,
    isLoading,
    canResend,
    coolDownTime,
    error,
    handleRefresh,
    refresh,
  };
}
