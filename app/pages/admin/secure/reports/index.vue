<script lang="ts" setup>
definePageMeta({
  layout: "admin-dashboard",
  middleware: ["requires-auth", "admin"],
});

const title = "Reports";

const isMobile = inject(isMobileKey) as ComputedRef<boolean>;

const isPreviewPanelOpen = ref(false);

const reportStore = useReportStore();
const {
  previewData,
  isLoading,
  hasPreview,
} = storeToRefs(reportStore);

const {
  fetchTemplates,
} = reportStore;

onMounted(async () => {
  await fetchTemplates();
});

watch([hasPreview, isLoading], ([newHasPreview, newIsLoading]) => {
  if (newHasPreview || newIsLoading) {
    isPreviewPanelOpen.value = true;
  }
});
</script>

<template>
  <div class="flex flex-1 min-w-0 overflow-hidden">
    <UDashboardPanel
      id="reportsPage"
      resizable
      :default-size="23"
      :min-size="23"
      :max-size="23"
      :ui="{
        body: 'p-2 sm:p-0',
      }"
    >
      <template #header>
        <UDashboardNavbar :title>
          <template #leading>
            <UDashboardSidebarCollapse class="cursor-pointer" />
          </template>

          <template #right>
            <UButton
              icon="i-lucide-table-2"
              color="primary"
              variant="subtle"
              size="sm"
              class="lg:hidden cursor-pointer"
              :badge="hasPreview ? String(previewData?.length ?? '') : undefined"
              @click="isPreviewPanelOpen = true"
            >
              Preview
            </UButton>
          </template>
        </UDashboardNavbar>
      </template>

      <template #body>
        <ReportConfigPanel />
      </template>
    </UDashboardPanel>

    <LazyReportPreview class="hidden lg:flex flex-1 min-w-0" />

    <USlideover
      v-if="isMobile"
      v-model:open="isPreviewPanelOpen"
      side="right"
      :ui="{
        content: 'w-full sm:max-w-2xl flex flex-col',
      }"
    >
      <template #content>
        <LazyReportPreview @close="isPreviewPanelOpen = false" />
      </template>
    </USlideover>
  </div>
</template>

<style scoped>

</style>
