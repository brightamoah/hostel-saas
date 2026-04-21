export async function uploadFiles(files: File[] | File): Promise<MediaAttachment[]> {
  if (Array.isArray(files) && files.length === 0) {
    throw new Error("No files selected for upload.");
  }

  try {
    const { $apiFetch } = useNuxtApp();
    const formData = new FormData();

    const fileArray = Array.isArray(files) ? files : [files];

    for (const file of fileArray) {
      formData.append("files", file, file.name);
    }

    const response = await $apiFetch("/api/upload/maintenance", {
      method: "POST",
      body: formData,
    });

    return response.attachments;
  }
  catch (error) {
    console.error("Error uploading files:", error);
    throw error;
  }
}
