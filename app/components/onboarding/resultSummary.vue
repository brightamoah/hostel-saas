<script setup lang="ts">
defineProps<{
  sheetCount: number;
  totalValid: number;
  totalInvalid: number;
}>();

const emit = defineEmits<{ reset: [] }>();
</script>

<template>
  <div class="flex sm:flex-row flex-col justify-between sm:items-center gap-4 mb-6">
    <div class="flex flex-wrap items-center gap-2.5 sm:gap-3">
      <div class="flex items-center gap-2 mr-1">
        <UIcon
          name="i-heroicons-check-circle"
          class="size-5 sm:size-6 text-success shrink-0"
        />

        <span class="font-medium text-highlighted text-sm">
          {{ sheetCount }} sheet{{ sheetCount !== 1 ? "s" : "" }} parsed
        </span>
      </div>

      <UBadge
        v-if="totalValid > 0"
        color="success"
        variant="subtle"
        size="md"
      >
        {{ totalValid }} valid
      </UBadge>

      <UBadge
        v-if="totalInvalid > 0"
        color="error"
        variant="subtle"
        size="md"
      >
        {{ totalInvalid }} invalid
      </UBadge>
    </div>

    <UButton
      size="md"
      color="neutral"
      variant="ghost"
      leading-icon="i-heroicons-arrow-path"
      class="justify-center border border-default sm:border-transparent w-full sm:w-auto cursor-pointer shrink-0"
      @click="emit('reset')"
    >
      Upload another file
    </UButton>
  </div>
</template>
