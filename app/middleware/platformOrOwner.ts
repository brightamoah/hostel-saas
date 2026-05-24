export default defineNuxtRouteMiddleware(() => {
  const { isPlatformAdminOrOwner } = usePortalUserSession();

  if (!isPlatformAdminOrOwner.value) {
    const toast = useToast();

    toast.add({
      title: "Access Denied",
      description: "You don't have permission to access this page.",
      color: "error",
      icon: "i-lucide-shield-alert",
      duration: 8000,
    });

    return navigateTo({ name: "admin-dashboard" });
  }
});
