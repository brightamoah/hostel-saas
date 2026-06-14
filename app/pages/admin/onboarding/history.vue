<script setup lang="ts">
import { getPaginationRowModel } from "@tanstack/table-core";

definePageMeta({
  middleware: ["requires-auth", "admin"],
  layout: "admin-dashboard",
});

const UButton = resolveComponent("UButton");
const UBadge = resolveComponent("UBadge");

const title = "Upload History";
const tableRef = useTemplateRef("tableRef");
const globalFilter = ref("");
const columnVisibility = ref<{ [key: string | number]: boolean }>({ id: false });

const {
  historyList,
  historyData,
  historyStatus,
  // isFetchingHistory,
  fetchUploadDetails,
  uploadResult,
  importData,
  isImporting,
  errorMessage,
  historyStatusFilterOptions,
  refreshIsLoading,
  canResend,
  coolDownTime,
  handleRefresh,
} = useOnboardingUpload();

const isSlideoverOpen = ref(false);
const selectedId = ref<string | null>(null);

const selectedItem = computed(() =>
  historyList.value.find(h => h.id === selectedId.value),
);

const sheets = computed(() =>
  uploadResult.value ? Object.keys(uploadResult.value.validation) : [],
);

async function viewDetails(item: OnboardingHistoryItem) {
  selectedId.value = item.id;
  uploadResult.value = null;
  isSlideoverOpen.value = true;
  await fetchUploadDetails(item.id);
}

const { columns } = useHistoryRowColumn(
  UButton,
  UBadge,
  viewDetails,
);

const {
  statusFilter,
  dateFilter,
  dateFilterOptions,
  currentHistoryShowing,
  lastHistoryShowing,
  totalHistory,
  itemsPerPage,
  defaultPage,
  itemsToDisplay,
  updatePage,
} = useOnboardingHistoryFilters(tableRef, historyData);

const pagination = ref({
  pageIndex: 0,
  pageSize: 5,
});

const cards = computed<StatsCard[]>(() => [
  {
    id: "total",
    title: "Total Uploads",
    icon: "i-lucide-cloud-upload",
    color: "primary",
    value: historyList.value.length,
  },
  {
    id: "completed",
    title: "Completed",
    icon: "i-lucide-check-circle-2",
    color: "success",
    value: historyList.value.filter(x => x.status === "completed").length,
  },
  {
    id: "pending",
    title: "Pending Import",
    icon: "i-lucide-clock",
    color: "warning",
    value: historyList.value.filter(x => x.status === "pending").length,
  },
  {
    id: "failed",
    title: "Failed",
    icon: "i-lucide-x-circle",
    color: "error",
    value: historyList.value.filter(x => x.status === "failed").length,
  },
]);

function statusMeta(status: OnboardingImportStatus) {
  const map: Record<OnboardingImportStatus, { icon: string; color: "success" | "warning" | "error"; label: string }> = {
    completed: { icon: "i-lucide-check-circle-2", color: "success", label: "Completed" },
    pending: { icon: "i-lucide-clock", color: "warning", label: "Pending" },
    failed: { icon: "i-lucide-x-circle", color: "error", label: "Failed" },
  };
  return map[status] ?? map.failed;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

watch(isImporting, async (newVal, oldVal) => {
  if (!newVal && oldVal && !errorMessage.value) {
    await handleRefresh({ force: true });
  }
});
</script>

<template>
  <div class="flex flex-1">
    <UDashboardPanel id="onboarding-history">
      <template #header>
        <DashboardNav :title />
      </template>

      <template #body>
        <div class="p-2 md:p-4">
          <!-- Error alert -->
          <UAlert
            v-if="errorMessage"
            class="mb-4"
            color="error"
            variant="subtle"
            orientation="horizontal"
            icon="i-lucide-triangle-alert"
            :title="errorMessage"
            :actions="[{
              label: 'Dismiss',
              color: 'error',
              variant: 'subtle',
              icon: 'i-lucide-x',
              onClick: () => { errorMessage = '' },
            }]"
            :ui="{ icon: 'size-6' }"
          />

          <!-- Stats -->
          <DashboardCardSkeleton v-if="historyStatus === 'pending'" />

          <DashboardStatsCard
            v-else
            :cards
          />

          <!-- Search filter bar -->
          <OnboardingSearchFilter
            v-model="globalFilter"
            v-model:status-filter="statusFilter"
            v-model:date-filter="dateFilter"
            :status-filter-options="historyStatusFilterOptions"
            :date-filter-options
          >
            <template #actions>
              <DashboardRefreshButton
                :can-resend
                :cool-down-time
                :refresh-is-loading
                :handle-refresh
              />

              <UButton
                :to="{ name: 'admin-onboarding' }"
                label="Upload New File"
                icon="i-lucide-cloud-upload"
                color="primary"
                size="lg"
                class="justify-center items-center w-full sm:w-auto cursor-pointer"
              />

              <DashboardItemsToDisplay :items-to-display />
            </template>
          </OnboardingSearchFilter>
        </div>

        <!-- Table -->
        <UTable
          ref="tableRef"
          v-model:global-filter="globalFilter"
          v-model:pagination="pagination"
          v-model:column-visibility="columnVisibility"
          class="mt-6 max-w-[95dvw] md:max-w-full shrink-0"
          row-key="id"
          :columns
          :data="historyList"
          :loading="historyStatus === 'pending'"
          :pagination-options="{
            getPaginationRowModel: getPaginationRowModel(),
          }"
          :ui="{
            base: 'table-fixed border-separate border-spacing-0',
            thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
            tbody: '[&>tr]:last:[&>td]:border-b-0',
            th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
            td: 'border-b border-default',
          }"
        >
          <template #empty>
            <UEmpty
              variant="naked"
              icon="i-lucide-file-spreadsheet"
              title="No Uploads Available"
              description="Upload your first onboarding file to get started. Previous uploads will appear here."
              size="xl"
              class="flex flex-1 justify-center items-center w-full"
            />
          </template>
        </UTable>

        <!-- Pagination -->
        <DashboardPagination
          v-if="tableRef && tableRef?.tableApi"
          :items="historyList"
          :total-items="totalHistory"
          :selected-items-length="0"
          :current-items-showing="currentHistoryShowing"
          :last-item-showing="lastHistoryShowing"
          :table="tableRef?.tableApi"
          :default-page
          :items-per-page
          :update-page
        />

        <USlideover
          v-model:open="isSlideoverOpen"
          :title="selectedItem?.fileName || 'Upload Details'"
          :description="selectedItem ? `${formatDate(selectedItem.createdAt)} at ${formatTime(selectedItem.createdAt)}` : ''"
          :ui="{ content: 'max-w-2xl' }"
        >
          <template
            v-if="selectedItem"
            #header="{ close }"
          >
            <div class="flex flex-col gap-3 w-full">
              <div class="flex items-center gap-3">
                <div class="flex justify-center items-center bg-primary/10 rounded-lg size-10 shrink-0">
                  <UIcon
                    name="i-lucide-file-spreadsheet"
                    class="size-5 text-primary"
                  />
                </div>

                <div class="flex-1 min-w-0">
                  <h3 class="font-semibold text-highlighted truncate">
                    {{ selectedItem.fileName }}
                  </h3>

                  <p class="text-muted text-xs">
                    {{ formatDate(selectedItem.createdAt) }} · {{ formatTime(selectedItem.createdAt) }}
                  </p>
                </div>

                <UButton
                  color="neutral"
                  variant="ghost"
                  icon="i-lucide-x"
                  class="cursor-pointer shrink-0"
                  @click="close"
                />
              </div>

              <div class="flex flex-wrap items-center gap-2">
                <UBadge
                  :color="statusMeta(selectedItem.status).color"
                  variant="subtle"
                >
                  <UIcon
                    :name="statusMeta(selectedItem.status).icon"
                    class="mr-1 size-3.5"
                  />
                  {{ statusMeta(selectedItem.status).label }}
                </UBadge>

                <UBadge
                  color="neutral"
                  variant="subtle"
                >
                  {{ sheets.length }} sheet{{ sheets.length !== 1 ? "s" : "" }}
                </UBadge>
              </div>
            </div>
          </template>

          <template #body>
            <!-- Import action -->
            <UButton
              v-if="selectedItem?.status === 'pending' && uploadResult"
              color="primary"
              icon="i-lucide-download"
              block
              size="lg"
              class="mb-4 cursor-pointer"
              :loading="isImporting"
              @click="importData"
            >
              Import Data
            </UButton>

            <!-- Loading -->
            <div
              v-if="!uploadResult"
              class="flex flex-col justify-center items-center py-20"
            >
              <UIcon
                name="i-lucide-loader-2"
                class="mb-3 size-8 text-muted animate-spin"
              />

              <p class="text-muted text-sm">
                Loading details…
              </p>
            </div>

            <!-- Results -->
            <OnboardingResults
              v-else
              :result="uploadResult"
              :sheets
              :is-importing
              :onboarding-status="selectedItem?.status as OnboardingImportStatus"
              @import="importData"
            />
          </template>
        </USlideover>
      </template>
    </UDashboardPanel>
  </div>
</template>
