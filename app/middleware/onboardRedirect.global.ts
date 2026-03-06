import type { RouteNamedMap } from "vue-router/auto-routes";

export default defineNuxtRouteMiddleware(async (to) => {
  const {
    loggedIn,
    user,
    session,
    fetch: fetchUserSession,
  } = useUserSession();

  const { runWithContext } = useNuxtApp();

  await fetchUserSession();

  const publicRoutes: (keyof RouteNamedMap)[] = [
    "index",
    "about",
    "contact",
    "faq",
  ];

  const authRoutes: (keyof RouteNamedMap)[] = [
    "auth-login",
    "auth-verifyEmail",
    "auth-signup",
    "auth-forgotPassword",
    "auth-resetPassword",
    "auth-resendVerification",
    "auth-registerCompany",
  ];

  const hostelSelectionRoutes: (keyof RouteNamedMap)[] = [
    "auth-hostelHub",
  ];

  const studentProtectedRoutes: (keyof RouteNamedMap)[] = [
    "student-dashboard",
    "student-rooms",
    "student-visitors",
    "student-maintenance",
    "student-complaints",
    "student-billing",
    "student-announcements",
    "student-profile",
    "student-settings",
  ];

  const selfHandledRoutes: (keyof RouteNamedMap)[] = [
    "auth-logout",
    "auth-handoff",
  ];

  const routeName = to.name as keyof RouteNamedMap;

  if (selfHandledRoutes.includes(routeName)) return;

  if (publicRoutes.includes(routeName)) return;

  if (authRoutes.includes(routeName)) {
    if (loggedIn.value && user.value) {
      if (user.value.role === "admin") {
        return navigateTo("/admin/dashboard");
      }

      if (!session.value?.onboarded) {
        return navigateTo({ name: "auth-onboarding" });
      }

      if (!session.value?.hasActiveBooking) {
        return navigateTo({ name: "auth-hostelHub" });
      }

      return navigateTo({ name: "auth-hostelHub" });
    }
    return;
  }

  if (!loggedIn.value || !user.value) {
    return navigateTo({
      name: "auth-login",
      query: { redirect: to.fullPath },
    });
  }

  if (!user.value.emailVerified) return navigateTo({ name: "auth-resendVerification" });

  if (user.value.role === "admin") return;

  const onboarded = session.value?.onboarded ?? false;
  const hasActiveAllocation = session.value?.hasActiveAllocation ?? false;

  if (!onboarded) {
    if (routeName === "auth-onboarding") return;
    return navigateTo({ name: "auth-onboarding" });
  }

  if (onboarded && !hasActiveAllocation) {
    if (hostelSelectionRoutes.includes(routeName)) return;

    if (routeName === "auth-onboarding") {
      return navigateTo({ name: "auth-hostelHub" });
    }

    if (studentProtectedRoutes.includes(routeName)) {
      if (import.meta.client) {
        runWithContext(() => {
          const toast = useToast();

          toast.add({
            title: "Hostel Selection Required",
            description: "Please select a hostel and book a room first.",
            color: "warning",
            icon: "i-lucide-building-2",
            duration: 5000,
          });
        });
      }
    }
    return navigateTo({ name: "auth-hostelHub" });
  }

  if (onboarded && hasActiveAllocation) {
    if (routeName === "auth-onboarding" || hostelSelectionRoutes.includes(routeName)) {
      return navigateTo({ name: "student-dashboard" });
    }
  }
});
