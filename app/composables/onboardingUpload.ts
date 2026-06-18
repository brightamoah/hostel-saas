export function useOnboardingUpload() {
  const { $apiFetch } = useNuxtApp();
  const { isPlatformAdmin } = usePortalUserSession();

  const isUploading = ref(false);
  const isImporting = ref(false);
  const uploadResult = ref<UploadResult | null>(null);
  const errorMessage = ref("");

  const route = useRoute();
  const router = useRouter();

  const selectedCompanyId = computed({
    get: () => route.query.companyId ? Number(route.query.companyId) : undefined,
    set: async (val) => {
      await router.replace({
        query: {
          ...route.query,
          companyId: val || undefined,
        },
      });
    },
  });

  const queryParams = computed(() => {
    return selectedCompanyId.value ? { companyId: selectedCompanyId.value } : {};
  });

  const { data: historyData, status: historyStatus, error: historyError, refresh: refreshHistory } = useFetch<OnboardingHistoryResponseData>("/api/onboarding/history", {
    lazy: true,
    query: queryParams,
    default: () => ({ success: false, history: [] }),
    getCachedData: (key, nuxtApp, ctx) => {
      if (ctx.cause === "refresh:manual" || ctx.cause === "refresh:hook") return undefined;
      return nuxtApp.payload.data[key] ?? nuxtApp.static.data[key];
    },
  });

  const historyList = computed(() => historyData.value?.history ?? []);

  const isFetchingHistory = computed(() => historyStatus.value === "pending");
  const isHistoryError = computed(() => historyStatus.value === "error");
  const historyErrorMsg = computed(() => historyError.value?.message || "Failed to fetch history");

  const {
    coolDownTime,
    isLoading: refreshIsLoading,
    canResend,
    handleRefresh,
  } = useDataRefresh("onboarding-history-refresh", "Onboarding History", refreshHistory);

  const historyStatusFilterOptions = computed(() => {
    const items = [{ label: "All", value: "all" }];

    historyList.value.forEach((item) => {
      if (item.status && !items.some(i => i.value === item.status)) {
        items.push({
          label: capitalizeWords(item.status),
          value: item.status,
        });
      }
    });

    return items;
  });

  async function fetchUploadDetails(id: string) {
    try {
      const res = await $apiFetch<{ details: Record<string, SheetValidation> }>(`/api/onboarding/history/${id}`, {
        query: queryParams.value,
      });
      uploadResult.value = {
        uploadId: id,
        validation: res.details,
      };
    }
    catch (err: unknown) {
      const error = err as { data?: { message?: string }; message?: string };
      errorMessage.value = error.data?.message || error.message || "Failed to fetch upload details";
    }
  }

  async function processFile(file: File) {
    const validExtensions = [".xlsx", ".xls", ".csv"];

    if (!validExtensions.some(ext => file.name.endsWith(ext))) {
      errorMessage.value
        = "Please upload a valid Excel or CSV file.";
      return;
    }

    errorMessage.value = "";
    uploadResult.value = null;
    isUploading.value = true;

    const formData = new FormData();
    formData.append("file", file);

    try {
      uploadResult.value = await $apiFetch<UploadResult>(
        "/api/onboarding/preview",
        {
          method: "POST",
          query: queryParams.value,
          body: formData,
        },
      );
    }
    catch (err: unknown) {
      const error = err as { data?: { message?: string }; message?: string };
      errorMessage.value
        = error.data?.message
          || error.message
          || "Upload failed";
    }
    finally {
      isUploading.value = false;
    }
  }

  function resetUpload() {
    uploadResult.value = null;
    errorMessage.value = "";
  }

  async function importData() {
    if (!uploadResult.value?.uploadId) return;

    isImporting.value = true;
    errorMessage.value = "";

    try {
      await $apiFetch("/api/onboarding/import", {
        method: "POST",
        query: queryParams.value,
        body: { uploadId: uploadResult.value.uploadId },
      });

      const toast = useToast();
      toast.add({
        title: "Import Successful",
        description: "Your onboarding data has been imported into the system.",
        color: "success",
      });

      resetUpload();
    }
    catch (err: unknown) {
      const error = err as { data?: { message?: string }; message?: string };
      errorMessage.value
        = error.data?.message
          || error.message
          || "Import failed";

      const toast = useToast();
      toast.add({
        title: "Import Failed",
        description: errorMessage.value,
        color: "error",
      });
    }
    finally {
      isImporting.value = false;
    }
  }

  const { data: companiesData } = useFetch<Companies>("/api/admin/company", {
    key: "companiesList",
    lazy: true,
    immediate: isPlatformAdmin.value,
    getCachedData: (key, nuxtApp, ctx) => {
      if (ctx.cause === "refresh:manual" || ctx.cause === "refresh:hook") return undefined;
      return nuxtApp.payload.data[key] ?? nuxtApp.static.data[key];
    },
  });

  const companiesOptions = computed(() => {
    const list = companiesData.value ?? [];
    return list.map(company => ({
      label: company.name,
      value: company.id,
    }));
  });

  return {
    processFile,
    importData,
    resetUpload,
    fetchUploadDetails,
    historyList,
    historyData,
    historyStatus,
    isFetchingHistory,
    uploadResult,
    errorMessage,
    isUploading,
    isImporting,
    isHistoryError,
    historyErrorMsg,
    historyStatusFilterOptions,
    refreshHistory,
    coolDownTime,
    refreshIsLoading,
    canResend,
    handleRefresh,
    companiesOptions,
    selectedCompanyId,
  };
}
