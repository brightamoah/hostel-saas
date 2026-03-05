import type { RouteNamedMap } from "vue-router/auto-routes";

export default defineNuxtRouteMiddleware(async (to) => {
  const { loggedIn, user, fetch: fetchUserSession } = useUserSession();

  const { $apiFetch, runWithContext } = useNuxtApp();

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
    "auth-verifyEmail",
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
      const post = await $apiFetch<PostLoginResponse>("/api/auth/postLogin", {
        method: "GET",
      });

      return navigateTo(post.nextUrl);
    }
    return;
  }

  if (!loggedIn.value || !user.value) {
    return navigateTo({
      name: "auth-login",
      query: { redirect: to.fullPath }, // Save intended destination
    });
  }

  if (!user.value.emailVerified) return navigateTo({ name: "auth-resendVerification" });

  if (user.value.role === "admin") return;

  if (!loggedIn.value || !user.value || user.value.role !== "student") return;

  const studentStatus = useStudentStatus();

  try {
    await studentStatus.fetchStatus();
  }
  catch (error) {
    console.warn("Failed to fetch student status in middleware:", error);
    return;
  }

  if (!loggedIn.value || !user.value) return;

  if (studentStatus.needsOnboarding) {
    if (routeName === "auth-onboarding") return;

    return navigateTo({ name: "auth-onboarding" });
  }

  if (studentStatus.needsHostelSelection) {
    if (hostelSelectionRoutes.includes(routeName)) return;

    if (studentProtectedRoutes.includes(routeName)) {
      if (import.meta.client) {
        runWithContext(() => {
          const toast = useToast();

          toast.add({
            title: "Hostel Selection Required",
            description: "Please choose a hostel and book a room to access this page.",
            color: "warning",
            icon: "i-lucide-building-2",
            duration: 8000,
          });
        });
      }
    }
    return navigateTo({ name: "auth-hostelHub" });
  }

  if (studentStatus.isFullyOnboarded) {
    if (routeName === "auth-onboarding" || hostelSelectionRoutes.includes(routeName)) {
      return navigateTo({ name: "student-dashboard" });
    }
  }
});
