<script setup lang="ts">
import { getPaginationRowModel } from "@tanstack/table-core";

definePageMeta({
  middleware: ["requires-auth"],
  layout: {
    name: "student-dashboard",
    props: {
      sidebar: false,
    },
  },
});

const route = useRoute("hostels-hostelSlug");
const router = useRouter();

const table = useTemplateRef("tableRef");
const globalFilter = ref("");

const columnVisibility = ref<{ [key: string | number]: boolean }>({ id: false });

const hostelSlug = computed(() => route.params.hostelSlug as string);

const UButton = resolveComponent("UButton");
const UBadge = resolveComponent("UBadge");
const UDropdownMenu = resolveComponent("UDropdownMenu");
const UTooltip = resolveComponent("UTooltip");

const {
  columns,
  getRowItems,
} = useStudentRoomRowColumn(
  UButton,
  UBadge,
  UDropdownMenu,
  UTooltip,
);

const {
  data,
  status,
  rooms,
  isLoading: refreshIsLoading,
  canResend,
  coolDownTime,
  handleRefresh,
} = useFetchStudentRoomData(hostelSlug);

const {
  selectedRoomsLength,
  defaultPage,
  itemsPerPage,
  totalRooms,
  statusFilter,
  statusFilterOptions,
  floorFilter,
  floorFilterOptions,
  currentRoomsShowing,
  lastRoomShowing,
  updatePage,
  itemsToDisplay,
} = useStudentRoomFilters(table, data);

// const selectedPeriod = ref("first semester");

// const academicPeriods = [
//   { label: "First Semester", value: "first semester" },
//   { label: "Second Semester", value: "second semester" },
//   { label: "Entire Year", value: "entire year" },
//   { label: "Vacation Period", value: "vacation period" },
// ];

// async function confirmBooking() {
//   if (!selectedRoom.value) return;

//   isBooking.value = true;

//   try {
//     const response = await $apiFetch("/api/room/student/book", {
//       method: "POST",
//       body: {
//         roomId: selectedRoom.value.id,
//         academicPeriod: selectedPeriod.value,
//       },
//     });

//     await refreshSession();

//     toast.add({
//       title: "Booking Successful!",
//       description: response.message,
//       color: "success",
//       icon: "i-lucide-check-circle",
//       duration: 5000,
//     });

//     closeBookingModal();

//     // Redirect to dashboard
//     await router.push({ name: "student-dashboard" });
//   }
//   catch (err: any) {
//     toast.add({
//       title: "Booking Failed",
//       description: err?.data?.message || "Failed to book room. Please try again.",
//       color: "error",
//       icon: "i-lucide-circle-alert",
//       duration: 8000,
//     });
//   }
//   finally {
//     isBooking.value = false;
//   }
// }

useSeoMeta({
  title: () => data.value?.hostel?.name ? `Rooms - ${data.value.hostel.name}` : "Room Catalog",
  description: () => data.value?.hostel?.name
    ? `Browse available rooms at ${data.value.hostel.name}. Find the perfect accommodation for your stay.`
    : "Browse available rooms",
});

const pagination = ref({
  pageIndex: 0,
  pageSize: 10,
});
</script>

<template>
  <UContainer class="sm:px-4 lg:px-4 py-8">
    <!-- Back Button -->
    <UButton
      variant="ghost"
      color="neutral"
      icon="i-lucide-arrow-left"
      label="Back to Hostels"
      class="mb-6 cursor-pointer"
      @click="router.push({ name: 'auth-hostelHub' })"
    />

    <AppThemeToggle class="top-8 right-8 z-10 absolute" />

    <UCard variant="subtle">
      <RoomSearchFilter
        v-model="globalFilter"
        v-model:status-filter="statusFilter"
        v-model:floor-filter="floorFilter"
        class="m-0"
        :status-filter-options
        :floor-filter-options
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
      </RoomSearchFilter>
    </UCard>

    <div class="flex flex-col min-h-150">
      <UTable
        ref="tableRef"
        :key="rooms.length"
        v-model:global-filter="globalFilter"
        v-model:column-visibility="columnVisibility"
        v-model:pagination="pagination"
        row-key="id"
        class="mt-6 max-w-[95dvw] md:max-w-full shrink-0"
        :columns="columns"
        :data="rooms"
        :get-row-items="getRowItems"
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
            icon="i-lucide-door-open"
            title="No Rooms Available"
            description="There are currently no rooms to display in this table."
            size="xl"
            class="flex flex-1 justify-center items-center w-full"
          />
        </template>
      </UTable>

      <DashboardPagination
        v-if="table && table?.tableApi"
        :items="rooms"
        :total-items="totalRooms"
        :selected-items-length="selectedRoomsLength"
        :current-items-showing="currentRoomsShowing"
        :last-item-showing="lastRoomShowing"
        :table="table!.tableApi"
        :default-page
        :items-per-page
        :update-page
      />
    </div>
  </UContainer>
</template>
