export function getLogoUrl(path: string | null | undefined): string {
  const config = useRuntimeConfig();
  const baseUrl = config.public?.adminBaseUrl?.replace(/\/$/, "") || "";

  if (!path) {
    return `${baseUrl}/default-logo.png`;
  }

  return `${baseUrl}${path}`;
}