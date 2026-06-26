<script lang="ts" setup>
import type { DateValue } from "@internationalized/date";
import type { TabsItem } from "@nuxt/ui";
import { getLocalTimeZone, today } from "@internationalized/date";

const reportStore = useReportStore();

const {
  state: reportState,
  sortableFields,
  hasStatusFilter,
  availableStatuses,
  availableFields,
  isLoading,
  savedTemplates,
  templates,
} = storeToRefs(reportStore);

const {
  setCustomMode,
  toggleStatus,
  clearStatusFilter,
  fetchPreview,
  toggleField,
  moveFieldUp,
  moveFieldDown,
  loadTemplate,
  deleteTemplate,
} = reportStore;

const MODULE_LABELS: Record<ReportModule, string> = {
  billing: "Billing / Invoices",
  rooms: "Rooms",
  student: "Students",
  visitor: "Visitors",
  maintenanceRequest: "Maintenance",
  complaint: "Complaints",
  user: "Users",
};

const moduleOptions = REPORT_MODULES.map(module => ({
  value: module,
  label: capitalizeWords(MODULE_LABELS[module]),
}));

const sortFieldOptions = computed(() => {
  const options: FilterOption[] = [];
  for (const field of sortableFields.value) {
    options.push({ label: capitalizeWords(field.label), value: field.key });
  }
  return options;
});

const tabsItems = [
  { label: "Prebuilt", value: "prebuilt", icon: "i-lucide-package", slot: "prebuilt" as const },
  { label: "Custom", value: "custom", icon: "i-lucide-settings-2", slot: "custom" as const },
] satisfies TabsItem[];

const templateItems = computed(() => {
  const items = [...templates.value, ...savedTemplates.value];
  return items.map(item => ({ label: item.title, value: item }));
});

const openConfirmationModal = ref(false);
const maxDate = today(getLocalTimeZone());

const dateStart = computed<DateValue | null>({
  get: () => {
    const val = reportState.value.dateRange.start;
    return ((val && "start" in val) ? null : val) as DateValue | null;
  },
  set: (val: DateValue | null) => { reportState.value.dateRange.start = val; },
});

const dateEnd = computed<DateValue | null>({
  get: () => {
    const val = reportState.value.dateRange.end;
    return ((val && "start" in val) ? null : val) as DateValue | null;
  },
  set: (val: DateValue | null) => { reportState.value.dateRange.end = val; },
});

const orderedFields = computed(() => {
  const checked = reportState.value.fields
    .map(key => availableFields.value.find(f => f.key === key))
    .filter(Boolean) as FieldDescriptor[];

  const unchecked = availableFields.value.filter(
    f => !reportState.value.fields.includes(f.key),
  );

  return [...checked, ...unchecked];
});

const recentlyMoved = ref<string | null>(null);
let moveTimer: ReturnType<typeof setTimeout> | null = null;

function handleMoveUp(key: string) {
  moveFieldUp(key);
  triggerHighlight(key);
}

function handleMoveDown(key: string) {
  moveFieldDown(key);
  triggerHighlight(key);
}

function triggerHighlight(key: string) {
  recentlyMoved.value = key;
  if (moveTimer) clearTimeout(moveTimer);
  moveTimer = setTimeout(() => {
    recentlyMoved.value = null;
  }, 600);
}

const isAllSelected = computed(() => {
  return reportState.value.fields.length === availableFields.value.length;
});

const isAnimating = ref(false);

async function toggleSelectAll() {
  if (isAnimating.value) return;

  if (isAllSelected.value) {
    isAnimating.value = true;
    const fields = [...reportState.value.fields];
    for (const key of fields) {
      reportState.value.fields = reportState.value.fields.filter(field => field !== key);
      await new Promise(r => setTimeout(r, 40));
    }
    isAnimating.value = false;
  }
  else {
    isAnimating.value = true;
    const allKeys = availableFields.value.map(field => field.key);
    for (const key of allKeys) {
      if (!reportState.value.fields.includes(key)) {
        reportState.value.fields = [...reportState.value.fields, key];
        await new Promise(r => setTimeout(r, 40));
      }
    }
    isAnimating.value = false;
  }
}

onUnmounted(() => {
  if (moveTimer) clearTimeout(moveTimer);
});
</script>

<template>
  <div class="flex flex-col gap-5 p-3">
    <UTabs
      v-model="reportState.type"
      :items="tabsItems"
      :ui="{
        trigger: 'cursor-pointer',
      }"
      :unmount-on-hide="false"
      @update:model-value="(val) => { if (val === 'custom') setCustomMode(reportState.module); }"
    >
      <template #prebuilt>
        <UFormField label="Template">
          <div
            v-auto-animate
            class="flex gap-2 w-full"
          >
            <USelectMenu
              v-model="reportState.selectedTemplate as PrebuiltTemplate"
              class="flex-1 cursor-pointer"
              :items="templateItems"
              value-key="value"
              placeholder="Select a template"
              size="lg"
              clear
              :ui="{ item: 'cursor-pointer' }"
              @update:model-value="loadTemplate"
            />

            <AppConfirmationModal
              v-model:open="openConfirmationModal"
              type="delete"
              title="Delete custom template"
              description="Are you sure you want to delete this template?"
              confirm-label="Delete"
              confirm-color="error"
              confirm-variant="subtle"
              confirm-icon="i-lucide-trash-2"
              @confirm="deleteTemplate(reportState?.selectedTemplate?.id)"
            >
              <UButton
                v-if="reportState.selectedTemplate?.id"
                color="error"
                variant="ghost"
                icon="i-lucide-trash-2"
                title="Delete custom template"
                class="cursor-pointer"
              />
            </AppConfirmationModal>
          </div>
        </UFormField>
      </template>

      <template #custom>
        <UFormField
          label="Module"
          class="w-full"
        >
          <USelectMenu
            :model-value="reportState.module"
            :items="moduleOptions"
            value-key="value"
            placeholder="Select module"
            class="w-full cursor-pointer"
            size="lg"
            :ui="{ item: 'cursor-pointer' }"
            @update:model-value="(v) => v && setCustomMode(v)"
          />
        </UFormField>
      </template>
    </UTabs>

    <div v-if="hasStatusFilter">
      <div
        v-auto-animate
        class="flex justify-between items-center mb-2"
      >
        <p class="font-semibold text-muted text-xs uppercase tracking-wide">
          Status
        </p>

        <UButton
          v-if="reportState.statusFilter.length"
          variant="ghost"
          color="neutral"
          size="xs"
          class="cursor-pointer"
          label="Clear"
          @click="clearStatusFilter()"
        />
      </div>

      <div class="flex flex-wrap gap-1.5">
        <UBadge
          v-for="status in availableStatuses"
          :key="status"
          class="capitalize transition-all cursor-pointer"
          :variant="reportState.statusFilter.includes(status) ? 'solid' : 'subtle'"
          :color="reportState.statusFilter.includes(status) ? 'primary' : 'neutral'"
          @click="toggleStatus(status)"
        >
          {{ status }}
        </UBadge>
      </div>
    </div>

    <div>
      <p class="mb-2 font-semibold text-toned text-xs uppercase tracking-wide">
        Date Range
      </p>

      <div class="gap-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <UFormField label="From">
          <AppDatePicker
            v-model:date="dateStart"
            :max="maxDate"
            size="md"
          />
        </UFormField>

        <UFormField label="To">
          <AppDatePicker
            v-model:date="dateEnd"
            :max="maxDate"
            size="md"
          />
        </UFormField>
      </div>
    </div>

    <div>
      <p class="mb-2 font-semibold text-toned text-xs uppercase tracking-wide">
        Sort
      </p>

      <div class="gap-2 grid grid-cols-5 w-full">
        <USelectMenu
          v-model="reportState.sortBy"
          :items="sortFieldOptions"
          value-key="value"
          size="md"
          class="col-span-3 cursor-pointer"
          placeholder="Select sort column..."
          clear
          :ui="{ item: 'cursor-pointer' }"
        />

        <div class="gap-2 grid grid-cols-2 col-span-2 w-full">
          <UButton
            size="xs"
            :variant="reportState.sortOrder === 'asc' ? 'solid' : 'subtle'"
            icon="i-lucide-arrow-up-narrow-wide"
            label="Asc"
            class="flex justify-center items-center w-full cursor-pointer"
            @click="reportState.sortOrder = 'asc'"
          />

          <UButton
            size="xs"
            :variant="reportState.sortOrder === 'desc' ? 'solid' : 'subtle'"
            icon="i-lucide-arrow-down-wide-narrow"
            label="Desc"
            class="flex justify-center items-center w-full cursor-pointer"
            @click="reportState.sortOrder = 'desc'"
          />
        </div>
      </div>
    </div>

    <div>
      <div class="flex justify-between items-center mb-2">
        <p class="font-semibold text-muted text-xs uppercase tracking-wide">
          Columns
        </p>

        <UButton
          variant="link"
          color="neutral"
          size="sm"
          :padded="false"
          :disabled="isAnimating"
          :label="isAllSelected ? 'Deselect All' : 'Select All'"
          class="cursor-pointer"
          @click="toggleSelectAll"
        />
      </div>

      <div
        v-auto-animate
        class="flex flex-col gap-0.5"
      >
        <div
          v-for="field in orderedFields"
          :key="field.key"
          class="group flex justify-between items-center mb-2 px-2 py-1.5 border rounded-lg transition-all duration-300"
          :class="[
            reportState.fields.includes(field.key)
              ? 'border-primary/20'
              : 'border-transparent hover:bg-elevated',
            recentlyMoved === field.key
              ? 'ring-2 ring-primary-400 bg-primary/10 dark:bg-primary/20'
              : '',
          ]"
        >
          <UCheckbox
            :model-value="reportState.fields.includes(field.key)"
            :label="field.label"
            :disabled="reportState.fields.length === 1 && reportState.fields.includes(field.key)"
            @update:model-value="toggleField(field.key)"
          />

          <Transition name="fade">
            <div
              v-if="reportState.fields.includes(field.key)"
              class="flex gap-0.5"
            >
              <UTooltip text="Move up">
                <UButton
                  :disabled="reportState.fields.indexOf(field.key) === 0"
                  color="neutral"
                  variant="ghost"
                  icon="i-lucide-chevron-up"
                  size="xs"
                  :padded="false"
                  class="disabled:opacity-30 active:scale-75 transition-transform cursor-pointer"
                  @click="handleMoveUp(field.key)"
                />
              </UTooltip>

              <UTooltip text="Move down">
                <UButton
                  :disabled="reportState.fields.indexOf(field.key) === reportState.fields.length - 1"
                  color="neutral"
                  variant="ghost"
                  icon="i-lucide-chevron-down"
                  size="xs"
                  :padded="false"
                  class="disabled:opacity-30 active:scale-75 transition-transform cursor-pointer"
                  @click="handleMoveDown(field.key)"
                />
              </UTooltip>
            </div>
          </Transition>
        </div>
      </div>
    </div>

    <div class="bottom-0 sticky bg-default pt-3 pb-1 border-default border-t-2">
      <UButton
        block
        color="primary"
        icon="i-lucide-play"
        :loading="isLoading"
        class="cursor-pointer"
        label="Generate Preview"
        @click="fetchPreview()"
      />
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
