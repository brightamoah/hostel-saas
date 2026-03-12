export default defineEventHandler(async (event) => {
  const path = event.path;

  if (
    path.startsWith("/_nuxt")
    || path.startsWith("/__nuxt")
    || path.startsWith("/_ipx")
    || path.includes(".")

    || path.startsWith("/api/auth/")
    || path === "/auth/login"
    || path === "/auth/logout"
    || path === "/auth/handoff"
  ) {
    return;
  }

  const session = await getUserSession(event);

  if (!session?.user) return;

  const surface = getSurface(event);
  const userRole = session.user.role;
  const sessionPortal = session.portal;

  if (sessionPortal && surface !== sessionPortal) {
    await clearUserSession(event);

    if (path.startsWith("/api/")) {
      throw createError({
        statusCode: 401,
        message: "Session invalid for this portal. Please log in again.",
      });
    }

    return;
  }

  if (surface === "public" && userRole === "admin") {
    await clearUserSession(event);

    if (path.startsWith("/api/")) {
      throw createError({
        statusCode: 401,
        message: "Session invalid for this portal. Please log in again.",
      });
    }
    return;
  }

  if (surface === "admin" && userRole !== "admin") {
    await clearUserSession(event);

    if (path.startsWith("/api/")) {
      throw createError({
        statusCode: 401,
        message: "Session invalid for this portal. Please log in again.",
      });
    }
  }
});
