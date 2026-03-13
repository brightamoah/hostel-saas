import type { H3Event } from "h3";

export function getPortalSessionConfig(event: H3Event) {
  const config = useRuntimeConfig(event);
  const surface = getSurface(event);
  const isAdmin = surface === "admin";

  return {
    name: isAdmin ? config.adminSessionName : config.session.name,
    password: isAdmin ? config.adminSessionPassword : config.session.password,
  };
}

export function getAdminPortalSessionConfig(event: H3Event) {
  const config = useRuntimeConfig(event);
  const surface = getSurface(event);

  if (surface !== "admin") {
    throw createError({
      statusCode: 400,
      message: "Admin session config can only be accessed from admin portal",
    });
  }

  return {
    name: config.adminSessionName,
    password: config.adminSessionPassword,
  };
}
