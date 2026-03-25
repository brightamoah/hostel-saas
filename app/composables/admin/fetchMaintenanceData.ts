export function useFetchMaintenanceData() {
  const { user } = usePortalUserSession();

  const { data, status, refresh } = useFetch<AdminMaintenanceDataResponse>("/api/maintenance/getMaintenanceData", {
    method: "get",
    key: computed(() => `maintenanceData:${user.value?.adminData?.accessLevel}`),
    lazy: true,
    cache: "default",
    default: () => ({
      maintenanceRequests: [],
      stats: {
        totalMaintenance: {
          value: 0,
          percentage: 0,
          period: "monthly" as const,
        },
        pending: {
          value: 0,
          percentage: 0,
          period: "monthly" as const,
        },
        completed: {
          value: 0,
          percentage: 0,
          period: "monthly" as const,
        },
        inProgress: {
          value: 0,
          percentage: 0,
          period: "monthly" as const,
        },
        assigned: 0,
        rejected: 0,
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
    "useFetchMaintenanceData",
    refresh,
  );

  return {
    data,
    maintenanceRequests,
    status,
    isLoading,
    canResend,
    coolDownTime,
    handleRefresh,
  };
}
