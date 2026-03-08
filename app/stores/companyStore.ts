import type { FormSubmitEvent } from "@nuxt/ui";

import { acceptHMRUpdate, defineStore } from "pinia";

export const useCompanyStore = defineStore("companyStore", () => {
  const toast = useToast();

  const { $apiFetch } = useNuxtApp();

  const isLoading = ref(false);
  const isUploading = ref(false);
  const uploadProgress = ref(0);

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
    hostelAddress: undefined,
    hostelLogo: undefined,
    hostelLogoKey: undefined,
    hostelLogoUrl: undefined,
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
          hostelLogo: undefined,
          hostelLogoUrl: undefined,
          hostelLogoKey: undefined,
          hostelAddress: undefined,
        });
      }
    },
  );

  async function uploadImage(file: File): Promise<{ url: string; key: string } | null> {
    isUploading.value = true;
    uploadProgress.value = 0;
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "hostels");

      const progressInterval = setInterval(() => {
        if (uploadProgress.value < 90) {
          uploadProgress.value += 10;
        }
      }, 100);

      const response = await $apiFetch("/api/upload/image", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);

      if (response.success && response.url) {
        uploadProgress.value = 100;

        return {
          url: response.url,
          key: response.key,
        };
      }

      return null;
    }
    catch (error: any) {
      const message = error?.data?.message || "Failed to upload logo. Please try again.";
      toast.add({
        title: "Upload Failed",
        description: message,
        color: "error",
        icon: "i-lucide-circle-alert",
        duration: 5000,
      });
      return null;
    }
    finally {
      isUploading.value = false;

      setTimeout(() => {
        uploadProgress.value = 0;
      }, 500);
    }
  };

  const submitRegistration = async (payload: FormSubmitEvent<RegisterCompanySchema>) => {
    isLoading.value = true;
    try {
      if (createCompanyState.hostelLogo && !createCompanyState.hostelLogoUrl) {
        const result = await uploadImage(createCompanyState.hostelLogo);

        if (result) {
          createCompanyState.hostelLogoUrl = result.url;
          createCompanyState.hostelLogoKey = result.key;
        }
      }

      const registrationData = {
        name: payload.data.name,
        email: payload.data.email,
        phoneNumber: payload.data.phoneNumber,
        password: payload.data.password,
        confirmPassword: payload.data.confirmPassword,
        companyName: payload.data.companyName,
        companySlug: payload.data.companySlug,
        createHostelNow: payload.data.createHostelNow,
        hostelName: payload.data.hostelName,
        hostelSlug: payload.data.hostelSlug,
        hostelAddress: payload.data.hostelAddress,
        supportEmail: payload.data.supportEmail,
        supportPhone: payload.data.supportPhone,
        hostelLogoUrl: createCompanyState.hostelLogoUrl,
      };

      const response = await $apiFetch("/api/auth/registerCompanyOwner", {
        method: "POST",
        body: registrationData,
      });

      toast.add({
        title: "Registration Successful",
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

      if (createCompanyState.hostelLogoKey) {
        try {
          await $apiFetch("/api/upload/image", {
            method: "DELETE",
            body: { key: createCompanyState.hostelLogoKey },
          });
        }
        catch { }
        createCompanyState.hostelLogoKey = undefined;
        createCompanyState.hostelLogoUrl = undefined;
      }
    }
    finally {
      isLoading.value = false;
    }
  };
  // Remove uploaded logo
  const removeHostelLogo = async () => {
    if (createCompanyState.hostelLogoKey) {
      try {
        await $apiFetch("/api/upload/image", {
          method: "DELETE",
          body: { key: createCompanyState.hostelLogoKey },
        });
      }
      catch {
        // Ignore errors
      }
    }

    createCompanyState.hostelLogo = undefined;
    createCompanyState.hostelLogoUrl = undefined;
    createCompanyState.hostelLogoKey = undefined;
  };

  const hasLogo = computed(() => !!createCompanyState.hostelLogo || !!createCompanyState.hostelLogoUrl);

  const logoPreviewUrl = computed(() => {
    if (createCompanyState.hostelLogoUrl) {
      const config = useRuntimeConfig();
      const baseUrl = config.public.adminBaseUrl?.replace(/\/$/, "") || "";

      const logoUrl = `${baseUrl}${createCompanyState.hostelLogoUrl}`;

      return logoUrl;
    }

    if (createCompanyState.hostelLogo) return URL.createObjectURL(createCompanyState.hostelLogo);
    return null;
  });

  return {
    createCompanyState,
    isLoading,
    isUploading,
    uploadProgress,
    logoPreviewUrl,
    hasLogo,
    uploadImage,
    submitRegistration,
    removeHostelLogo,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useCompanyStore, import.meta.hot));
}
