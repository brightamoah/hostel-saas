import type { H3Event } from "h3";

export function getPortalBaseUrls(event: H3Event) {
  const config = useRuntimeConfig(event);

  const siteBase = config.public.siteBaseUrl;
  const adminBase = config.public.adminBaseUrl;

  if (!siteBase || !adminBase) {
    throw createError({
      statusCode: 500,
      message: "Portal base URLs are not configured properly.",
    });
  }

  return {
    siteBase,
    adminBase,
  };
}
