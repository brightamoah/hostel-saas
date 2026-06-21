import type { TableColumn } from "@nuxt/ui";
// import type { Row } from "@tanstack/table-core";

import { useDateFormat } from "@vueuse/core";

// import type { RowActionItem } from "~/types/rowAction";

export function useTransactionRowColumn(
  UAvatar: ComponentType,
  UButton: ComponentType,
  UBadge: ComponentType,
  UIcon: ComponentType,
) {
  const columns = computed(() => {
    const cols: TableColumn<PaymentTransaction>[] = [
      {
        id: "student",
        accessorFn: row => `${row.student?.user?.name}`,
        header: createSortableHeader("Student", UButton),
        cell: ({ row }) => {
          const student = row.original.student;
          const user = student?.user;

          return h(
            "div",
            { class: "flex items-center gap-2" },
            [
              h(UAvatar, {
                src: user?.image,
                text: generateInitials(user?.name ?? "User"),
                alt: `${user?.name}`,
                size: "md",
                style: `background-color: ${generateUserColor(user?.id ?? 0)}`,
                ui: { fallback: "text-white" },
              }),
              h("div", { class: "flex flex-col" }, [
                h("span", { class: "font-medium text-sm text-default" }, `${user?.name}`),
                h("span", { class: "text-xs text-muted" }, user?.email),
              ]),
            ],
          );
        },
      },
      {
        id: "hostel",
        accessorFn: row => row.billing?.hostel?.name ?? "",
        header: createSortableHeader("Hostel", UButton),
        cell: ({ row }) => {
          const hostel = row.original.billing?.hostel;
          if (!hostel) return h("p", { class: "text-muted italic" }, "N/A");
          return h(
            "div",
            { class: "flex items-center gap-2" },
            [
              h(UIcon, { name: "i-lucide-building", class: "size-4.5 text-muted shrink-0" }),
              h("span", { class: "font-medium text-sm text-default" }, hostel.name),
            ],
          );
        },
      },
      {
        id: "transactionReference",
        accessorFn: row => `${row.transactionReference} ${row.billing?.invoiceNumber}`,
        header: createSortableHeader("Reference", UButton),
        cell: ({ row }) => h("p", { class: "font-medium text-default max-w-36 truncate" }, row.original.transactionReference),
      },
      {
        id: "amount",
        accessorKey: "amount",
        header: createSortableHeader("Amount", UButton),
        cell: ({ row }) => h("p", { class: "text-default" }, formatCurrency(Number(row.original.amount))),
      },
      {
        id: "paymentMethod",
        accessorKey: "paymentMethod",
        header: createSortableHeader("Method", UButton),
        cell: ({ row }) => {
          const method = row.original.paymentMethod;
          return h("div", { class: "flex items-center gap-3" }, [
            h(UIcon, {
              name: paymentMethodIconMap[method],
              class: "text-primary size-6",
            }),
            h("span", { class: "capitalize font-medium text-highlighted" }, method),
          ]);
        },
      },
      {
        id: "status",
        accessorKey: "status",
        header: createSortableHeader("Status", UButton),
        cell: ({ row }) => {
          const status = row.original.status;
          let color: "success" | "error" | "warning" | "info" = "info";

          if (status === "completed") color = "success";
          else if (status === "failed") color = "error";
          else if (status === "pending") color = "warning";

          return h(UBadge, { color, variant: "subtle", class: "capitalize" }, () => status);
        },
      },
      {
        id: "paymentDate",
        accessorKey: "paymentDate",
        header: createSortableHeader("Date", UButton),
        cell: ({ row }) => {
          const dateStr = useDateFormat(row.original.paymentDate, "ddd DD-MM-YYYY HH:mm").value;
          return h("p", { class: "text-default" }, dateStr);
        },
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          return h(
            "div",
            { class: "flex items-center gap-2" },
            [
              h(UButton, {
                variant: "ghost",
                color: "neutral",
                icon: "i-lucide-eye",
                title: "View Details",
                class: "cursor-pointer",
                onClick: () => {
                  const overlay = useOverlay();
                  const TransactionDetails = defineAsyncComponent(() => import("~/components/transaction/details.vue"));
                  const modal = overlay.create(TransactionDetails);
                  void modal.open({
                    transaction: row.original,
                  });
                },
              }),
            ],
          );
        },
      },
    ];

    return cols;
  });

  return {
    columns,
  };
}
