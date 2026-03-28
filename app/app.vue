<script setup lang="ts">
import { en_gb } from "@nuxt/ui/locale";
import { breakpointsTailwind, useBreakpoints } from "@vueuse/core";

const { user } = usePortalUserSession();

const breakpoints = useBreakpoints(breakpointsTailwind);
const isMobile = breakpoints.smaller("md");

const { data } = useFetch("/api/user/userProfile", {
  method: "GET",
  key: computed(() => `user-profile-${user.value?.id}`),
  lazy: true,
  cache: "default",
  getCachedData: (key, nuxtApp, ctx) => {
    if (ctx.cause === "refresh:manual" || ctx.cause === "refresh:hook") return undefined;
    return nuxtApp.payload.data[key] ?? nuxtApp.static.data[key];
  },
});

const userProfile = computed<UserProfile | null>(() => {
  const profile = data.value?.data;
  if (!profile) return null;
  return {
    ...profile,
    createdAt: new Date(profile.createdAt),
  };
});

provide(isMobileKey, isMobile);
provide(userProfileKey, userProfile);

const appLocale = useState("appLocale", () => en_gb);
</script>

<template>
  <UApp
    :toaster="{ position: 'bottom-right', duration: 5000 }"
    :locale="appLocale"
  >
    <NuxtRouteAnnouncer />

    <NuxtLoadingIndicator
      color="var(--ui-primary)"
      :height="2"
    />

    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>

<style scoped>
/* .page-enter-active,
.page-leave-active {
  transition:
    opacity 0.5s ease,
    transform 0.5s ease;
}

.page-enter,
.page-leave-to {
  opacity: 0;
  transform: translateY(20px);
} */

/* .page-enter-active,
.page-leave-active {
  transition:
    opacity 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94),
    transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.page-enter-from {
  opacity: 0;
  transform: translateX(30px) scale(0.95);
}

.page-leave-to {
  opacity: 0;
  transform: translateX(-30px) scale(0.95);
} */
</style>
