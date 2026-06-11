export function useOnboardingHistoryFilters(
  table: TableType<OnboardingHistoryItem>,
  data: DataType<OnboardingHistoryResponseData>,
) {
  const statusFilter = ref("");

  const dateFilter = ref("");

  const dateFilterOptions = ref<FilterOption[]>([
    {
      label: "All Dates",
      value: "all-dates",
    },
    {
      label: "Today",
      value: "today",
    },
    {
      label: "This week",
      value: "this-week",
    },
    {
      label: "Last week",
      value: "last-week",
    },
    {
      label: "This month",
      value: "this-month",
    },
    {
      label: "Last month",
      value: "last-month",
    },
    {
      label: "Past Imports",
      value: "past-imports",
    },
  ]);

  const {
    safeTableApi,
    updatePage,
    selectedItemsLength: selectedHistoryLength,
    totalItems: totalHistory,
    currentItemShowing: currentHistoryShowing,
    lastItemShowing: lastHistoryShowing,
    selectedIds: selectedHistoryIds,
    defaultPage,
    itemsToDisplay,
    itemsPerPage,
  } = useTableFilters<OnboardingHistoryItem>(table, data, "history");

  watch(() => [statusFilter.value, dateFilter.value], async ([newStatusFilter, newDateFilter]) => {
    await nextTick();
    const tableApi = safeTableApi();
    if (!tableApi) return;

    const statusColumn = tableApi.getColumn?.("status");
    if (statusColumn) {
      if (newStatusFilter === "all" || !newStatusFilter) statusColumn.setFilterValue(undefined);
      else statusColumn.setFilterValue(newStatusFilter);
    }

    const dateColumn = tableApi.getColumn?.("createdAt");
    if (dateColumn) {
      if (newDateFilter === "all-dates" || !newDateFilter) dateColumn.setFilterValue(undefined);
      else dateColumn.setFilterValue(newDateFilter);
    }
  }, { immediate: true });

  return {
    statusFilter,
    dateFilter,
    dateFilterOptions,
    selectedHistoryLength,
    totalHistory,
    currentHistoryShowing,
    lastHistoryShowing,
    selectedHistoryIds,
    defaultPage,
    itemsToDisplay,
    itemsPerPage,
    updatePage,
  };
}
