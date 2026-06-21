<script lang="ts" setup>
import { getPaginationRowModel } from "@tanstack/table-core";

definePageMeta({
  middleware: ["requires-auth", "platform-or-owner"],
  layout: "admin-dashboard",
});

const title = "Transactions";

const { user } = usePortalUserSession();

const globalFilter = ref("");
const columnVisibility = ref<{ [key: string | number]: boolean }>({ id: false });
const rowSelection = ref({});
const table = useTemplateRef("tableRef");

const UButton = resolveComponent("UButton");
const UAvatar = resolveComponent("UAvatar");
const UBadge = resolveComponent("UBadge");
const UIcon = resolveComponent("UIcon");

const {
  data,
  transactions,
  status,
  canResend,
  coolDownTime,
  isLoading: refreshIsLoading,
  handleRefresh,
} = useFetchTransactionData();

const {
  statusFilter,
  statusFilterOptions,
  studentFilter,
  studentFilterOptions,
  hostelFilter,
  hostelFilterOptions,
  itemsToDisplay,
  totalTransactions,
  lastTransactionShowing,
  selectedTransactionsLength,
  defaultPage,
  currentTransactionShowing,
  itemsPerPage,
  updatePage,
} = useTransactionFilters(table, data);

const { columns } = useTransactionRowColumn(
  UAvatar,
  UButton,
  UBadge,
  UIcon,
);

const { isPlatformAdminOrOwner } = usePortalUserSession();

watch(isPlatformAdminOrOwner, (canSeeHostel) => {
  columnVisibility.value = {
    id: false,
    hostel: !!canSeeHostel,
  };
}, { immediate: true });

const pagination = ref({
  pageIndex: 0,
  pageSize: 7,
});

const hasActiveFilters = computed(() =>
  globalFilter.value
  || statusFilter.value.length > 0
  || studentFilter.value.length > 0
  || hostelFilter.value.length > 0,
);

const description = computed(() => hasActiveFilters.value
  ? "No transactions match your current filters."
  : "There is currently no data to display in this table.",
);

const isMobile = inject(isMobileKey);
</script>

<template>
  <div class="flex flex-1">
    <UDashboardPanel id="transactions-management">
      <template #header>
        <DashboardNav :title>
          <UButton
            v-if="!isMobile"
            label="Back to Billings"
            icon="i-lucide-arrow-left"
            variant="subtle"
            class="cursor-pointer"
            :to="{ name: 'admin-billings' }"
          />
        </DashboardNav>
      </template>

      <template #body>
        <div class="p-2 md:p-4">
          <DashboardCardSkeleton v-if="status === 'pending'" />

          <BillingSearchFilter
            v-else
            v-model="globalFilter"
            v-model:status-filter="statusFilter"
            v-model:student-filter="studentFilter"
            v-model:hostel-filter="hostelFilter"
            :user="user"
            :status-filter-options="statusFilterOptions"
            :student-filter-options="studentFilterOptions"
            :hostel-filter-options="hostelFilterOptions"
          >
            <template #actions>
              <DashboardRefreshButton
                :can-resend
                :cool-down-time
                :refresh-is-loading
                :handle-refresh
              />

              <DashboardItemsToDisplay :items-to-display />
            </template>
          </BillingSearchFilter>
        </div>

        <UTable
          ref="tableRef"
          :key="transactions.length"
          v-model:global-filter="globalFilter"
          v-model:pagination="pagination"
          v-model:row-selection="rowSelection"
          v-model:column-visibility="columnVisibility"
          row-key="id"
          class="mt-6 max-w-[95dvw] md:max-w-full shrink-0"
          :data="transactions"
          :loading="status === 'pending'"
          :columns
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
              icon="i-lucide-receipt"
              title="No Transactions Available"
              :description
              size="xl"
              class="flex flex-1 justify-center items-center w-full"
            />
          </template>
        </UTable>

        <DashboardPagination
          v-if="table && table?.tableApi"
          :items="transactions"
          :total-items="totalTransactions"
          :selected-items-length="selectedTransactionsLength"
          :current-items-showing="currentTransactionShowing"
          :last-item-showing="lastTransactionShowing"
          :table="table!.tableApi"
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
