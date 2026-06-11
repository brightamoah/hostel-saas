<script setup lang="ts">
const { result, sheets } = defineProps<{
  result: UploadResult;
  sheets: string[];
}>();

const sheetsWithSkipped = computed(() =>
  sheets.filter(
    k => (result.validation[k]?.skipped?.length ?? 0) > 0,
  ),
);

const totalSkipped = computed(() =>
  sheetsWithSkipped.value.reduce(
    (sum, k) => sum + (result.validation[k]?.skipped?.length ?? 0),
    0,
  ),
);
</script>

<template>
  <div>
    <div
      v-if="sheetsWithSkipped.length > 0"
      class="gap-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 mb-6"
    >
      <div
        v-for="name in sheetsWithSkipped"
        :key="name"
        class="group relative flex flex-col gap-3 bg-elevated/30 hover:bg-warning/5 px-4 py-3 border border-default hover:border-warning/40 rounded-xl transition-all duration-200"
      >
        <div class="flex items-center gap-2.5 min-w-0">
          <UIcon
            name="i-lucide-sheet"
            class="size-5 text-warning shrink-0"
          />

          <span class="font-medium text-highlighted text-sm truncate">{{ name }}</span>
        </div>

        <div class="flex justify-between items-end gap-2">
          <div>
            <p class="font-bold tabular-nums text-highlighted text-2xl leading-none">
              {{ result.validation[name]?.skipped?.length ?? 0 }}
            </p>

            <p class="mt-1 text-muted text-xs">
              skipped rows
            </p>
          </div>
        </div>

        <div class="right-4 bottom-0 left-4 absolute bg-warning/20 group-hover:bg-warning/40 rounded-full h-px transition-colors duration-200" />
      </div>
    </div>

    <div
      v-else
      class="flex flex-col justify-center items-center py-16 border border-default border-dashed rounded-xl text-center"
    >
      <UIcon
        name="i-lucide-check-circle"
        class="flex justify-center items-center size-10 text-success text-center"
      />

      <p class="mb-1 font-medium text-highlighted text-base">
        No rows skipped
      </p>

      <p class="text-muted text-sm">
        All valid rows will be imported.
      </p>
    </div>

    <div
      v-if="sheetsWithSkipped.length > 0"
      class="flex sm:flex-row flex-col sm:justify-between items-start sm:items-center gap-4 bg-elevated/30 px-5 py-4 border border-default rounded-xl"
    >
      <div>
        <p class="font-medium text-highlighted text-sm">
          Skipped Data
        </p>

        <p class="mt-0.5 text-muted text-xs">
          {{ totalSkipped }} row{{ totalSkipped !== 1 ? "s" : "" }} across
          {{ sheetsWithSkipped.length }} sheet{{ sheetsWithSkipped.length !== 1 ? "s" : "" }}
          already exist in the database and have been skipped to prevent duplicates.
        </p>
      </div>
    </div>
  </div>
</template>
