export default defineNuxtPlugin(() => {
  const { csrf, headerName } = useCsrf();

  const apiFetch = $fetch.create({
    onRequest(context) {
      context.options.headers = new Headers(context.options.headers || {});
      context.options.headers.append(headerName, csrf);
    },
    async onResponseError({ response }) {
      if (response.status === 401) {
        if (import.meta.client) {
          const toast = useToast();
          toast.add({
            title: "Session Expired",
            description: "Your session has expired or you are not authorized. Please log in again.",
            color: "error",
            icon: "i-lucide-lock",
            duration: 5000,
          });
          await navigateTo({ name: "auth-logout" });
        }
      }
    },
  });

  return {
    provide: {
      apiFetch,
    },
  };
});
