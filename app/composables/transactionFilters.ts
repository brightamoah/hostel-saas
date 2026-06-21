export function useTransactionFilters(
  table: TableType<PaymentTransaction>,
  data: DataType<PaymentTransactions>,
) {
  const statusFilter = ref("");

  const statusFilterOptions = computed(() => {
    const options: FilterOption[] = [{
      label: "All",
      value: "all",
    }];

    paymentStatusSchema.options.forEach((status) => {
      options.push({
        label: capitalizeWords(status),
        value: status,
      });
    });
    return options;
  });

  const {
    studentFilter,
    studentFilterOptions,
    hostelFilter,
    hostelFilterOptions,
    isStudentLoading,
  } = useGetSharedFilterOptions();

  const {
    safeTableApi,
    updatePage,
    selectedItemsLength: selectedTransactionsLength,
    totalItems: totalTransactions,
    currentItemShowing: currentTransactionShowing,
    lastItemShowing: lastTransactionShowing,
    selectedIds: selectedTransactionIds,
    defaultPage,
    itemsToDisplay,
    itemsPerPage,
    tableState,
  } = useTableFilters<PaymentTransaction>(table, data, "transaction");

  watch([
    statusFilter,
    studentFilter,
    hostelFilter,
  ], async ([
    newStatus,
    newStudent,
    newHostel,
  ]) => {
    await nextTick();

    const tableApi = safeTableApi();

    if (!tableApi) return;

    const statusColumn = tableApi.getColumn("status");

    if (!statusColumn) return;

    if (newStatus === "all") statusColumn.setFilterValue(undefined);
    else statusColumn.setFilterValue(newStatus);

    const studentColumn = tableApi.getColumn("student");

    if (!studentColumn) return;

    if (newStudent === "all") studentColumn.setFilterValue(undefined);
    else studentColumn.setFilterValue(newStudent);

    const hostelColumn = tableApi.getColumn?.("hostel");
    if (hostelColumn) {
      if (!newHostel || newHostel === "all") hostelColumn.setFilterValue(undefined);
      else hostelColumn.setFilterValue(newHostel);
    }
  });

  return {
    statusFilterOptions,
    statusFilter,
    studentFilter,
    studentFilterOptions,
    hostelFilter,
    hostelFilterOptions,
    isStudentLoading,
    selectedTransactionIds,
    lastTransactionShowing,
    selectedTransactionsLength,
    currentTransactionShowing,
    totalTransactions,
    defaultPage,
    itemsToDisplay,
    itemsPerPage,
    tableState,
    updatePage,
  };
}
