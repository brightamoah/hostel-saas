<script lang="ts" setup>
import type { Table } from "@tanstack/table-core";
import { getPaginationRowModel } from "@tanstack/table-core";

const { previewData } = defineProps<{
  previewData: any[];
}>();

const reportStore = useReportStore();
const { availableFields, reportConfig } = storeToRefs(reportStore);

const UButton = resolveComponent("UButton");
const LONG_TEXT_FIELDS = new Set(["description", "purpose", "notes", "features", "transactionReference"]);

const tableRef = useTemplateRef<{
  tableApi: Table<Record<string, unknown>>;
}>("tableRef");

const pagination = ref({ pageIndex: 0, pageSize: 20 });

function updatePage(page: number) {
  if (tableRef.value?.tableApi) {
    tableRef.value.tableApi.setPageIndex(page - 1);
  }
}

const totalItems = computed(() => previewData.length);
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
</script>

<template>
  <div class="absolute inset-4 flex flex-col bg-background shadow-sm border border-default rounded-xl min-h-0 overflow-hidden">
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
</template>
