<script setup lang="ts">
const emit = defineEmits<{
  file: [file: File];
}>();

const isDragging = ref(false);
const isUploading = defineModel<boolean>("uploading", { default: false });

const ACCEPTED = [".xlsx", ".xls", ".csv"];

function onDrop(e: DragEvent) {
  isDragging.value = false;
  const file = e.dataTransfer?.files?.[0];
  if (file) emit("file", file);
}

function onInputChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) emit("file", file);

  (e.target as HTMLInputElement).value = "";
}
</script>

<template>
  <label
    class="group flex flex-col justify-center items-center px-8 py-16 border-4 border-dashed rounded-2xl w-full text-center transition-all duration-250 ease-out cursor-pointer select-none"
    :class="[
      isDragging
        ? 'border-primary bg-primary/5 scale-[1.015] shadow-lg shadow-primary/10'
        : 'border-default hover:border-primary/40 hover:bg-elevated/40',
      isUploading ? 'pointer-events-none opacity-55' : '',
    ]"
    @dragover.prevent="isDragging = true"
    @dragleave.prevent="isDragging = false"
    @drop.prevent="onDrop"
  >
    <input
      type="file"
      class="sr-only"
      :accept="ACCEPTED.join(',')"
      :disabled="isUploading"
      @change="onInputChange"
    >

    <div
      class="flex justify-center items-center bg-elevated shadow-sm mb-5 border border-default rounded-2xl size-16 transition-transform duration-200"
      :class="isDragging ? 'scale-110' : 'group-hover:scale-105'"
    >
      <UIcon
        v-if="!isUploading"
        name="i-lucide-cloud-upload"
        class="size-10 text-muted group-hover:text-primary/60 transition-colors duration-200"
      />

      <UIcon
        v-else
        name="i-lucide-loader"
        class="size-8 text-primary animate-spin"
      />
    </div>

    <p class="mb-1 font-semibold text-highlighted text-base">
      {{ isUploading ? "Parsing your file…" : "Drop your file here, or click to browse" }}
    </p>

    <p class="mb-6 text-muted text-sm">
      Supports
      <span
        v-for="(ext, i) in ACCEPTED"
        :key="ext"
        class="font-medium text-default"
      >{{ ext }}<span
        v-if="i < ACCEPTED.length - 1"
        class="font-normal text-muted"
      >, </span></span>
    </p>

    <UButton
      v-if="!isUploading"
      as="span"
      color="primary"
      variant="subtle"
      size="lg"
      label="Choose file"
      leading-icon="i-lucide-folder-open"
    />
  </label>
</template>
