import { createSharedComposable } from "@vueuse/core";

import { useRoleBasedRoute } from "./useRoleBasedRoutes";

function _useDashboard() {
  const route = useRoute();
  const router = useRouter();
  const isNotificationsSlideoverOpen = ref(false);

  const roleBasedRoutes = useRoleBasedRoute();

  defineShortcuts({
    "g-h": () => {
      const dashboard = roleBasedRoutes.value?.dashboard;
      if (dashboard) void router.push(dashboard);
    },
    "g-u": () => {
      const users = roleBasedRoutes.value?.users;
      if (users) void router.push(users);
    },
    "g-v": () => {
      const visitors = roleBasedRoutes.value?.visitors;
      if (visitors) void router.push(visitors);
    },
    "g-s": () => void router.push("/settings"),
    "n": () => isNotificationsSlideoverOpen.value = !isNotificationsSlideoverOpen.value,
  });

  watch(() => route.fullPath, () => {
    isNotificationsSlideoverOpen.value = false;
  });

  return {
    isNotificationsSlideoverOpen,
  };
}

export const useDashboard = createSharedComposable(_useDashboard);
