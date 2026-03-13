import { clearPortalUserSession } from "../utils/portalSession";

export default defineEventHandler(async (event) => {
  const path = event.path;

  if (
    path.startsWith("/_nuxt")
    || path.startsWith("/__nuxt")
    || path.startsWith("/_ipx")
    || path.includes(".")
    || path.startsWith("/api/auth/")
  ) {
    return;
  }

  const surface = getSurface(event);
  const currentSession = await getPortalUserSession(event);

  const user = currentSession?.user;

  if (!user) return;

  const userRole = user.role;

  if (surface === "admin" && userRole !== "admin") {
    await clearPortalUserSession(event);
    return;
  }

  if (surface === "public" && userRole === "admin") {
    await clearPortalUserSession(event);
  }
});
