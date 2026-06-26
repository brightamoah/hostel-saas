<script lang="ts" setup>
import type { TabsItem } from "@nuxt/ui";
import type { Table } from "@tanstack/table-core";
import { getPaginationRowModel } from "@tanstack/table-core";

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
  getPDFBlob,
  saveTemplate,
} = reportStore;

const UButton = resolveComponent("UButton");

const isSaveModalOpen = ref(false);
const isSaving = ref(false);
const saveForm = ref({ title: "", description: "" });

const LONG_TEXT_FIELDS = new Set(["description", "purpose", "notes", "features", "transactionReference"]);

const tableRef = useTemplateRef<{
  tableApi: Table<Record<string, unknown>>;
}>("tableRef");

const pagination = ref({ pageIndex: 0, pageSize: 15 });

function updatePage(page: number) {
  if (tableRef.value?.tableApi) {
    tableRef.value.tableApi.setPageIndex(page - 1);
  }
}

const totalItems = computed(() => previewData.value.length);
const currentItemsShowing = computed(() => {
  const api = tableRef.value?.tableApi;
  if (!api) return 0;
  const { pageIndex, pageSize } = api.getState().pagination;
  return totalItems.value === 0 ? 0 : pageIndex * pageSize + 1;
});

const lastItemShowing = computed(() => {
  const api = tableRef.value?.tableApi;
  if (!api) return 0;
  const { pageIndex, pageSize } = api.getState().pagination;
  return Math.min((pageIndex + 1) * pageSize, totalItems.value);
});

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
  const moduleLabel: Record<ReportModule, string> = {
    billing: "Billing Report",
    rooms: "Rooms Report",
    student: "Student Report",
    visitor: "Visitor Log Report",
    maintenanceRequest: "Maintenance Report",
    complaint: "Complaints Report",
    user: "User Report",
    allocation: "Allocations Report",
    payment: "Payment Transactions Report",
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

async function handlePreviewInTab() {
  const blob = await getPDFBlob(exportTitle.value);
  if (blob) {
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  }
}

const previewTabs = [
  {
    label: "Data Table",
    slot: "table" as const,
    value: "table",
    icon: "i-lucide-table",
  },
  {
    label: "PDF Document",
    slot: "pdf" as const,
    value: "pdf",
    icon: "i-lucide-file-text",
  },
] satisfies TabsItem[];

const currentTabIndex = ref<"table" | "pdf">("table");

const pdfPreviewUrl = ref<string | null>(null);
const isGeneratingPdf = ref(false);

watch(currentTabIndex, async (index) => {
  if (index === "pdf" && !pdfPreviewUrl.value && hasPreview.value) {
    isGeneratingPdf.value = true;
    try {
      const blob = await getPDFBlob(exportTitle.value);
      if (blob) {
        pdfPreviewUrl.value = URL.createObjectURL(blob);
      }
    }
    finally {
      isGeneratingPdf.value = false;
    }
  }
});

watch(previewData, () => {
  if (pdfPreviewUrl.value) {
    URL.revokeObjectURL(pdfPreviewUrl.value);
    pdfPreviewUrl.value = null;
  }
  currentTabIndex.value = "table";
});

onBeforeUnmount(() => {
  if (pdfPreviewUrl.value) {
    URL.revokeObjectURL(pdfPreviewUrl.value);
  }
});

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
          icon="i-lucide-external-link"
          color="neutral"
          variant="subtle"
          size="sm"
          :loading="isExporting"
          class="cursor-pointer"
          label="Preview PDF"
          :ui="{
            label: 'hidden sm:inline-flex',
          }"
          @click="handlePreviewInTab"
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
        class="flex flex-col flex-1 min-w-0 min-h-0"
      >
        <UTabs
          v-model="currentTabIndex"
          :items="previewTabs"
          size="sm"
          class="px-4 w-full max-w-xs"
          :ui="{
            trigger: 'cursor-pointer',
          }"
        />

        <div class="relative flex-1 min-h-0">
          <div
            v-if="currentTabIndex === 'table'"
            class="absolute inset-4 flex flex-col shadow-sm rounded-xl min-h-0 overflow-hidden"
          >
            <div class="flex-1 min-w-0 min-h-0 overflow-auto">
              <UTable
                ref="tableRef"
                v-model:pagination="pagination"
                sticky
                class="flex-1"
                :columns="tableColumns"
                :data="previewData"
                :pagination-options="{
                  getPaginationRowModel: getPaginationRowModel(),
                }"
                :ui="{
                  base: 'w-max min-w-full border-separate border-spacing-0 text-sm',
                  thead: 'sticky top-0 z-10 [&>tr]:bg-elevated/90 backdrop-blur-sm [&>tr]:before:content-none [&>tr]:after:content-none',
                  tbody: '[&>tr:last-child>td]:border-b-0 [&>tr]:hover:bg-elevated/40 [&>tr]:transition-colors',
                  th: 'py-2.5 px-4 first:pl-6 last:pr-6 border-b border-default whitespace-nowrap font-semibold text-xs text-muted uppercase tracking-wide',
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

            <div class="p-4 shrink-0">
              <DashboardPagination
                v-if="tableRef && tableRef?.tableApi"
                :items="previewData"
                :total-items="totalItems"
                :selected-items-length="0"
                :current-items-showing="currentItemsShowing"
                :last-item-showing="lastItemShowing"
                :table="tableRef!.tableApi"
                :default-page="pagination.pageIndex + 1"
                :items-per-page="pagination.pageSize"
                :update-page="updatePage"
              />
            </div>
          </div>

          <div
            v-else-if="currentTabIndex === 'pdf'"
            class="absolute inset-4 flex flex-col shadow-sm rounded-xl min-h-0 overflow-hidden"
          >
            <div
              v-if="isGeneratingPdf"
              class="flex flex-col flex-1 justify-center items-center space-y-4 h-full text-muted"
            >
              <UIcon
                name="i-lucide-loader-2"
                class="text-primary text-4xl animate-spin"
              />

              <p>Generating PDF Document...</p>
            </div>

            <iframe
              v-else-if="pdfPreviewUrl"
              :src="pdfPreviewUrl"
              class="flex-1 bg-white border-0 w-full h-full"
              title="PDF Preview"
            />
          </div>
        </div>
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
