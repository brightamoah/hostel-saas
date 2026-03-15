import type { SelectMenuItem, TableColumn } from "@nuxt/ui";
import type { Row } from "@tanstack/table-core";

import z from "zod";

const RoomDetailsModal = defineAsyncComponent(() => import("~/components/room/detailsModal.vue"));
const ConfirmationModal = defineAsyncComponent(() => import("~/components/dashboard/confirmationModal.vue"));

export function useStudentRoomRowColumn(
  UButton: ComponentType,
  UBadge: ComponentType,
  UDropdownMenu: ComponentType,
  UTooltip: ComponentType,
) {
  const { user } = usePortalUserSession();

  const { student } = useFetchStudentDashboardData();

  const overlay = useOverlay();
  const toast = useToast();
  const roomStore = useRoomStore();
  const { isLoading } = storeToRefs(roomStore);
  const { bookRoom } = roomStore;

  const selectedAcademicPeriod = ref("");
  let academicYear = "";
  let period: Allocation["academicPeriod"];

  const openDetailsModal = (room: Room) => {
    const modal = overlay.create(RoomDetailsModal);
    void modal.open({
      room,
    });
  };

  watch(selectedAcademicPeriod, (newValue) => {
    if (newValue && typeof newValue === "string" && newValue.includes(" - ")) {
      const parts = newValue.split(" - ");
      academicYear = parts[0] ?? "";
      period = parts[1] as Allocation["academicPeriod"];
    }
  });

  const academicPeriodOptions = computed<SelectMenuItem[]>(() => {
    const academicYears = getAcademicYears(2);
    const periods = [
      "first semester",
      "second semester",
      "entire year",
      "vacation period",
    ];
    const items: SelectMenuItem[] = [];
    academicYears.forEach((year) => {
      periods.forEach((period) => {
        items.push({
          label: `${year} - ${period}`,
          value: `${year} - ${period}`,
        });
      });
    });
    return items;
  });

  const openBookRoomModal = async (room: HostelRoom) => {
    const modal = overlay.create(ConfirmationModal);
    const close = modal.close;

    await modal.open({
      "title": `Book Room ${room.roomNumber} at ${room.hostel.name}`,
      "confirmLabel": "Book Room",
      "description": `This action will reserve room ${room.roomNumber} for you.`,
      "renderTrigger": false,
      "body": `Are you sure you want to proceed with booking room ${room.roomNumber}? \n After booking the room, you have three(3) days to make 60% payment to confirm your allocation.`,
      isLoading,
      "confirmColor": "primary",
      "selectMenuPlaceholder": "Select Academic Period",
      "showSelectMenu": true,
      "selectMenuValidation": z.string().nonempty("Please select an academic period to continue."),
      "selectMenuOptions": academicPeriodOptions.value,
      "onUpdate:selectedValue": (value: unknown) => {
        selectedAcademicPeriod.value = value as string;
      },
      "onConfirm": async (data) => {
        const userId = user.value?.role === "student" ? user.value.id : undefined;
        if (!userId) return;

        const academicPeriod = data?.selectedValue;

        if (!academicPeriod) {
          toast.add({
            title: "Selection Required",
            description: "Please select an academic period to continue.",
            color: "warning",
          });
          return;
        }

        if (student.value?.allocation?.id && ["active", "pending"].includes(student.value.allocation.status)) {
          toast.add({
            title: "Failed to Book Room",
            description: "You already have an active room allocation. Please contact administration for changes.",
            color: "error",
            icon: "i-lucide-circle-alert",
            duration: 8000,
          });
          close();
          return;
        }

        await bookRoom({
          roomId: room.id,
          userId,
          academicPeriod: period,
          academicYear,
        }, room.roomNumber);
        close();
      },
    });
  };

  const getRowItems = (row: Row<HostelRoom>) => {
    const room = row.original;
    return [
      {
        type: "label",
        label: "Actions",
      },
      {
        label: "View Details",
        icon: "i-lucide-eye",
        onSelect: () => openDetailsModal(room),
      },
      {
        label: "Edit Room",
        icon: "i-lucide-notebook-pen",
        onSelect: () => { },
      },
      {
        label: "Delete Room",
        icon: "i-lucide-trash-2",
        color: "error",
        onSelect: () => { },
      },
    ];
  };

  const columns = computed<TableColumn<HostelRoom>[]>(() => [
    {
      accessorKey: "roomNumber",
      header: createSortableHeader("Room #", UButton),
      cell: ({ row }) => {
        return h("p", { class: "font-medium" }, row.original.roomNumber);
      },
    },
    {
      accessorKey: "floor",
      filterFn: "equals",
      header: createSortableHeader("Floor", UButton),
      cell: ({ row }) => {
        return h("p", { class: "font-medium" }, row.original.floor);
      },
    },
    {
      accessorKey: "roomType",
      header: createSortableHeader("Room Type", UButton),
      cell: ({ row }) => {
        return h("p", { class: "font-medium capitalize" }, row.original.roomType);
      },
    },
    {
      accessorKey: "status",
      header: createSortableHeader("Status", UButton),
      cell: ({ row }) => {
        const statusColor = roomStatusColorMap[row.original.status];
        return h(UBadge, {
          class: "capitalize",
          variant: "subtle",
          color: statusColor,
        }, () => row.original.status);
      },
    },
    {
      accessorKey: "capacity",
      header: createSortableHeader("Capacity", UButton),
      cell: ({ row }) => {
        const statusColor = roomStatusColorMap[row.original.status];

        // If the room is under maintenance, do NOT present it as available
        const isMaintenance = row.original.status === "under maintenance";
        if (isMaintenance) {
          const tooltipText = "Room is under maintenance and not available.";
          return h(
            UTooltip,
            { text: tooltipText },
            () =>
              h(
                UBadge,
                {
                  class: "font-medium capitalize",
                  variant: "subtle",
                  color: statusColor,
                },
                () =>
                  "Maintenance",
              ),
          );
        }

        const capacity = Number(row.original.capacity ?? 0);
        const currentOccupancy = Number(row.original.currentOccupancy ?? 0);
        const remaining = Math.max(0, capacity - currentOccupancy);

        // Build vacancy phrase without referencing status
        let vacancyPhrase: string;
        if (capacity === 0) vacancyPhrase = "Capacity not specified.";

        else if (remaining <= 0) vacancyPhrase = "This room is fully occupied.";

        else if (remaining === capacity) vacancyPhrase = "This room is completely vacant";

        else if (remaining === 1) vacancyPhrase = "1 space available.";

        else vacancyPhrase = `${remaining} spaces available.`;

        const tooltipText = `${remaining} spaces available out of ${capacity} total capacity. ${vacancyPhrase}`;

        return h(
          UTooltip,
          {
            text: tooltipText,
          },
          () =>
            h(
              UBadge,
              {
                class: "font-medium",
                variant: "subtle",
                color: statusColor,
              },
              () =>
                `${remaining} / ${capacity}`,
            ),
        );
      },
    },
    {
      accessorKey: "amountPerYear",
      header: createSortableHeader("Amount", UButton),
      cell: ({ row }) => {
        return h("p", { class: "font-medium" }, `${formatCurrency(Number(row.original.amountPerYear))}`);
      },
    },
    {
      id: "actions",
      header: () => h("div", { class: "text-center" }, "Amount"),
      cell: ({ row }) =>
        h(
          "div",
          { class: "flex justify-center items-center gap-2" },
          [
            h(
              UButton,
              {
                variant: "subtle",
                size: "md",
                label: "Book Room",
                icon: "i-lucide-calendar-plus",
                color: "primary",
                class: "cursor-pointer",
                onClick: () => openBookRoomModal(row.original),

              },
            ),
            h(UTooltip, {
              text: "View Room Details",
            }, () =>
              h(UButton, {
                variant: "ghost",
                size: "lg",
                icon: "i-lucide-eye",
                color: "neutral",
                class: "cursor-pointer",
                onClick: () => openDetailsModal(row.original),
              })),
          ],
        ),
    },
  ]);

  return {
    getRowItems,
    columns,
  };
}
