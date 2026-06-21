import type { RouteLocationRaw } from "vue-router";
import { goto } from "~/utils/goto";

export default defineNuxtRouteMiddleware(async () => {
  const { loggedIn, user } = usePortalUserSession();

  if (loggedIn.value && user.value && user.value.role !== "admin") {
    const toast = useToast();

    toast.add({
      title: "Access Denied",
      description: "You don't have permission to access admin pages.",
      color: "error",
      icon: "i-lucide-shield-alert",
      duration: 8000,
    });

    const surface = usePortalSurface();
    if (user.value.role === "student" && surface === "admin") {
      const config = useRuntimeConfig();
      return await goto(`${config.public.siteBaseUrl}/student/dashboard`);
    }

    const dashboardRoute: RouteLocationRaw = user.value.role === "student"
      ? { name: "student-dashboard" }
      : { name: "index" };

    return navigateTo(dashboardRoute);
  }
});
