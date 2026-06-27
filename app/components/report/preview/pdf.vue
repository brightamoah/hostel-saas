<script lang="ts" setup>
const {
  isGeneratingPdf,
  pdfPreviewUrl,
  isMobile,
} = defineProps<{
  isGeneratingPdf: boolean;
  pdfPreviewUrl: string | null;
  isMobile: boolean;
}>();

const emit = defineEmits<{
  previewInTab: [];
}>();
</script>

<template>
  <div class="absolute inset-4 flex flex-col shadow-sm border border-default rounded-xl min-h-0 overflow-hidden">
    <div
      v-if="isGeneratingPdf"
      class="flex flex-col flex-1 justify-center items-center space-y-4 h-full text-muted"
    >
      <UIcon
        name="i-lucide-loader-2"
        class="text-primary text-4xl animate-spin"
      />

      <p>Generating PDF Document...</p>
    </div>

    <iframe
      v-else-if="pdfPreviewUrl && !isMobile"
      :src="pdfPreviewUrl"
      class="flex-1 border-0 w-full h-full"
      title="PDF Preview"
    />

    <div
      v-else-if="pdfPreviewUrl && isMobile"
      class="flex flex-col flex-1 justify-center items-center space-y-4 p-6 h-full text-center"
    >
      <UIcon
        name="i-lucide-file-text"
        class="text-primary/50 text-6xl"
      />

      <p class="max-w-xs text-muted">
        PDF previews cannot be embedded on mobile devices. Please open it in a new tab.
      </p>

      <UButton
        label="Open PDF"
        icon="i-lucide-external-link"
        color="primary"
        variant="subtle"
        @click="emit('previewInTab')"
      />
    </div>
  </div>
</template>
