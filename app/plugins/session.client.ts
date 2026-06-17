export default defineNuxtPlugin(async (nuxtApp) => {
  if (!nuxtApp.payload.serverRendered) {
    await usePortalUserSession().fetch();
  }
  else if (Boolean(nuxtApp.payload.prerenderedAt) || Boolean(nuxtApp.payload.isCached) || nuxtApp.$config.public.auth.loadStrategy === "client-only") {
    nuxtApp.hook("app:mounted", async () => {
      await usePortalUserSession().fetch();
    });
  }

  if (localStorage.getItem("temp-app-auth-utils-popup")) {
    localStorage.removeItem("temp-app-auth-utils-popup");
    const error = useError();
    if (!error.value) window.close();
  }
});
