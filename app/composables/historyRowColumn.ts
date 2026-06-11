import type { TableColumn } from "@nuxt/ui";
import type { Row } from "@tanstack/table-core";

import { useDateFormat } from "@vueuse/core";

export function useHistoryRowColumn(
  UButton: ComponentType,
  UBadge: ComponentType,
  viewDetails: (item: OnboardingHistoryItem) => void,
) {
  const SUMMARY_BADGES = [
    { key: "valid", color: "success", label: "new" },
    { key: "updated", color: "info", label: "updated" },
    { key: "skipped", color: "warning", label: "skipped" },
    { key: "invalid", color: "error", label: "errors" },
  ] as const;

  function summaryTotal(item: OnboardingHistoryItem, key: "valid" | "updated" | "skipped" | "invalid") {
    if (!item.summary) return 0;
    return Object.values(item.summary).reduce((sum, s) => sum + (s[key] || 0), 0);
  }

  function summaryBadges(item: OnboardingHistoryItem) {
    return SUMMARY_BADGES
      .map(badge => ({ ...badge, count: summaryTotal(item, badge.key) }))
      .filter(badge => badge.count > 0);
  }

  function summaryText(item: OnboardingHistoryItem) {
    return summaryBadges(item).map(b => `${b.count} ${b.label}`).join(", ") || "—";
  }

  const columns = computed(() => {
    const cols = [
      {
        id: "fileName",
        accessorKey: "fileName",
        accessorFn: (row: OnboardingHistoryItem) => row.fileName || "Untitled upload",
        header: createSortableHeader("File Name", UButton),
        cell: ({ row }: { row: Row<OnboardingHistoryItem> }) => {
          return h("p", {
            class: "font-medium text-default w-max",
          }, row.original.fileName || "Untitled upload");
        },
      },
      {
        id: "createdAt",
        accessorKey: "createdAt",
        accessorFn: (row: OnboardingHistoryItem) => useDateFormat(row.createdAt, "ddd DD-MM-YYYY HH:mm:ss").value,
        header: createSortableHeader("Date Uploaded", UButton),
        filterFn: (row: Row<OnboardingHistoryItem>, columnId: string, filterValue: string) => {
          return dateFilter<OnboardingHistoryItem>(row, columnId, filterValue, row.original.createdAt);
        },
        cell: ({ row }: { row: Row<OnboardingHistoryItem> }) => {
          return h("p", {
            class: "font-medium text-default",
          }, useDateFormat(row.original.createdAt, "ddd DD-MM-YYYY HH:mm:ss").value);
        },
      },
      {
        id: "status",
        accessorKey: "status",
        accessorFn: (row: OnboardingHistoryItem) => row.status.replace("-", " "),
        header: createSortableHeader("Status", UButton),
        filterFn: (row: Row<OnboardingHistoryItem>, _columnId: string, filterValue: string) => {
          if (!filterValue) return true;
          return row.original.status === filterValue;
        },
        cell: ({ row }: { row: Row<OnboardingHistoryItem> }) => {
          return h(UBadge, {
            label: row.original.status.replace("-", " "),
            color: onboardingImportStatusColorMap[row.original.status],
            variant: "subtle",
            class: "capitalize",
          });
        },
      },
      {
        id: "summary",
        accessorFn: (row: OnboardingHistoryItem) => summaryText(row),
        header: createSortableHeader("Results", UButton),
        cell: ({ row }: { row: Row<OnboardingHistoryItem> }) => {
          const badges = summaryBadges(row.original);

          if (!badges.length) {
            return h("span", { class: "text-xs text-muted" }, "—");
          }

          return h("div", {
            class: "flex items-center gap-2",
          }, [
            ...badges.map(badge => h(UBadge, {
              label: `${badge.count} ${badge.label}`,
              color: badge.color,
              variant: "subtle",
            })),
          ]);
        },
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }: { row: Row<OnboardingHistoryItem> }) =>
          h(UButton, {
            label: "View Details",
            icon: "i-lucide-eye",
            color: "neutral",
            variant: "link",
            class: "cursor-pointer",
            onClick: () => viewDetails(row.original),
          }),
      },
    ] satisfies TableColumn<OnboardingHistoryItem>[];

    return cols;
  });

  return {
    columns,
  };
}
