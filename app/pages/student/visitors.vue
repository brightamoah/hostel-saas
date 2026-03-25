<script setup lang="ts">
import { getPaginationRowModel } from "@tanstack/table-core";

definePageMeta({
  middleware: ["requires-auth"],
  layout: "student-dashboard",
});

const UButton = resolveComponent("UButton");
const UBadge = resolveComponent("UBadge");
const UDropdownMenu = resolveComponent("UDropdownMenu");
const UCheckbox = resolveComponent("UCheckbox");
const UAvatar = resolveComponent("UAvatar");

const title = ref("Student Visitors");
const tableRef = useTemplateRef("tableRef");
const globalFilter = ref("");
const columnVisibility = ref<{ [key: string | number]: boolean }>({ id: false });
const rowSelection = ref({});

const pagination = ref({
  pageIndex: 0,
  pageSize: 10,
});

const {
  data,
  status,
  visitors,
  isLoading: refreshIsLoading,
  canResend,
  coolDownTime,
  handleRefresh,
} = useFetchStudentVisitorData();

const cards = computed<StatsCard[]>(() => [
  {
    id: 1,
    title: "Total Visitors",
    icon: "i-lucide-users",
    color: "primary",
    value: data.value?.stats?.total?.value ?? 0,
    percentage: data.value?.stats?.total?.percentage,
    period: data.value?.stats?.total?.period,
  },
  {
    id: 2,
    title: "Approved Visitors",
    icon: "i-lucide-circle-check-big",
    color: "info",
    value: data.value?.stats.approved.value ?? 0,
    percentage: data.value?.stats?.approved?.percentage,
    period: data.value?.stats?.approved?.period,
  },
  {
    id: 3,
    title: "Checked-in Visitors",
    icon: "i-lucide-log-in",
    color: "success",
    value: data.value?.stats?.checkedIn?.value ?? 0,
    percentage: data.value?.stats?.checkedIn?.percentage,
    period: data.value?.stats?.checkedIn?.period,
  },
  {
    id: 4,
    title: "Pending Visitors",
    icon: "i-lucide-clock",
    color: "warning",
    value: data.value?.stats?.pending?.value ?? 0,
    percentage: data.value?.stats?.pending?.percentage,
    period: data.value?.stats?.pending?.period,
  },
]);

const {
  dateFilter,
  statusFilter,
  statusFilterOptions,
  dateFilterOptions,
  currentVisitorShowing,
  lastVisitorShowing,
  totalVisitors,
  selectedVisitorsLength,
  itemsPerPage,
  defaultPage,
  itemsToDisplay,
  updatePage,
} = useVisitorFilters(tableRef, data);

const { columns, getRowItems } = useVisitorRowColumn(
  UAvatar,
  UButton,
  UBadge,
  UDropdownMenu,
  UCheckbox,
);
</script>

<template>
  <div class="flex flex-1">
    <UDashboardPanel id="visitors">
      <template #header>
        <DashboardNav :title />
      </template>

      <template #body>
        <div class="p-2">
          <DashboardCardSkeleton v-if="status === 'pending'" />

          <DashboardStatsCard
            v-else
            :pretty="false"
            :cards
          />

          <VisitorSearchFilter
            v-model="globalFilter"
            v-model:status-filter="statusFilter"
            v-model:date-filter="dateFilter"
            :status-filter-options
            :date-filter-options
          >
            <template #actions>
              <VisitorNew />

              <DashboardRefreshButton
                :can-resend
                :cool-down-time
                :refresh-is-loading
                :handle-refresh
              />

              <DashboardItemsToDisplay :items-to-display />
            </template>
          </VisitorSearchFilter>
        </div>

        <UTable
          ref="tableRef"
          v-model:global-filter="globalFilter"
          v-model:pagination="pagination"
          v-model:column-visibility="columnVisibility"
          v-model:row-selection="rowSelection"
          class="mt-6 max-w-[95dvw] md:max-w-full shrink-0"
          :columns
          :get-row-items
          :data="visitors"
          :loading="status === 'pending'"
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
              icon="i-lucide-users"
              title="No Visitors Available"
              description="There are currently no visitors to display in this table."
              size="xl"
              class="flex flex-1 justify-center items-center w-full"
            />
          </template>
        </UTable>

        <DashboardPagination
          v-if="tableRef && tableRef?.tableApi"
          :items="visitors"
          :total-items="totalVisitors"
          :selected-items-length="selectedVisitorsLength"
          :current-items-showing="currentVisitorShowing"
          :last-item-showing="lastVisitorShowing"
          :table="tableRef?.tableApi"
          :default-page
          :items-per-page
          :update-page
        />
      </template>
    </UDashboardPanel>
  </div>
</template>

<style scoped>

</style>
