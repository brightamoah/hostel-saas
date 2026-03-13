import { getPortalUserSession } from "../utils/portalSession";

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook("request", async (event) => {
    if (event.path.includes(".")) return;

    // const config = useRuntimeConfig(event);

    const surface = getSurface(event);

    const session = await getPortalUserSession(event);

    console.log(`[${surface.toUpperCase()}] Active User:`, session.user?.email || "Guest");
  });
});
