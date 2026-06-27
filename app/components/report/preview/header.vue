<script lang="ts" setup>
const {
  exportTitle,
  hasPreview,
  previewDataLength,
  canSaveTemplate,
  isExporting,
} = defineProps<{
  exportTitle: string;
  hasPreview: boolean;
  previewDataLength: number;
  canSaveTemplate: boolean;
  isExporting: boolean;
}>();

const emit = defineEmits<{
  close: [];
  save: [];
  preview: [];
  export: [];
}>();
</script>

<template>
  <UDashboardNavbar
    :title="exportTitle"
    :toggle="false"
  >
    <template #leading>
      <UButton
        icon="i-lucide-arrow-left"
        color="neutral"
        variant="ghost"
        class="lg:hidden -ms-1.5 cursor-pointer"
        @click="emit('close')"
      />

      <UBadge
        v-if="hasPreview"
        color="primary"
        variant="subtle"
        class="hidden sm:flex"
      >
        {{ previewDataLength.toLocaleString() }} rows
      </UBadge>
    </template>

    <template #right>
      <UButton
        v-if="canSaveTemplate"
        icon="i-lucide-bookmark"
        color="neutral"
        variant="subtle"
        size="sm"
        class="cursor-pointer"
        label="Save Template"
        :ui="{
          label: 'hidden sm:inline-flex',
        }"
        @click="emit('save')"
      />

      <UButton
        v-if="hasPreview"
        icon="i-lucide-external-link"
        color="neutral"
        variant="soft"
        size="sm"
        :loading="isExporting"
        class="cursor-pointer"
        label="Preview PDF"
        :ui="{
          label: 'hidden sm:inline-flex',
        }"
        @click="emit('preview')"
      />

      <UButton
        v-if="hasPreview"
        icon="i-lucide-download"
        color="primary"
        variant="solid"
        size="sm"
        :loading="isExporting"
        class="cursor-pointer"
        label="Export PDF"
        :ui="{
          label: 'hidden sm:inline-flex',
        }"
        @click="emit('export')"
      />
    </template>
  </UDashboardNavbar>
</template>
