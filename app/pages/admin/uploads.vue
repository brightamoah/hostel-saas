<script lang="ts" setup>
definePageMeta({
  layout: "onboard",
  middleware: ["requires-auth", "admin"],
});

const image = ref<File | null>(null);

const toast = useToast();
const { $apiFetch } = useNuxtApp();
const isUploading = ref(false);

const url = ref("");

async function uploadImage(file: File): Promise<{ url: string; key: string } | null> {
  isUploading.value = true;

  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", "hostels");

    const response = await $apiFetch("/api/upload/image", {
      method: "POST",
      body: formData,
    });

    if (response.success && response.url) {
      url.value = response.url;
      return {
        url: response.url,
        key: response.url.split("/").slice(-3).join("/"),
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
  }
}

async function handleUpload() {
  if (!image.value) return;
  const res = await uploadImage(image.value);
  if (res) {
    url.value = res.url;
    toast.add({
      title: "Success",
      description: "Image uploaded successfully!",
      color: "success",
      icon: "i-lucide-circle-check-big",
    });
  }
}

async function copyUrl() {
  if (!url.value) return;
  await navigator.clipboard.writeText(url.value);
  toast.add({ title: "Copied to clipboard", color: "success", duration: 2000 });
}

function clearAll() {
  url.value = "";
  image.value = null;
}
</script>

<template>
  <div
    v-auto-animate
    class="flex flex-col justify-center items-center gap-3 min-h-screen"
  >
    <UAlert
      v-if="url"
      icon="i-lucide-check-circle"
      color="success"
      variant="subtle"
      title="Upload Successful!"
      description="Your hostel image is ready. Copy the URL below."
      class="w-full max-w-xl"
    >
      <template #description>
        <div class="flex items-center gap-2 mt-2">
          <UInput
            :model-value="url"
            readonly
            class="flex-1 font-mono text-xs"
            color="success"
            variant="outline"
          />

          <UTooltip text="Copy URL">
            <UButton
              variant="ghost"
              color="success"
              class="cursor-pointer"
              icon="i-lucide-copy"
              @click="copyUrl"
            />
          </UTooltip>

          <UTooltip text="Clear and Upload New">
            <UButton
              variant="ghost"
              color="error"
              class="cursor-pointer"
              icon="i-lucide-refresh-ccw"
              @click="clearAll"
            />
          </UTooltip>
        </div>
      </template>
    </UAlert>

    <UFileUpload
      v-model="image"
      icon="i-lucide-image"
      size="xl"
      class="w-[80%] md:w-150 h-80 min-h-43"
      label="Drop your hostel Logo or image"
      description="SVG, PNG, JPG or GIF (max. 2MB)"
      accept="image/png, image/jpeg, image/webp, image/jpg"
      :interactive="false"
      :file-delete="{
        class:
          'cursor-pointer hover:bg-error hover:text-white rounded size-5 hover:border-error text-center font-bold',
      }"
      :ui="{
        base: 'border-3 border-muted rounded-md p-4 cursor-pointer',
      }"
    >
      <template #actions="{ open }">
        <UButton
          label="Select From Your Device"
          icon="i-lucide-upload"
          color="primary"
          variant="outline"
          class="cursor-pointer"
          @click="open()"
        />
      </template>
    </UFileUpload>

    <UButton
      v-if="image"
      label="Upload Image"
      color="primary"
      variant="solid"
      size="lg"
      icon="i-lucide-upload"
      class="mt-6 cursor-pointer"
      :loading="isUploading"
      @click="handleUpload"
    />
  </div>
</template>

<style scoped></style>
