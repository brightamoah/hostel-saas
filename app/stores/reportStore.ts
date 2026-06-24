import { parseDate } from "@internationalized/date";
import { defineStore } from "pinia";

export const useReportStore = defineStore("ReportStore", () => {
  const { $apiFetch } = useNuxtApp();
  const toast = useToast();
  const { tenantContext } = useTenantContext();

  const state = ref<ReportState>({
    type: "prebuilt",
    selectedTemplate: null,
    module: "billing",
    fields: [],
    statusFilter: [],
    dateRange: { start: null, end: null },
    filters: {},
    sortBy: "",
    sortOrder: "desc",
  });

  const previewData = ref<Record<string, unknown>[]>([]);
  const isLoading = ref(false);
  const isExporting = ref(false);
  const hasPreview = computed(() => previewData.value.length > 0);

  const availableFields = computed<FieldDescriptor[]>(() => MODULE_FIELDS[state.value.module] ?? []);

  const availableStatuses = computed<string[]>(() => MODULE_STATUSES[state.value.module] ?? []);

  const hasStatusFilter = computed(() => availableStatuses.value.length > 0);

  const sortableFields = computed<FieldDescriptor[]>(() => availableFields.value.filter(field => field.sortable));

  const reportConfig = computed<ReportConfigSchema>(() => ({
    type: state.value.type,
    module: state.value.module,
    fields: state.value.fields.length > 0 ? state.value.fields : availableFields.value.map(field => field.key),
    statusFilter: state.value.statusFilter.length ? state.value.statusFilter : undefined,
    filters: buildActiveFilters(),
    dateRange: (state.value.dateRange.start || state.value.dateRange.end)
      ? { start: state.value.dateRange.start?.toString() || undefined, end: state.value.dateRange.end?.toString() || undefined }
      : undefined,
    sortBy: state.value.sortBy || undefined,
    sortDir: state.value.sortOrder,
  }));

  function buildActiveFilters() {
    const active = Object.fromEntries(
      Object.entries(state.value.filters).filter(([, v]) => v !== null && v !== ""),
    );
    return Object.keys(active).length ? active : undefined;
  }

  function loadTemplate(template: PrebuiltTemplate | SavedReportTemplate | null) {
    state.value.selectedTemplate = template;

    if (!template) {
      state.value.fields = [];
      state.value.statusFilter = [];
      state.value.filters = {};
      state.value.dateRange = { start: null, end: null };
      state.value.sortBy = "";
      state.value.sortOrder = "desc";
      previewData.value = [];
      return;
    }

    if ("config" in template) {
      const config = template.config;
      state.value.type = config.type;
      state.value.module = config.module;
      state.value.fields = [...config.fields];
      state.value.statusFilter = config.statusFilter ? [...config.statusFilter] : [];
      state.value.filters = config.filters ? { ...config.filters } as Record<string, string | null> : {};
      state.value.dateRange = {
        start: config.dateRange?.start ? parseDate(config.dateRange.start.split("T")[0]!) : null,
        end: config.dateRange?.end ? parseDate(config.dateRange.end.split("T")[0]!) : null,
      };
      state.value.sortBy = config.sortBy ?? "";
      state.value.sortOrder = config.sortDir ?? "desc";
    }
    else {
      state.value.type = "prebuilt";
      state.value.module = template.module;
      state.value.fields = [...template.defaultFields];
      state.value.statusFilter = template.defaultStatusFilter ? [...template.defaultStatusFilter] : [];
      state.value.filters = { ...(template.defaultFilters ?? {}) };
      state.value.dateRange = { start: null, end: null };
      state.value.sortBy = template.defaultSortBy ?? "";
      state.value.sortOrder = template.defaultSortDir ?? "desc";
    }
    previewData.value = [];
  }

  function setCustomMode(module: ReportModule) {
    state.value.type = "custom";
    state.value.selectedTemplate = null;
    state.value.module = module;
    state.value.fields = MODULE_FIELDS[module].map(field => field.key);
    state.value.statusFilter = [];
    state.value.filters = {};
    state.value.dateRange = { start: null, end: null };
    state.value.sortBy = "";
    state.value.sortOrder = "desc";
    previewData.value = [];
  }

  function toggleField(key: string) {
    const idx = state.value.fields.indexOf(key);
    if (idx === -1) {
      state.value.fields.push(key);
    }
    else if (state.value.fields.length > 1) {
      state.value.fields.splice(idx, 1);
    }
  }

  function moveFieldUp(key: string) {
    const i = state.value.fields.indexOf(key);
    if (i > 0) [state.value.fields[i - 1], state.value.fields[i]] = [state.value.fields[i]!, state.value.fields[i - 1]!];
  }

  function moveFieldDown(key: string) {
    const i = state.value.fields.indexOf(key);
    if (i < state.value.fields.length - 1) [state.value.fields[i], state.value.fields[i + 1]] = [state.value.fields[i + 1]!, state.value.fields[i]!];
  }

  function toggleStatus(status: string) {
    const idx = state.value.statusFilter.indexOf(status);
    idx === -1 ? state.value.statusFilter.push(status) : state.value.statusFilter.splice(idx, 1);
  }

  function clearStatusFilter() {
    state.value.statusFilter = [];
  }

  function setStatusFilter(status: string[]) {
    state.value.statusFilter = status;
  }

  const fetchPreview = async () => {
    if (state.value.fields.length === 0) {
      toast.add({
        title: "No Fields Selected",
        description: "Please select at least one field to preview",
        color: "warning",
      });
      return;
    }
    isLoading.value = true;
    previewData.value = [];

    try {
      const response = await $apiFetch("/api/reports/data", {
        method: "POST",
        body: reportConfig.value,
      });

      previewData.value = response.data;

      if (!response.data.length) {
        toast.add({
          title: "No records found",
          description: "No records found matching your filters, adjust your filters and try again",
          color: "warning",
        });
      }
    }
    catch (error) {
      toast.add({
        title: "Failed to generate report",
        description: (error as Error).message,
        color: "error",
      });
    }
    finally {
      isLoading.value = false;
    }
  };

  const exportPDF = async (
    reportTitle: string,
    hostelName?: string,
    hostelAddress?: string,
  ) => {
    if (!hasPreview.value) {
      toast.add({
        title: "No preview data",
        description: "Generate a preview before exporting",
        color: "warning",
      });
      return;
    }
    isExporting.value = true;

    try {
      const blob = await generateDynamicReportPDF({
        title: reportTitle,
        config: reportConfig.value,
        data: previewData.value,
        hostelName,
        hostelAddress,
        branding: tenantContext.value?.branding as BrandingContext,
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${slugify(reportTitle)}-${dateSlug()}.pdf`;
      link.click();
      URL.revokeObjectURL(url);

      toast.add({
        title: "Report downloaded",
        description: "Your report has been downloaded successfully",
        color: "success",
      });
    }
    catch (error) {
      console.error(error);
      toast.add({
        title: "Failed to download report",
        description: (error as Error).message,
        color: "error",
      });
    }
    finally {
      isExporting.value = false;
    }
  };

  const savedTemplates = ref<SavedReportTemplate[]>([]);

  const fetchTemplates = async () => {
    try {
      const response = await $apiFetch("/api/reports");
      savedTemplates.value = response.data || [];
    }
    catch (error) {
      console.error("Failed to fetch templates:", error);
    }
  };

  const saveTemplate = async (title: string, description?: string) => {
    try {
      const response = await $apiFetch("/api/reports", {
        method: "POST",
        body: {
          title,
          description,
          module: state.value.module,
          config: reportConfig.value,
        },
      });

      toast.add({
        title: "Template saved",
        description: "Your custom report configuration has been saved.",
        color: "success",
      });

      await fetchTemplates();
      return response.data;
    }
    catch (error) {
      toast.add({
        title: "Failed to save template",
        description: (error as Error).message,
        color: "error",
      });
      throw error;
    }
  };

  const deleteTemplate = async (id?: number | string) => {
    if (!id) return;
    try {
      await $apiFetch(`/api/reports/${id}`, { method: "DELETE" });
      toast.add({ title: "Template deleted", color: "success" });
      await fetchTemplates();
    }
    catch (error) {
      toast.add({ title: "Failed to delete template", description: (error as Error).message, color: "error" });
    }
  };

  const templates = computed(() => PREBUILT_TEMPLATES);

  return {
    state,
    previewData,
    isLoading,
    isExporting,
    hasPreview,
    savedTemplates,
    // Derived
    availableFields,
    availableStatuses,
    hasStatusFilter,
    sortableFields,
    reportConfig,
    templates,
    // Actions
    loadTemplate,
    setCustomMode,
    toggleField,
    moveFieldUp,
    moveFieldDown,
    toggleStatus,
    clearStatusFilter,
    setStatusFilter,
    fetchPreview,
    exportPDF,
    fetchTemplates,
    saveTemplate,
    deleteTemplate,
  };
});
