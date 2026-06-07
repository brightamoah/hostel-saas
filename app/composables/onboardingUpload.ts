export function useOnboardingUpload() {
  const { $apiFetch } = useNuxtApp();

  const isUploading = ref(false);
  const uploadResult = ref<UploadResult | null>(null);
  const errorMessage = ref("");

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
          body: formData,
        },
      );
    }
    catch (err: any) {
      errorMessage.value
        = err.data?.message
          || err.message
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

  return {
    processFile,
    resetUpload,
    uploadResult,
    errorMessage,
    isUploading,
  };
}
