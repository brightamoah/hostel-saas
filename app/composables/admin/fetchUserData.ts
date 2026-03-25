export function useFetchUserData() {
  const { user } = usePortalUserSession();

  const { data, status, refresh } = useFetch<UserDataResponse>("/api/user/getUserData", {
    method: "get",
    key: computed(() => `userData:${user.value?.adminData?.accessLevel}`),
    lazy: true,
    default: () => ({
      users: [],
      stats: {
        totalUsers: {
          value: 0,
          percentage: 0,
          period: "monthly" as const,
        },
        totalStudents: {
          value: 0,
          percentage: 0,
          period: "monthly" as const,
        },
        totalAdmins: {
          value: 0,
          percentage: 0,
          period: "monthly" as const,
        },
        activeStudents: {
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

  const users = computed<UserWithRelations[]>(() => data.value?.users ?? []);

  const {
    canResend,
    coolDownTime,
    isLoading,
    handleRefresh,
  } = useDataRefresh(
    "userDataCoolDown",
    "useFetchUserData",
    refresh,
  );

  return {
    data,
    status,
    users,
    canResend,
    isLoading,
    coolDownTime,
    handleRefresh,
    refresh,
  };
}
