<script setup lang="ts">
import { en_gb } from "@nuxt/ui/locale";
import { breakpointsTailwind, useBreakpoints, useIdle } from "@vueuse/core";

const runtimeConfig = useRuntimeConfig();

const { userProfile } = useUser();

const breakpoints = useBreakpoints(breakpointsTailwind);
const isMobile = breakpoints.smaller("md");

provide(userProfileKey, userProfile);
provide(isMobileKey, isMobile);

useTenantContext();

const appLocale = useState("appLocale", () => en_gb);

useHead({
  titleTemplate: titleChunk =>
    titleChunk
      ? `${titleChunk} - ${runtimeConfig.public.emailFromName}`
      : runtimeConfig.public.emailFromName,
});

const { loggedIn } = usePortalUserSession();
const { idle } = useIdle(10 * 60 * 1000);

watch(idle, async (isIdle) => {
  if (isIdle && loggedIn.value) {
    const toast = useToast();
    toast.add({
      title: "Session Expired",
      description: "You have been logged out due to 10 minutes of inactivity.",
      color: "warning",
      duration: 8000,
    });

    await navigateTo({ name: "auth-logout" });
  }
});
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
}

.page-enter-active,
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
