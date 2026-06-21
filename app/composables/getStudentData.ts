import type { RouteLocationRaw } from "vue-router";

export function useStudentData() {
  const { data, error, refresh, status } = useFetch("/api/auth/checkStudentDetails", {
    method: "GET",
    key: "studentStatusData",
    default: () => ({
      hasProfile: false,
      hasActiveBooking: false,
      studentId: null,
      student: null,
    }),
    getCachedData: (key, nuxtApp, ctx) => {
      if (ctx.cause === "refresh:manual" || ctx.cause === "refresh:hook") return undefined;
      return nuxtApp.payload.data[key] ?? nuxtApp.static.data[key];
    },
  });

  const { session } = usePortalUserSession();

  const hasProfile = computed(() => session.value?.onboarded ?? false);

  const hasActiveBooking = computed(() => session.value?.hasActiveAllocation ?? false);

  const studentId = computed(() => session.value?.studentId);

  const studentData = computed(() => data.value?.student);

  const expectedRoute = computed<RouteLocationRaw>(() => {
    if (!hasProfile.value) return "/auth/onboarding";
    if (!hasActiveBooking.value) return "/auth/hostelHub";
    return "/student/dashboard";
  });

  const needsOnboarding = computed(() => !hasProfile.value);

  const needsHostelSelection = computed(() => hasProfile.value && !hasActiveBooking.value);

  const isFullyOnboarded = computed(() => hasProfile.value && hasActiveBooking.value);

  const {
    canResend,
    coolDownTime,
    isLoading,
    handleRefresh: handleStudentStatusDataRefresh,
  } = useDataRefresh(
    "studentDataCoolDown",
    "useStudentData",
    refresh,
  );

  return {
    data,
    error,
    status,
    hasProfile,
    hasActiveBooking,
    studentId,
    studentData,
    coolDownTime,
    isLoading,
    canResend,
    expectedRoute,
    needsOnboarding,
    needsHostelSelection,
    isFullyOnboarded,
    refresh,
    handleStudentStatusDataRefresh,
  };
}
