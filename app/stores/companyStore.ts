import type { FormSubmitEvent } from "@nuxt/ui";

import { acceptHMRUpdate, defineStore } from "pinia";

export const useCompanyStore = defineStore("companyStore", () => {
  const toast = useToast();

  const { $apiFetch } = useNuxtApp();

  const isLoading = ref(false);

  const createCompanyState = reactive<RegisterCompanySchema>({
    name: "",
    email: "",
    phoneNumber: "",
    password: "",
    confirmPassword: "",

    companyName: "",
    companySlug: "",

    createHostelNow: true,
    hostelName: undefined,
    hostelSlug: undefined,
    supportEmail: undefined,
    supportPhone: undefined,
    hostelLogo: undefined,
  });

  const setupAutoSlug = (
    nameKey: "companyName" | "hostelName",
    slugKey: "companySlug" | "hostelSlug",
  ) => {
    const isTouched = ref(false);
    const lastAutoSlug = ref("");

    watch(
      () => createCompanyState[slugKey],
      (newVal, oldVal) => {
        if (!newVal) {
          isTouched.value = false;
          return;
        }
        if (oldVal !== undefined && newVal !== lastAutoSlug.value) {
          isTouched.value = true;
        }
      },
    );

    watch(
      () => createCompanyState[nameKey],
      (newName) => {
        if (isTouched.value) return;

        const generated = createSlug(newName || "");
        lastAutoSlug.value = generated;
        createCompanyState[slugKey] = generated;
      },
      { immediate: true },
    );
  };

  setupAutoSlug("companyName", "companySlug");
  setupAutoSlug("hostelName", "hostelSlug");

  watch(
    () => createCompanyState.createHostelNow,
    (enabled) => {
      if (!enabled) {
        Object.assign(createCompanyState, {
          hostelName: undefined,
          hostelSlug: undefined,
          supportEmail: undefined,
          supportPhone: undefined,
        });
      }
    },
  );

  const submitRegistration = async (payload: FormSubmitEvent<RegisterCompanySchema>) => {
    isLoading.value = true;
    try {
      const response = await $apiFetch("/api/auth/registerCompanyOwner", {
        method: "POST",
        body: payload.data,
      });

      toast.add({
        title: "Signup Successful",
        description: response.message || "Please check your email for a verification link to complete registration.",
        color: "success",
        icon: "i-lucide-circle-check-big",
      });

      await navigateTo({ name: "auth-login" });
    }
    catch (error: any) {
      const message = error?.data?.message || "Company registration failed. Please try again.";
      toast.add({
        title: "Registration Failed",
        description: message,
        color: "error",
        icon: "i-lucide-circle-alert",
        duration: 8000,
      });
    }
    finally {
      isLoading.value = false;
    }
  };

  return {
    createCompanyState,
    isLoading,
    submitRegistration,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useCompanyStore, import.meta.hot));
}
