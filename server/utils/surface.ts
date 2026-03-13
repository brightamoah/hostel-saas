import type { H3Event } from "h3";

export type Surface = "admin" | "public";

export function getSurface(event: H3Event): Surface {
  const host = getRequestHeader(event, "host");

  if (host?.toLocaleLowerCase().startsWith("admin.")) return "admin";

  if (import.meta.dev) {
    if (host?.includes(":3001")) return "admin";
  }

  return "public";
}
