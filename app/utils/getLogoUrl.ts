export function getLogoUrl(path: string | null | undefined): string {
  const config = useRuntimeConfig();
  const baseUrl = config.public?.adminBaseUrl?.replace(/\/$/, "") || "";

  if (!path) return "";

  if (path.startsWith("http")) return path;

  const logoUrl = `${baseUrl}${path}`;

  return logoUrl;
}
