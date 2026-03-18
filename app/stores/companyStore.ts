import type { FormSubmitEvent } from "@nuxt/ui";

import { acceptHMRUpdate, defineStore } from "pinia";

export const useCompanyStore = defineStore("companyStore", () => {
  const toast = useToast();

  const { $apiFetch } = useNuxtApp();
  const { user } = usePortalUserSession();

  const isLoading = ref(false);
  const isUploading = ref(false);
  const uploadProgress = ref(0);

  const roomDataKey = computed(() => `roomData:${user.value?.adminData?.accessLevel}`);

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
    joinCode: undefined,
  });

  const createHostelState = reactive<HostelDetailsSchema>({
    name: "",
    slug: "",
    supportEmail: "",
    supportPhone: "",
    joinCode: "",
    address: "",
    logo: undefined,
    logoUrl: "",
    logoKey: "",
  });

  const setupAutoSlug = (
    state: any,
    nameKey: string,
    slugKey: string,
  ) => {
    const isTouched = ref(false);
    const lastAutoSlug = ref("");

    watch(
      () => state[slugKey],
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
      () => state[nameKey],
      (newName) => {
        if (isTouched.value) return;

        const generated = createSlug(newName || "");
        lastAutoSlug.value = generated;
        state[slugKey] = generated;
      },
      { immediate: true },
    );
  };

  setupAutoSlug(createCompanyState, "companyName", "companySlug");
  setupAutoSlug(createCompanyState, "hostelName", "hostelSlug");
  setupAutoSlug(createHostelState, "name", "slug");

  const setupAutoJoinCode = (state: any, nameKey: string, joinCodeKey: string) => {
    const isJoinCodeTouched = ref(false);
    const lastAutoJoinCode = ref("");

    watch(
      () => state[joinCodeKey],
      (newVal, oldVal) => {
        if (newVal && oldVal !== undefined && newVal !== lastAutoJoinCode.value) {
          isJoinCodeTouched.value = true;
        }

        if (!newVal) {
          isJoinCodeTouched.value = false;
        }
      },
    );

    watch(
      () => state[nameKey],
      (newName) => {
        if (isJoinCodeTouched.value) return;

        if (newName && newName.trim().length >= 2) {
          const generated = generateHostelJoinCode(newName, lastAutoJoinCode.value);
          lastAutoJoinCode.value = generated;
          state[joinCodeKey] = generated;
        }
        else {
          state[joinCodeKey] = undefined;
          lastAutoJoinCode.value = "";
        }
      },
      { immediate: true },
    );

    return { isJoinCodeTouched, lastAutoJoinCode };
  };

  const companyJoinTracker = setupAutoJoinCode(createCompanyState, "hostelName", "joinCode");
  const standaloneJoinTracker = setupAutoJoinCode(createHostelState, "name", "joinCode");

  function regenerateCompanyJoinCode() {
    const hostelName = createCompanyState.hostelName;
    const generated = generateHostelJoinCode(hostelName || "HOSTEL");
    createCompanyState.joinCode = generated;
    companyJoinTracker.lastAutoJoinCode.value = generated;
    companyJoinTracker.isJoinCodeTouched.value = false;
  }

  function regenerateStandaloneJoinCode() {
    const hostelName = createHostelState.name;
    const generated = generateHostelJoinCode(hostelName || "HOSTEL");
    createHostelState.joinCode = generated;
    standaloneJoinTracker.lastAutoJoinCode.value = generated;
    standaloneJoinTracker.isJoinCodeTouched.value = false;
  }

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
          joinCode: undefined,
        });
        companyJoinTracker.isJoinCodeTouched.value = false;
        companyJoinTracker.lastAutoJoinCode.value = "";
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

  async function deleteImage(key: string): Promise<boolean> {
    try {
      await $apiFetch("/api/upload/image", {
        method: "DELETE",
        body: { key },
      });
      return true;
    }
    catch (error) {
      console.error("Failed to delete image:", error);
      return false;
    }
  };

  const submitRegistration = async (payload: FormSubmitEvent<RegisterCompanySchema>) => {
    isLoading.value = true;
    let uploadedKey: string | undefined;

    try {
      if (createCompanyState.hostelLogo && !createCompanyState.hostelLogoUrl) {
        const result = await uploadImage(createCompanyState.hostelLogo);

        if (result) {
          createCompanyState.hostelLogoUrl = result.url;
          createCompanyState.hostelLogoKey = result.key;
          uploadedKey = result.key;
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
        joinCode: createCompanyState.joinCode,
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

      resetState();

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

      if (uploadedKey) {
        await deleteImage(uploadedKey);
        createCompanyState.hostelLogoKey = undefined;
        createCompanyState.hostelLogoUrl = undefined;
      }
    }
    finally {
      isLoading.value = false;
    }
  };

  const removeCompanyHostelLogo = async () => {
    if (createCompanyState.hostelLogoKey) await deleteImage(createCompanyState.hostelLogoKey);
    createCompanyState.hostelLogo = undefined;
    createCompanyState.hostelLogoKey = undefined;
    createCompanyState.hostelLogoUrl = undefined;
  };

  const removeStandaloneHostelLogo = () => {
    createHostelState.logo = undefined;
  };

  const hasLogo = computed(() => !!createCompanyState.hostelLogo || !!createCompanyState.hostelLogoUrl);

  const logoPreviewUrl = computed(() => {
    if (createCompanyState.hostelLogoUrl) {
      if (createCompanyState.hostelLogoUrl.startsWith("http")) return createCompanyState.hostelLogoUrl;

      const config = useRuntimeConfig();
      const baseUrl = config.public.adminBaseUrl?.replace(/\/$/, "") || "";

      const logoUrl = `${baseUrl}${createCompanyState.hostelLogoUrl}`;

      return logoUrl;
    }

    if (createCompanyState.hostelLogo) return URL.createObjectURL(createCompanyState.hostelLogo);
    return null;
  });

  const createHostel = async (payload: FormSubmitEvent<HostelDetailsSchema>) => {
    isLoading.value = true;
    let uploadedKey: string | undefined;

    try {
      if (createHostelState.logo && !createHostelState.logoUrl) {
        const result = await uploadImage(createHostelState.logo);

        if (result) {
          createHostelState.logoUrl = result.url;
          createHostelState.logoKey = result.key;
          uploadedKey = result.key;
        }
      }

      const hostelData = {
        name: payload.data.name,
        slug: payload.data.slug,
        supportEmail: payload.data.supportEmail,
        supportPhone: payload.data.supportPhone,
        address: payload.data.address,
        logoUrl: createHostelState.logoUrl,
        logoKey: createHostelState.logoKey,
        joinCode: payload.data.joinCode,
      } satisfies HostelDetailsSchema;

      const response = await $apiFetch("/api/admin/hostel/create", {
        method: "POST",
        body: hostelData,
      });

      await refreshNuxtData(roomDataKey.value);

      toast.add({
        title: response.message || "Hostel Created",
        description: "The hostel has been created successfully.",
        color: "success",
        icon: "i-lucide-circle-check-big",
      });

      resetState();
    }
    catch (error: any) {
      const message = error?.data?.message || "Failed to create hostel. Please try again.";
      toast.add({
        title: "Hostel Creation Failed",
        description: message,
        color: "error",
        icon: "i-lucide-circle-alert",
        duration: 8000,
      });

      if (uploadedKey) {
        await deleteImage(uploadedKey);
        createHostelState.logoKey = "";
        createHostelState.logoUrl = "";
      }
    }
    finally {
      isLoading.value = false;
    }
  };

  async function copyJoinCode(code: string | undefined) {
    if (!code) return;

    try {
      await navigator.clipboard.writeText(code);
      toast.add({
        title: "Copied!",
        description: "Join code copied to clipboard.",
        color: "success",
        icon: "i-lucide-copy-check",
        duration: 2000,
      });
    }
    catch {
      toast.add({
        title: "Copy Failed",
        description: "Could not copy to clipboard.",
        color: "error",
      });
    }
  }

  function resetState() {
    Object.assign(createCompanyState, {
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
      hostelJoinCode: undefined,
    });
    companyJoinTracker.isJoinCodeTouched.value = false;

    Object.assign(createHostelState, {
      name: "",
      slug: "",
      supportEmail: "",
      supportPhone: "",
      joinCode: "",
      address: "",
      logo: undefined,
      email: "",
      contactNumber: "",
    });
  };

  return {
    createCompanyState,
    isLoading,
    isUploading,
    uploadProgress,
    logoPreviewUrl,
    hasLogo,
    createHostelState,
    createHostel,
    uploadImage,
    submitRegistration,
    deleteImage,
    regenerateCompanyJoinCode,
    regenerateStandaloneJoinCode,
    removeCompanyHostelLogo,
    removeStandaloneHostelLogo,
    copyJoinCode,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useCompanyStore, import.meta.hot));
}
