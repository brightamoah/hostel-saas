<script setup lang="ts">
const { result, sheets } = defineProps<{
  result: UploadResult;
  sheets: string[];
}>();

const emit = defineEmits<{ import: [] }>();

const isImporting = ref(false);

const sheetsWithValid = computed(() =>
  sheets.filter(
    k => (result.validation[k]?.valid?.length ?? 0) > 0,
  ),
);

const totalValid = computed(() =>
  sheetsWithValid.value.reduce(
    (sum, k) => sum + (result.validation[k]?.valid?.length ?? 0),
    0,
  ),
);

async function handleImport() {
  isImporting.value = true;
  try {
    emit("import");
  }
  finally {
    isImporting.value = false;
  }
}
</script>

<template>
  <div>
    <div
      v-if="sheetsWithValid.length > 0"
      class="gap-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 mb-6"
    >
      <div
        v-for="name in sheetsWithValid"
        :key="name"
        class="group relative flex flex-col gap-3 bg-elevated/30 hover:bg-success/5 px-4 py-3 border border-default hover:border-success/40 rounded-xl transition-all duration-200"
      >
        <div class="flex items-center gap-2.5 min-w-0">
          <UIcon
            name="i-lucide-sheet"
            class="size-5 text-success shrink-0"
          />

          <span class="font-medium text-highlighted text-sm truncate">{{ name }}</span>
        </div>

        <div class="flex justify-between items-end gap-2">
          <div>
            <p class="font-bold tabular-nums text-highlighted text-2xl leading-none">
              {{ result.validation[name]?.valid?.length ?? 0 }}
            </p>

            <p class="mt-1 text-muted text-xs">
              valid rows
            </p>
          </div>

          <UBadge
            color="success"
            variant="subtle"
            size="sm"
            class="mb-0.5 shrink-0"
          >
            Ready
          </UBadge>
        </div>

        <div class="right-4 bottom-0 left-4 absolute bg-success/20 group-hover:bg-success/40 rounded-full h-px transition-colors duration-200" />
      </div>
    </div>

    <div
      v-else
      class="flex flex-col justify-center items-center py-16 border border-default border-dashed rounded-xl text-center"
    >
      <UIcon
        name="i-lucide-inbox"
        class="flex justify-center items-center size-10 text-muted text-center"
      />

      <p class="mb-1 font-medium text-highlighted text-base">
        No valid rows found
      </p>

      <p class="text-muted text-sm">
        Fix the errors in your file and re-upload.
      </p>
    </div>

    <div
      v-if="sheetsWithValid.length > 0"
      class="flex sm:flex-row flex-col sm:justify-between items-start sm:items-center gap-4 bg-elevated/30 px-5 py-4 border border-default rounded-xl"
    >
      <div>
        <p class="font-medium text-highlighted text-sm">
          Ready to import
        </p>

        <p class="mt-0.5 text-muted text-xs">
          {{ totalValid }} row{{ totalValid !== 1 ? "s" : "" }} across
          {{ sheetsWithValid.length }} sheet{{ sheetsWithValid.length !== 1 ? "s" : "" }}
          will be added to the system.
        </p>
      </div>

      <UButton
        color="primary"
        size="md"
        :loading="isImporting"
        leading-icon="i-lucide-cloud-upload"
        class="justify-center w-full sm:w-auto cursor-pointer shrink-0"
        label="Import Data"
        @click="handleImport"
      />
    </div>
  </div>
</template>
