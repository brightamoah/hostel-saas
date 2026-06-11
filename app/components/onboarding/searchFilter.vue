<script lang="ts" setup>
const {
  modelValue,
  statusFilter,
  statusFilterOptions,
  dateFilter,
  dateFilterOptions,
} = defineProps<{
  modelValue: string;
  statusFilter: string;
  statusFilterOptions: FilterOption[];
  dateFilter: string;
  dateFilterOptions: FilterOption[];
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
  (e: "update:statusFilter", value: string): void;
  (e: "update:dateFilter", value: string): void;
}>();

const globalFilterModel = computed({
  get: () => modelValue,
  set: (val: string) => emit("update:modelValue", val),
});

const statusFilterModel = computed({
  get: () => statusFilter,
  set: (val: string) => emit("update:statusFilter", val),
});

const dateFilterModel = computed({
  get: () => dateFilter,
  set: (val: string) => emit("update:dateFilter", val),
});
</script>

<template>
  <div class="md:flex md:justify-between md:items-center md:gap-4 space-y-4 md:space-y-0 mt-10">
    <UInput
      v-model="globalFilterModel"
      class="w-full md:max-w-sm"
      icon="i-lucide-search"
      placeholder="Search uploads..."
      size="lg"
      variant="subtle"
    />

    <div class="flex sm:flex-row flex-col gap-3 md:gap-4">
      <USelectMenu
        v-model="statusFilterModel"
        placeholder="Filter by Status"
        class="w-full sm:min-w-40 text-center cursor-pointer"
        size="lg"
        clear
        value-key="value"
        :items="statusFilterOptions"
        :ui="{
          trailingIcon: 'group-data-[state=open]:rotate-180 transition-transform duration-200',
          item: 'cursor-pointer',
        }"
      />

      <USelectMenu
        v-model="dateFilterModel"
        arrow
        placeholder="Filter by Date"
        class="w-full sm:min-w-40 text-center cursor-pointer"
        size="lg"
        value-key="value"
        clear
        :items="dateFilterOptions"
        :ui="{
          trailingIcon: 'group-data-[state=open]:rotate-180 transition-transform duration-200',
          item: 'cursor-pointer',
        }"
      />
    </div>

    <div
      v-auto-animate
      class="flex sm:flex-row flex-col gap-3 md:gap-4"
    >
      <slot name="actions" />
    </div>
  </div>
</template>
