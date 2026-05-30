export function useAdminDashboardData() {
  const { user, isPlatformAdmin } = usePortalUserSession();

  const { data, status, refresh } = useFetch<AdminDashboardData>("/api/admin/stats", {
    method: "GET",
    key: computed(() => `dashboardData:${user.value?.adminData?.accessLevel}`),
    lazy: true,
    cache: "default",
    getCachedData: (key, nuxtApp, ctx) => {
      if (ctx.cause === "refresh:manual" || ctx.cause === "refresh:hook") return undefined;
      return nuxtApp.payload.data[key] ?? nuxtApp.static.data[key];
    },
  });

  const cardStats = computed(() => data.value?.cardStats);
  const overview = computed(() => data.value?.overview);

  const companyList = ref<Companies | null>(null);
  const companyListStatus = ref<Status>("idle");

  if (isPlatformAdmin.value) {
    const { data: companiesData, status: companiesStatus } = useFetch<Companies>(
      "/api/admin/company",
      {
        key: "adminCompanyList",
        method: "GET",
        lazy: true,
        default: () => { },
        getCachedData: (key, nuxtApp, ctx) => {
          if (ctx.cause === "refresh:manual" || ctx.cause === "refresh:hook") return undefined;
          return nuxtApp.payload.data[key] ?? nuxtApp.static.data[key];
        },
        watch: [isPlatformAdmin],
      },
    );
    companyList.value = companiesData.value ?? null;
    companyListStatus.value = companiesStatus.value;
  }

  const {
    canResend,
    coolDownTime,
    isLoading,
    handleRefresh,
  } = useDataRefresh(
    "AdminDashboardDataCoolDown",
    "useAdminDashboardData",
    refresh,
  );

  return {
    data,
    cardStats,
    status,
    coolDownTime,
    isLoading,
    canResend,
    overview,
    refresh,
    handleRefresh,
    companyList,
    companyListStatus,
  };
}
