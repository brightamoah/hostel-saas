<script lang="ts" setup>
const emit = defineEmits<{ close: [boolean] }>();

const reportStore = useReportStore();
const {
  previewData,
  availableFields,
  isLoading,
  isExporting,
  hasPreview,
  reportConfig,
  state,
} = storeToRefs(reportStore);

const {
  exportPDF,
  saveTemplate,
} = reportStore;

const UButton = resolveComponent("UButton");

const isSaveModalOpen = ref(false);
const isSaving = ref(false);
const saveForm = ref({ title: "", description: "" });

const LONG_TEXT_FIELDS = new Set(["description", "purpose", "notes", "features"]);

const tableColumns = computed(() => {
  return reportConfig.value.fields.map((fieldKey) => {
    const fieldDef = availableFields.value.find(f => f.key === fieldKey);
    const isLongText = LONG_TEXT_FIELDS.has(fieldKey);

    return {
      accessorKey: fieldKey,
      header: createSortableHeader<Record<string, unknown>>(fieldDef?.label ?? fieldKey, UButton),
      enableSorting: fieldDef?.sortable ?? false,
      // Pass metadata through so the cell renderer can use it
      meta: { fieldDef, isLongText } as any,
      cell: ({ row }: { row: any }) => {
        const val = row.getValue(fieldKey);
        if (val === null || val === undefined || val === "") return "-";

        if (fieldDef?.type === "date" || fieldDef?.type === "datetime") {
          return new Date(val as string).toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
            ...(fieldDef.type === "datetime" ? { hour: "2-digit", minute: "2-digit" } : {}),
          });
        }

        if (fieldDef?.type === "currency") {
          return new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(Number(val));
        }

        if (fieldDef?.type === "badge") {
          return capitalizeWords(String(val));
        }

        return String(val);
      },
    };
  });
});

const exportTitle = computed(() => {
  const template = state.value.selectedTemplate;
  if (template && "title" in template) return template.title;
  const moduleLabel: Record<string, string> = {
    billing: "Billing Report",
    rooms: "Rooms Report",
    student: "Student Report",
    visitor: "Visitor Log Report",
    maintenanceRequest: "Maintenance Report",
    complaint: "Complaints Report",
    user: "User Report",
  };
  return moduleLabel[state.value.module] ?? "Custom Report";
});

const canSaveTemplate = computed(() =>
  state.value.type === "custom"
  || (state.value.type === "prebuilt" && !!state.value.selectedTemplate && "config" in state.value.selectedTemplate),
);

async function handleExport() {
  await exportPDF(exportTitle.value);
}

async function handleSaveTemplate() {
  isSaving.value = true;
  try {
    await saveTemplate(saveForm.value.title, saveForm.value.description);
    isSaveModalOpen.value = false;
    saveForm.value = { title: "", description: "" };
  }
  finally {
    isSaving.value = false;
  }
}
</script>

<template>
  <UDashboardPanel
    id="report-preview"
    class="flex flex-col flex-1 min-w-0"
  >
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
          @click="emit('close', false)"
        />

        <UBadge
          v-if="hasPreview"
          color="primary"
          variant="subtle"
          class="hidden sm:flex"
        >
          {{ previewData.length.toLocaleString() }} rows
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
          @click="isSaveModalOpen = true"
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
          @click="handleExport"
        />
      </template>
    </UDashboardNavbar>

    <div class="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden">
      <ReportLoading v-if="isLoading" />

      <div
        v-else-if="hasPreview"
        class="flex-1 min-w-0 min-h-0 overflow-auto"
      >
        <UTable
          :columns="tableColumns"
          :data="previewData"
          :ui="{
            base: 'w-max min-w-full border-separate border-spacing-0 text-sm',
            thead: 'sticky top-0 z-10 [&>tr]:bg-elevated/50 [&>tr]:before:content-none [&>tr]:after:content-none',
            tbody: '[&>tr:last-child>td]:border-b-0 [&>tr]:hover:bg-elevated/40 [&>tr]:transition-colors',
            th: 'py-2.5 px-4 first:pl-6 last:pr-6 border-y border-default first:border-l last:border-r bg-elevated/80 backdrop-blur-sm whitespace-nowrap font-semibold text-xs text-muted uppercase tracking-wide first:rounded-tl-none last:rounded-tr-none first:rounded-l-lg last:rounded-r-lg',
            td: 'py-2.5 px-4 first:pl-6 last:pr-6 border-b border-default align-middle',
          }"
        >
          <template
            v-for="col in tableColumns.filter(c => c.meta?.isLongText)"
            :key="col.accessorKey"
            #[`${col.accessorKey}-cell`]="{ row }"
          >
            <UTooltip
              :text="String(row.getValue(col.accessorKey) ?? '')"
              :delay-duration="300"
            >
              <span class="block max-w-50 text-sm truncate">
                {{ row.getValue(col.accessorKey) ?? '-' }}
              </span>
            </UTooltip>
          </template>
        </UTable>
      </div>

      <ReportEmpty v-else />
    </div>

    <UModal
      v-model:open="isSaveModalOpen"
      title="Save Report Template"
      description="Give your report configuration a name so you can quickly run it again later."
      :ui="{
        footer: 'justify-end',
        content: 'rounded-xl shadow-xl ring ring-default overflow-hidden',
        title: 'font-semibold text-base',
        close: 'cursor-pointer',
        overlay: 'backdrop-blur-sm',
      }"
    >
      <template #body>
        <div class="space-y-4 w-full">
          <UFormField
            label="Title"
            required
            class="w-full"
          >
            <UInput
              v-model="saveForm.title"
              placeholder="e.g. Monthly Overdue Billing"
              autofocus
              class="w-full"
            />
          </UFormField>

          <UFormField
            label="Description"
            class="w-full"
          >
            <UTextarea
              v-model="saveForm.description"
              placeholder="Optional short description for this report"
              :rows="3"
              class="w-full"
            />
          </UFormField>
        </div>
      </template>

      <template #footer="{ close }">
        <div class="flex gap-2">
          <UButton
            label="Cancel"
            color="neutral"
            variant="ghost"
            class="cursor-pointer"
            @click="close"
          />

          <UButton
            :label="isSaving ? 'Saving…' : 'Save Template'"
            color="primary"
            icon="i-lucide-bookmark"
            class="cursor-pointer"
            :loading="isSaving"
            :disabled="!saveForm.title.trim()"
            @click="handleSaveTemplate()"
          />
        </div>
      </template>
    </UModal>
  </UDashboardPanel>
</template>

<style scoped>

</style>
