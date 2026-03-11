import type { H3Event } from "h3";

export function getImageFullUrl(
  path: string | null | undefined,
  event?: H3Event,
): string | null {
  if (!path) return null;

  if (path.startsWith("http://") || path.startsWith("https://")) return path;

  if (!event) return path;

  const requestUrl = getRequestURL(event);
  const origin = requestUrl.origin;

  return `${origin}${path}`;
}
