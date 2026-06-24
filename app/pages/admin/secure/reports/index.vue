<script lang="ts" setup>
definePageMeta({
  layout: "admin-dashboard",
  middleware: ["requires-auth", "admin"],
});

const title = "Reports";

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

const { exportPDF, saveTemplate, fetchTemplates } = reportStore;

const UButton = resolveComponent("UButton");

const isSaveModalOpen = ref(false);
const isSaving = ref(false);
const saveForm = ref({ title: "", description: "" });

onMounted(async () => {
  await fetchTemplates();
});

/** Fields whose values can be long free-text — truncate in cell, show full on hover */
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

/** Derive the best title for the export from the selected template or a per-module fallback */
const exportTitle = computed(() => {
  const template = state.value.selectedTemplate;
  if (template && "title" in template) return template.title;
  const moduleLabel: Record<string, string> = {
    billing: "Billing Report",
    rooms: "Rooms Report",
    student: "Student Report",
    visitor: "Visitor Log",
    maintenanceRequest: "Maintenance Report",
    complaint: "Complaints Report",
    user: "User Report",
  };
  return moduleLabel[state.value.module] ?? "Custom Report";
});

/** Show Save button for custom reports or for loaded saved templates */
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
  <div class="flex flex-col flex-1 h-full min-h-0">
    <UDashboardPanel
      id="reports"
      class="flex flex-col flex-1 h-full min-h-0 overflow-hidden"
    >
      <template #header>
        <DashboardNav :title="title" />
      </template>

      <template #body>
        <div class="flex flex-row gap-0 h-full min-h-0 overflow-hidden">
          <div class="flex flex-col border-default border-r w-72 h-full overflow-hidden shrink-0">
            <div class="flex flex-col flex-1 gap-0 pr-3 overflow-y-auto">
              <ReportConfigPanel />
            </div>
          </div>

          <div class="flex flex-col flex-1 w-0 h-full min-h-0 overflow-hidden">
            <div class="flex justify-between items-center bg-default/50 backdrop-blur-sm px-6 py-4 border-default border-b shrink-0">
              <div class="flex items-center gap-3 min-w-0">
                <UIcon
                  name="i-lucide-table-2"
                  class="size-7 text-primary"
                />

                <div class="min-w-0">
                  <div class="flex items-center gap-2">
                    <h2 class="font-semibold text-highlighted text-base truncate">
                      {{ exportTitle }}
                    </h2>

                    <UBadge
                      v-if="hasPreview"
                      color="primary"
                      variant="subtle"
                      size="sm"
                    >
                      {{ previewData.length.toLocaleString() }} rows
                    </UBadge>
                  </div>

                  <p class="mt-0.5 text-muted text-xs truncate">
                    <template v-if="hasPreview">
                      {{ reportConfig.fields.length }} column{{ reportConfig.fields.length !== 1 ? 's' : '' }} selected
                    </template>

                    <template v-else>
                      Configure your report and click Generate Preview
                    </template>
                  </p>
                </div>
              </div>

              <div class="flex items-center gap-2 ml-4 shrink-0">
                <UButton
                  v-if="canSaveTemplate"
                  icon="i-lucide-bookmark"
                  color="neutral"
                  variant="subtle"
                  size="sm"
                  class="cursor-pointer"
                  @click="isSaveModalOpen = true"
                >
                  Save Template
                </UButton>

                <UButton
                  v-if="hasPreview"
                  icon="i-lucide-download"
                  color="primary"
                  variant="solid"
                  size="sm"
                  :loading="isExporting"
                  class="cursor-pointer"
                  @click="handleExport"
                >
                  Export PDF
                </UButton>
              </div>
            </div>

            <div class="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div
                v-if="isLoading"
                class="flex flex-col flex-1 justify-center items-center gap-4 text-muted"
              >
                <div class="relative">
                  <div class="border-2 border-default rounded-full w-12 h-12" />

                  <UIcon
                    name="i-lucide-loader-2"
                    class="absolute inset-0 m-auto w-6 h-6 text-primary animate-spin"
                  />
                </div>

                <div class="text-center">
                  <p class="font-medium text-toned text-sm">
                    Generating preview…
                  </p>

                  <p class="mt-0.5 text-muted text-xs">
                    Fetching and processing report data
                  </p>
                </div>
              </div>

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

              <div
                v-else
                class="flex flex-col flex-1 justify-center items-center p-12 text-center select-none"
              >
                <UIcon
                  name="i-lucide-table-2"
                  class="mb-2 size-12 text-dimmed"
                />

                <h3 class="mb-1 font-semibold text-highlighted text-base">
                  No preview data yet
                </h3>

                <p class="max-w-75 text-muted text-sm">
                  Choose a template or configure a custom report on the left,
                  then click <span class="font-medium text-toned">Generate Preview</span>.
                </p>

                <!-- Mini hint steps -->
                <div class="flex flex-col gap-2 mt-3 max-w-55 text-left">
                  <div
                    v-for="(step, i) in [
                      'Select a template or module',
                      'Choose columns & filters',
                      'Click Generate Preview',
                    ]"
                    :key="i"
                    class="flex items-center gap-2.5"
                  >
                    <span class="flex justify-center items-center bg-primary/10 rounded-full size-6 font-bold text-primary text-sm shrink-0">
                      {{ i + 1 }}
                    </span>

                    <span class="text-muted text-sm">{{ step }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </UDashboardPanel>

    <!-- ── Save Template Modal ── -->
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
  </div>
</template>
