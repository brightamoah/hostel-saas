/**
 * Navigates to a given path. If the path is an external URL (starting with http or https),
 * it performs a full page redirect using window.location.replace. Otherwise, it uses
 * the internal navigation function (e.g., Nuxt's navigateTo).
 * @param path - The path or URL to navigate to.
 */
export async function goto(path: string) {
  if (/^https?:\/\//.test(path)) {
    window.location.replace(path);
  }
  else {
    await navigateTo(path, {
      replace: true,
      // external: true,
    });
  };
}
