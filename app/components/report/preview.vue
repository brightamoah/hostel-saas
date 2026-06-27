<script lang="ts" setup>
import type { TabsItem } from "@nuxt/ui";

const emit = defineEmits<{ close: [boolean] }>();

const reportStore = useReportStore();
const {
  previewData,
  isLoading,
  isExporting,
  hasPreview,
  state,
} = storeToRefs(reportStore);

const {
  exportPDF,
  getPDFBlob,
  saveTemplate,
} = reportStore;

const isMobile = inject(isMobileKey) as ComputedRef<boolean>;

const isSaveModalOpen = ref(false);
const isSaving = ref(false);

const previewTabs = [
  {
    label: "Data Table",
    slot: "table" as const,
    icon: "i-lucide-table",
    value: "table",
  },
  {
    label: "PDF Document",
    slot: "pdf" as const,
    icon: "i-lucide-file-text",
    value: "pdf",
  },
] satisfies TabsItem[];

const currentTab = ref<"table" | "pdf">("table");
const pdfPreviewUrl = ref<string | null>(null);
const isGeneratingPdf = ref(false);

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
  if (pdfPreviewUrl.value) {
    window.open(pdfPreviewUrl.value, "_blank");
    return;
  }

  const blob = await getPDFBlob(exportTitle.value);
  if (blob) {
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  }
}

watch(currentTab, async (tab) => {
  if (tab === "pdf" && !pdfPreviewUrl.value && hasPreview.value) {
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
  currentTab.value = "table";
});

onBeforeUnmount(() => {
  if (pdfPreviewUrl.value) {
    URL.revokeObjectURL(pdfPreviewUrl.value);
  }
});

async function handleSaveTemplate(payload: { title: string; description: string }) {
  isSaving.value = true;
  try {
    await saveTemplate(payload.title, payload.description);
    isSaveModalOpen.value = false;
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
    <ReportPreviewHeader
      :export-title="exportTitle"
      :has-preview="hasPreview"
      :preview-data-length="previewData.length"
      :can-save-template="canSaveTemplate"
      :is-exporting="isExporting"
      @close="emit('close', false)"
      @save="isSaveModalOpen = true"
      @preview="handlePreviewInTab"
      @export="handleExport"
    />

    <div class="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden">
      <ReportLoading v-if="isLoading" />

      <div
        v-else-if="hasPreview"
        class="flex flex-col flex-1 min-w-0 min-h-0"
      >
        <div class="px-2 pt-2 shrink-0">
          <UTabs
            v-model="currentTab"
            :items="previewTabs"
            size="sm"
            class="w-full max-w-xs"
            :ui="{
              trigger: 'cursor-pointer',
            }"
          />
        </div>

        <div class="relative flex-1 bg-muted/10 px-2 min-h-0">
          <ReportPreviewTable
            v-if="currentTab === 'table'"
            :preview-data="previewData"
          />

          <ReportPreviewPdf
            v-else-if="currentTab === 'pdf'"
            :is-generating-pdf="isGeneratingPdf"
            :pdf-preview-url="pdfPreviewUrl"
            :is-mobile="isMobile"
            @preview-in-tab="handlePreviewInTab"
          />
        </div>
      </div>

      <ReportEmpty v-else />
    </div>

    <ReportPreviewSaveModal
      v-model:is-open="isSaveModalOpen"
      :is-saving="isSaving"
      @save="handleSaveTemplate"
    />
  </UDashboardPanel>
</template>
