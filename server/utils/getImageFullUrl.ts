export function getImageFullUrl(path: string | null | undefined): string | null {
  const config = useRuntimeConfig();
  const baseUrl = config.public?.adminBaseUrl?.replace(/\/$/, "") || "";

  let imageUrl = path;

  if (path && !path.startsWith("http")) {
    return imageUrl = `${baseUrl}${path}`;
  }

  return imageUrl || null;
}
