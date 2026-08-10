import type { FormErrorEvent } from "@nuxt/ui";

declare module "#app" {
  interface NuxtApp {
    $apiFetch: typeof $fetch;
    $handleFormError: (event: FormErrorEvent) => void;
  }
}

declare module "vue" {
  interface ComponentCustomProperties {
    $apiFetch: typeof $fetch;
    $handleFormError: (event: FormErrorEvent) => void;
  }
}
