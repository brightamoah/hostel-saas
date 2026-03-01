export default defineNuxtPlugin(() => {
  const { csrf, headerName } = useCsrf();

  const apiFetch = $fetch.create({
    onRequest(context) {
      context.options.headers = new Headers(context.options.headers || {});
      context.options.headers.append(headerName, csrf);
    },
  });

  return {
    provide: {
      apiFetch,
    },
  };
});
