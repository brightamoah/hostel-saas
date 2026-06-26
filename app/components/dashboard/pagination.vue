<script setup lang="ts" generic="T extends object">
import type { Table } from "@tanstack/table-core";

const {
  table,
  totalItems,
  defaultPage = 1,
  itemsPerPage = 10,
  updatePage,
} = defineProps<{
  items: T[];
  table?: Table<T>;
  totalItems: number;
  selectedItemsLength: number;
  currentItemsShowing: number;
  lastItemShowing: number;
  defaultPage?: number;
  itemsPerPage?: number;
  updatePage: (page: number) => void;
}>();

const displayTotal = computed<number>(() => totalItems);

const isMobile = inject(isMobileKey) as ComputedRef<boolean>;

const currentPage = ref(defaultPage);

watch(() => defaultPage, (val) => {
  currentPage.value = val;
});

function handlePageUpdate(page: number) {
  currentPage.value = page;
  updatePage(page);
}
</script>

<template>
  <div class="flex justify-between items-center gap-3 mt-auto pt-4 border-default border-t">
    <div class="text-muted text-sm">
      <template v-if="selectedItemsLength">
        {{ selectedItemsLength }} of
        {{ displayTotal }} row(s) selected.
      </template>

      <template v-else-if="items.length > 0 && table">
        Showing
        {{ currentItemsShowing }}
        -
        {{ lastItemShowing }}
        of
        {{ displayTotal }} rows.
      </template>

      <template v-else>
        No data available.
      </template>
    </div>

    <div class="flex items-center gap-1.5">
      <UPagination
        v-model:page="currentPage"
        show-edges
        :sibling-count="1"
        :items-per-page
        :size="isMobile ? 'xs' : 'md'"
        :total="displayTotal"
        :ui="{
          item: 'cursor-pointer',
        }"
        @update:page="handlePageUpdate"
      />
    </div>
  </div>
</template>

<style scoped>

</style>
