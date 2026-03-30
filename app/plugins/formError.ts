import type { FormErrorEvent } from "@nuxt/ui";

export default defineNuxtPlugin(() => {
  const toast = useToast();
  return {
    provide: {
      handleFormError(event: FormErrorEvent) {
        const messages = event.errors.map(e => e.message).join(", ");
        toast.add({
          title: "Form Validation Error",
          description: messages,
          color: "error",
          icon: "i-lucide-circle-alert",
        });
      },
    },
  };
});
