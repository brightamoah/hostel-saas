<script setup lang="ts">
const { result, sheets } = defineProps<{
  result: UploadResult;
  sheets: string[];
}>();

const updatedDataItems = computed(() => {
  const items = [];
  for (const sheet of sheets) {
    const updatedRows = result?.validation?.[sheet]?.updated;
    if (updatedRows && updatedRows.length > 0) {
      items.push({
        label: sheet,
        count: updatedRows.length,
        rows: updatedRows,
      });
    }
  }
  return items;
});

const totalUpdatedCount = computed(() =>
  updatedDataItems.value.reduce((sum, item) => sum + item.count, 0),
);
</script>

<template>
  <div>
    <div
      v-if="updatedDataItems.length > 0"
      class="gap-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 mb-6"
    >
      <div
        v-for="item in updatedDataItems"
        :key="item.label"
        class="group relative flex flex-col gap-3 bg-elevated/30 hover:bg-blue-500/5 px-4 py-3 border border-default hover:border-blue-500/40 rounded-xl transition-all duration-200"
      >
        <div class="flex items-center gap-2.5 min-w-0">
          <UIcon
            name="i-lucide-refresh-cw"
            class="size-5 text-blue-500 shrink-0"
          />

          <span class="font-medium text-highlighted text-sm truncate">{{ item.label }}</span>
        </div>

        <div class="flex justify-between items-end gap-2">
          <div>
            <p class="font-bold tabular-nums text-highlighted text-2xl leading-none">
              {{ item.count }}
            </p>

            <p class="mt-1 text-muted text-xs">
              updated rows
            </p>
          </div>
        </div>

        <div class="right-4 bottom-0 left-4 absolute bg-blue-500/20 group-hover:bg-blue-500/40 rounded-full h-px transition-colors duration-200" />
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
        No rows updated
      </p>

      <p class="text-muted text-sm">
        All valid rows will be imported.
      </p>
    </div>

    <div
      v-if="updatedDataItems.length > 0"
      class="flex sm:flex-row flex-col sm:justify-between items-start sm:items-center gap-4 bg-elevated/30 px-5 py-4 border border-default rounded-xl"
    >
      <div>
        <p class="font-medium text-highlighted text-sm">
          Updated Data
        </p>

        <p class="mt-0.5 text-muted text-xs">
          {{ totalUpdatedCount }} row{{ totalUpdatedCount !== 1 ? "s" : "" }} across
          {{ updatedDataItems.length }} sheet{{ updatedDataItems.length !== 1 ? "s" : "" }}
          already exist in the database and have been updated to reflect the new changes.
        </p>
      </div>
    </div>
  </div>
</template>
