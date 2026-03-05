import { acceptHMRUpdate, defineStore } from "pinia";

const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

export const useStudentStatus = defineStore("studentStatus", () => {
  const { user, loggedIn } = useUserSession();
  const { $apiFetch } = useNuxtApp();

  const hasProfile = ref(false);
  const hasActiveBooking = ref(false);
  const studentId = ref<number | null>(null);
  const isLoaded = ref(false);
  const isLoading = ref(false);
  const lastFetchTime = ref<number>(0);

  const needsOnboarding = computed(() => !hasProfile.value);
  const needsHostelSelection = computed(() => hasProfile.value && !hasActiveBooking.value);
  const isFullyOnboarded = computed(() => hasProfile.value && hasActiveBooking.value);

  const expectedRoute = computed(() => {
    if (needsOnboarding.value) return "/auth/onboarding";
    if (needsHostelSelection.value) return "/auth/hostelHub";
    return "/student/dashboard";
  });

  async function fetchStatus(force = false) {
    if (isLoaded.value && !force) return;

    if (!loggedIn.value || !user.value) {
      invalidate();
      return;
    }

    if (user.value?.role !== "student") return;

    if (isLoading.value) return;

    const now = Date.now();

    if (!force && isLoaded.value && (now - lastFetchTime.value) < CACHE_TTL) return;

    isLoading.value = true;

    try {
      const response = await $apiFetch<StudentStatusResponse>(
        "/api/auth/checkStudentDetails",
        { method: "GET" },
      );

      hasProfile.value = response.hasProfile;
      hasActiveBooking.value = response.hasActiveBooking;
      studentId.value = response.studentId ?? null;
      isLoaded.value = true;
    }
    catch (error: any) {
      if (error?.statusCode === 401 || error?.status === 401) {
        invalidate();
        return;
      }

      console.error("Failed to fetch student status:", error);

      throw error;
    }
    finally {
      isLoading.value = false;
    }
  }

  function invalidate() {
    isLoaded.value = false;
    hasProfile.value = false;
    hasActiveBooking.value = false;
    studentId.value = null;
    lastFetchTime.value = 0;
  }

  watch(
    () => user.value?.id,
    (newId, oldId) => {
      if (newId !== oldId) invalidate();
    },
  );

  watch(
    () => loggedIn.value,
    (isLoggedIn) => {
      if (!isLoggedIn) {
        invalidate();
      }
    },
  );

  return {
    hasProfile,
    hasActiveBooking,
    studentId,
    needsOnboarding,
    needsHostelSelection,
    isFullyOnboarded,
    expectedRoute,
    isLoading,
    isLoaded,
    fetchStatus,
    invalidate,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useStudentStatus, import.meta.hot));
}
