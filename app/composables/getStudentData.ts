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

  const hasProfile = computed(() => data.value?.hasProfile ?? false);

  const hasActiveBooking = computed(() => data.value?.hasActiveBooking ?? false);

  const studentId = computed(() => data.value?.studentId);

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
