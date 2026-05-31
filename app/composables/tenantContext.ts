import { useAppConfig } from "#imports";

export function useTenantContext() {
  const { loggedIn } = usePortalUserSession();

  const { data, status, refresh } = useFetch("/api/settings/publicContext", {
    method: "GET",
    immediate: loggedIn.value,
    watch: [loggedIn],
    key: "tenant-public-context",
    lazy: true,
    cache: "default",
    getCachedData: (key, nuxtApp, ctx) => {
      if (ctx.cause === "refresh:manual" || ctx.cause === "refresh:hook") return undefined;
      return nuxtApp.payload.data[key] ?? nuxtApp.static.data[key];
    },
  });

  const tenantContext = computed(() => data.value?.data ?? null);

  watch(tenantContext, (context) => {
    if (context?.branding) {
      const appConfig = useAppConfig();

      const primary = context.branding.primaryColor;
      const accent = context.branding.accentColor;

      if (primary) appConfig.ui.colors.primary = colorLabel(primary).toLocaleLowerCase();

      if (accent) appConfig.ui.colors.neutral = colorLabel(accent).toLocaleLowerCase();
    }
  }, { immediate: true, deep: true });

  return {
    tenantContext,
    tenantContextStatus: status,
    refreshTenantContext: refresh,
  };
}
