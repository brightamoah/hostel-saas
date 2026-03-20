export function usePortalSurface() {
  const host = useRequestURL().host;

  if (host?.toLocaleLowerCase().startsWith("admin.")) return "admin";

  if (import.meta.dev) {
    if (host?.includes(":3001")) return "admin";
  }

  return "public";
}
