<script setup lang="ts" generic="T extends object">
const {
  totalItems,
  defaultPage = 1,
  itemsPerPage = 10,
  itemsName = "items",
} = defineProps<{
  items: T[];
  totalItems: number;
  selectedItemsLength: number;
  currentItemsShowing: number;
  lastItemShowing: number;
  defaultPage?: number;
  itemsPerPage?: number;
  itemsName?: string;
  updatePage: (page: number) => void;
}>();

const displayTotal = computed<number>(() => totalItems);

const isMobile = inject(isMobileKey) as ComputedRef<boolean>;
</script>

<template>
  <div class="flex justify-between items-center gap-3 mt-auto pt-4 border-default border-t">
    <div class="text-muted text-sm">
      <template v-if="selectedItemsLength">
        {{ selectedItemsLength }} of
        {{ displayTotal }} {{ itemsName }} selected.
      </template>

      <template v-else-if="items.length > 0">
        Showing
        {{ currentItemsShowing }}
        -
        {{ lastItemShowing }}
        of
        {{ displayTotal }} {{ itemsName }}.
      </template>

      <template v-else>
        No data available.
      </template>
    </div>

    <div class="flex items-center gap-1.5">
      <UPagination
        show-edges
        :sibling-count="1"
        :items-per-page
        :size="isMobile ? 'xs' : 'md'"
        :page="defaultPage"
        :total="displayTotal"
        :ui="{
          item: 'cursor-pointer',
        }"
        @update:page="updatePage"
      />
    </div>
  </div>
</template>

<style scoped>

</style>
