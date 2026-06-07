<script setup lang="ts">
const { result, sheets } = defineProps<{
  result: UploadResult;
  sheets: string[];
}>();

const openSheets = ref<Set<string>>(new Set());

function toggle(name: string) {
  const next = new Set(openSheets.value);
  next.has(name) ? next.delete(name) : next.add(name);
  openSheets.value = next;
}

function isOpen(name: string) {
  return openSheets.value.has(name);
}

function sheetValid(name: string) {
  return result.validation[name]?.valid?.length ?? 0;
}

function sheetInvalid(name: string) {
  return result.validation[name]?.invalid?.length ?? 0;
}

const sheetsWithErrors = computed(() => sheets.filter(sheet => sheetInvalid(sheet) > 0));
</script>

<template>
  <div
    v-if="sheetsWithErrors.length === 0"
    class="flex flex-col justify-center items-center py-16 border border-default border-dashed rounded-xl text-center"
  >
    <UIcon
      name="i-lucide-circle-check-big"
      class="flex justify-center items-center size-10 text-success text-center"
    />

    <p class="mb-1 font-medium text-highlighted text-base">
      No errors found
    </p>

    <p class="text-muted text-sm">
      All rows in your file passed validation.
    </p>
  </div>

  <div
    v-else
    class="space-y-3"
  >
    <div
      v-for="name in sheetsWithErrors"
      :key="name"
      class="border border-default rounded-xl overflow-hidden transition-shadow duration-200"
      :class="isOpen(name) ? 'shadow-sm' : ''"
    >
      <button
        type="button"
        class="flex justify-between items-center gap-4 hover:bg-elevated/60 px-5 py-3.5 w-full text-left transition-colors duration-150 cursor-pointer"
        :aria-expanded="isOpen(name)"
        @click="toggle(name)"
      >
        <div class="flex items-center gap-2.5 min-w-0">
          <UIcon
            name="i-lucide-sheet"
            class="size-5 text-muted shrink-0"
          />

          <span class="font-medium text-highlighted text-sm truncate">{{ name }}</span>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <UBadge
            v-if="sheetValid(name) > 0"
            color="success"
            variant="subtle"
            size="sm"
          >
            {{ sheetValid(name) }} valid
          </UBadge>

          <UBadge
            v-if="sheetInvalid(name) > 0"
            color="error"
            variant="subtle"
            size="sm"
          >
            {{ sheetInvalid(name) }} invalid
          </UBadge>

          <UIcon
            name="i-lucide-chevron-down"
            class="size-4 text-muted transition-transform duration-200"
            :class="isOpen(name) ? 'rotate-180' : ''"
          />
        </div>
      </button>

      <div
        class="grid transition-[grid-template-rows] duration-300 ease-in-out"
        :class="isOpen(name) ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'"
      >
        <div class="overflow-hidden">
          <div class="border-default border-t">
            <OnboardingSheetPanel :data="result.validation[name]!" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
