import type { RouteLocationRaw } from "vue-router";

export default defineNuxtRouteMiddleware(async () => {
  const { loggedIn, user } = usePortalUserSession();
  const { $apiFetch } = useNuxtApp();

  if (loggedIn.value && user.value) {
    const post = await $apiFetch<PostLoginResponse>("/api/auth/postLogin", {
      method: "GET",
    });

    const target: RouteLocationRaw = post.nextUrl;
    return navigateTo(target);
  }
});
