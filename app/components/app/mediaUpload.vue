<script lang="ts" setup>
const {
  description = "Click or drag files here to upload",
  accept = "image/*,video/*",
  maxFiles = 3,
} = defineProps<{
  description?: string;
  accept?: string;
  maxFiles?: number;
}>();

const modelValue = defineModel<File[] | null | undefined>({ required: true, default: () => null });

const objectUrls = new WeakMap<File, string>();

function getObjectUrl(file: File | null | undefined) {
  if (!file) return "";
  if (objectUrls.has(file)) return objectUrls.get(file)!;

  const url = URL.createObjectURL(file);
  objectUrls.set(file, url);
  return url;
}

function handleRemoveFile(index: number) {
  if (!modelValue.value) return;

  const files = [...modelValue.value];
  const removed = files.splice(index, 1)[0];

  if (removed && objectUrls.has(removed)) {
    URL.revokeObjectURL(objectUrls.get(removed)!);
    objectUrls.delete(removed);
  }

  modelValue.value = files.length === 0 ? null : files;
}

function revokeObjectUrl(file: File) {
  const url = objectUrls.get(file);
  if (url) {
    URL.revokeObjectURL(url);
    objectUrls.delete(file);
  }
}

watch(() => modelValue.value, (newFiles, oldFiles) => {
  if (!oldFiles?.length) return;

  const removed = oldFiles.filter(file => !newFiles?.includes(file));
  removed.forEach(file => revokeObjectUrl(file));
}, { deep: true });

onUnmounted(() => {
  if (modelValue.value) {
    modelValue.value.forEach((file) => {
      if (file && objectUrls.has(file)) {
        URL.revokeObjectURL(objectUrls.get(file)!);
        objectUrls.delete(file);
      }
    });
  }
});
</script>

<template>
  <UFileUpload
    v-model="modelValue"
    multiple
    :accept
    icon="i-lucide-cloud-upload"
    :label="description"
    :interactive="false"
    :description="`You can upload up to ${maxFiles} files.`"
    :file-delete="{
      class:
        'cursor-pointer hover:bg-error hover:text-white rounded size-5 hover:border-error text-center font-bold',
    }"
    :ui="{
      base: 'border-3 border-dashed border-muted cursor-pointer',
    }"
  >
    <template #actions="{ open }">
      <UButton
        label="Select From Your Device"
        icon="i-lucide-cloud-upload"
        color="primary"
        variant="outline"
        class="cursor-pointer"
        @click="open()"
      />
    </template>

    <template #files-top="{ open, files }">
      <div
        v-if="files?.length"
        class="flex justify-between items-center mb-2"
      >
        <p class="font-bold">
          Files ({{ files?.length }})
        </p>

        <UButton
          icon="i-lucide-plus"
          label="Add more"
          color="neutral"
          variant="outline"
          class="-my-2 cursor-pointer"
          @click="open()"
        />
      </div>
    </template>

    <template #file-leading="{ file }">
      <div class="relative rounded-md size-full overflow-hidden">
        <video
          v-if="file.type?.startsWith('video/')"
          :src="getObjectUrl(file)"
          class="w-full h-full object-cover"
          controls
          preload="metadata"
        />

        <NuxtImg
          v-else-if="file.type?.startsWith('image/')"
          :src="getObjectUrl(file)"
          class="w-full h-full object-cover"
        />

        <div
          v-else
          class="flex justify-center items-center bg-muted w-full h-full"
        >
          <UIcon
            name="i-lucide-image"
            class="size-8 text-muted"
          />
        </div>
      </div>
    </template>

    <template #file-trailing="{ index }">
      <UButton
        icon="i-lucide-x"
        size="xs"
        color="error"
        variant="solid"
        class="top-1 right-1 z-20 absolute cursor-pointer"
        @click.stop.prevent="handleRemoveFile(index)"
      />
    </template>
  </UFileUpload>
</template>

<style scoped>

</style>
