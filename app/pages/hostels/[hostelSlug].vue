<script setup lang="ts">
import type { HostelDetailsResponse } from "~~/shared/types";

definePageMeta({
  middleware: ["requires-auth"],
  layout: "onboard",
});

const route = useRoute("hostels-hostelSlug");
const router = useRouter();
const toast = useToast();
const { $apiFetch } = useNuxtApp();
const { fetch: refreshSession } = useUserSession();

const hostelSlug = computed(() => route.params.hostelSlug as string);

// Fetch hostel details with rooms
const {
  data,
  status,
  error,
  refresh,
} = await useFetch<HostelDetailsResponse>(`/api/student/hostels/${hostelSlug.value}`, {
  key: `hostel-${hostelSlug.value}`,
  lazy: true,
});

// Filters
const selectedRoomType = ref<string | null>(null);
const priceRange = ref<[number, number] | null>(null);
const sortBy = ref<"price_asc" | "price_desc" | "capacity" | "floor">("price_asc");

const sortOptions = [
  { label: "Price: Low to High", value: "price_asc" },
  { label: "Price: High to Low", value: "price_desc" },
  { label: "Capacity", value: "capacity" },
  { label: "Floor", value: "floor" },
];

// Filtered rooms
const filteredRooms = computed(() => {
  if (!data.value?.rooms) return [];

  let rooms = [...data.value.rooms];

  // Filter by room type
  if (selectedRoomType.value) {
    rooms = rooms.filter(r => r.roomType === selectedRoomType.value);
  }

  // Filter by price range
  if (priceRange.value) {
    const [min, max] = priceRange.value;
    rooms = rooms.filter(r => r.amountPerYear >= min && r.amountPerYear <= max);
  }

  // Sort
  switch (sortBy.value) {
    case "price_asc":
      rooms.sort((a, b) => a.amountPerYear - b.amountPerYear);
      break;
    case "price_desc":
      rooms.sort((a, b) => b.amountPerYear - a.amountPerYear);
      break;
    case "capacity":
      rooms.sort((a, b) => b.capacity - a.capacity);
      break;
    case "floor":
      rooms.sort((a, b) => a.floor - b.floor);
      break;
  }

  return rooms;
});

// Booking modal state
const selectedRoom = ref<typeof filteredRooms.value[number] | null>(null);
const isBookingModalOpen = ref(false);
const isBooking = ref(false);
const selectedPeriod = ref("first semester");

const academicPeriods = [
  { label: "First Semester", value: "first semester" },
  { label: "Second Semester", value: "second semester" },
  { label: "Entire Year", value: "entire year" },
  { label: "Vacation Period", value: "vacation period" },
];

function openBookingModal(room: typeof filteredRooms.value[number]) {
  selectedRoom.value = room;
  isBookingModalOpen.value = true;
}

function closeBookingModal() {
  selectedRoom.value = null;
  isBookingModalOpen.value = false;
}

async function confirmBooking() {
  if (!selectedRoom.value) return;

  isBooking.value = true;

  try {
    const response = await $apiFetch("/api/room/student/book", {
      method: "POST",
      body: {
        roomId: selectedRoom.value.id,
        academicPeriod: selectedPeriod.value,
      },
    });

    await refreshSession();

    toast.add({
      title: "Booking Successful!",
      description: response.message,
      color: "success",
      icon: "i-lucide-check-circle",
      duration: 5000,
    });

    closeBookingModal();

    // Redirect to dashboard
    await router.push({ name: "student-dashboard" });
  }
  catch (err: any) {
    toast.add({
      title: "Booking Failed",
      description: err?.data?.message || "Failed to book room. Please try again.",
      color: "error",
      icon: "i-lucide-circle-alert",
      duration: 8000,
    });
  }
  finally {
    isBooking.value = false;
  }
}

function clearFilters() {
  selectedRoomType.value = null;
  priceRange.value = null;
  sortBy.value = "price_asc";
}

useSeoMeta({
  title: () => data.value?.hostel?.name ? `Rooms - ${data.value.hostel.name}` : "Room Catalog",
  description: () => data.value?.hostel?.name
    ? `Browse available rooms at ${data.value.hostel.name}. Find the perfect accommodation for your stay.`
    : "Browse available rooms",
});
</script>

<template>
  <UContainer class="py-8">
    <!-- Back Button -->
    <UButton
      variant="ghost"
      color="neutral"
      icon="i-lucide-arrow-left"
      label="Back to Hostels"
      class="mb-6 cursor-pointer"
      @click="router.push({ name: 'auth-hostelHub' })"
    />

    <!-- Loading State -->
    <div
      v-if="status === 'pending'"
      class="space-y-6"
    >
      <USkeleton class="rounded-xl w-full h-48" />

      <div class="gap-4 grid grid-cols-1 md:grid-cols-3">
        <USkeleton
          v-for="i in 6"
          :key="i"
          class="rounded-xl h-64"
        />
      </div>
    </div>

    <!-- Error State -->
    <UCard
      v-else-if="error"
      class="text-center"
    >
      <div class="py-12">
        <UIcon
          name="i-lucide-alert-circle"
          class="mx-auto mb-4 text-error text-5xl"
        />

        <h3 class="mb-2 font-semibold text-lg">
          Failed to Load Hostel
        </h3>

        <p class="mb-4 text-muted">
          {{ error?.data?.message || 'Something went wrong' }}
        </p>

        <div class="flex justify-center gap-3">
          <UButton
            color="primary"
            label="Try Again"
            icon="i-lucide-refresh-cw"
            @click="refresh()"
          />

          <UButton
            variant="outline"
            label="Back to Hostels"
            @click="router.push({ name: 'auth-hostelHub' })"
          />
        </div>
      </div>
    </UCard>

    <!-- Main Content -->
    <template v-else-if="data">
      <!-- Hostel Header -->
      <UCard class="mb-8">
        <div class="flex md:flex-row flex-col gap-6">
          <!-- Hostel Image -->
          <div class="rounded-xl w-full md:w-48 h-48 overflow-hidden shrink-0">
            <img
              v-if="data.hostel.logoUrl"
              :src="data.hostel.logoUrl"
              :alt="data.hostel.name"
              class="w-full h-full object-cover"
            >

            <div
              v-else
              class="flex justify-center items-center bg-primary/10 w-full h-full"
            >
              <UIcon
                name="i-lucide-building-2"
                class="text-primary/50 text-5xl"
              />
            </div>
          </div>

          <!-- Hostel Info -->
          <div class="flex-1">
            <h1 class="mb-2 font-newsreader font-bold text-3xl">
              {{ data.hostel.name }}
            </h1>

            <p class="flex items-center gap-1 mb-4 text-muted">
              <UIcon
                name="i-lucide-map-pin"
                class="size-4"
              />
              {{ data.hostel.address }}
            </p>

            <div class="flex flex-wrap gap-3 mb-4">
              <UBadge
                color="success"
                variant="subtle"
                size="lg"
              >
                <UIcon
                  name="i-lucide-door-open"
                  class="mr-1 size-4"
                />
                {{ data.stats.availableRooms }} rooms available
              </UBadge>

              <UBadge
                color="info"
                variant="subtle"
                size="lg"
              >
                <UIcon
                  name="i-lucide-banknote"
                  class="mr-1 size-4"
                />
                {{ formatCurrency(data.stats.minimumPrice) }} - {{ formatCurrency(data.stats.maximumPrice) }}
              </UBadge>

              <UBadge
                color="neutral"
                variant="subtle"
                size="lg"
              >
                <UIcon
                  name="i-lucide-user"
                  class="mr-1 size-4"
                />
                {{ data.studentGender }} rooms
              </UBadge>
            </div>

            <!-- <div
              v-if="data.hostel.supportEmail || data.hostel.supportPhone"
              class="flex flex-wrap gap-4 text-muted text-sm"
            >
              <span
                v-if="data.hostel.supportEmail"
                class="flex items-center gap-1"
              >
                <UIcon
                  name="i-lucide-mail"
                  class="size-4"
                />
                {{ data.hostel.supportEmail }}
              </span>

              <span
                v-if="data.hostel.supportPhone"
                class="flex items-center gap-1"
              >
                <UIcon
                  name="i-lucide-phone"
                  class="size-4"
                />
                {{ data.hostel.supportPhone }}
              </span>
            </div> -->
          </div>
        </div>
      </UCard>

      <!-- Filters -->
      <div class="flex flex-wrap gap-3 mb-6">
        <USelect
          v-model="sortBy"
          :items="sortOptions"
          placeholder="Sort by"
          class="w-48"
        />

        <USelect
          v-model="selectedRoomType"
          :items="data.roomTypes.map(t => ({ label: t.charAt(0).toUpperCase() + t.slice(1), value: t }))"
          placeholder="Room Type"
          class="w-40"
        />

        <UButton
          v-if="selectedRoomType || priceRange"
          variant="ghost"
          color="neutral"
          icon="i-lucide-x"
          label="Clear Filters"
          @click="clearFilters"
        />
      </div>

      <!-- No Rooms -->
      <UEmpty
        v-if="filteredRooms.length === 0"
        title="No rooms available"
        description="No rooms match your criteria. Try adjusting your filters."
        icon="i-lucide-bed"
        :actions="[
          { label: 'Clear Filters', onClick: clearFilters, variant: 'soft' },
        ]"
      />

      <!-- Rooms Grid -->
      <div
        v-else
        class="gap-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
      >
        <UCard
          v-for="room in filteredRooms"
          :key="room.id"
          class="hover:shadow-lg hover:border-primary/50 transition-all"
        >
          <div class="space-y-4">
            <!-- Room Header -->
            <div class="flex justify-between items-start">
              <div>
                <h3 class="font-bold text-lg">
                  Room {{ room.roomNumber }}
                </h3>

                <p class="text-muted text-sm">
                  Floor {{ room.floor }}
                </p>
              </div>

              <!-- <UBadge
                :color="room.availableSpaces > 1 ? 'success' : 'warning'"
                variant="subtle"
              >
                {{ room.availableSpaces }} {{ room.availableSpaces === 1 ? 'space' : 'spaces' }} left
              </UBadge> -->
            </div>

            <!-- Room Details -->
            <div class="space-y-2">
              <div class="flex justify-between text-sm">
                <span class="text-muted">Type</span>

                <span class="font-medium capitalize">{{ room.roomType }}</span>
              </div>

              <div class="flex justify-between text-sm">
                <span class="text-muted">Capacity</span>

                <span class="font-medium">{{ room.currentOccupancy }}/{{ room.capacity }}</span>
              </div>

              <div class="flex justify-between text-sm">
                <span class="text-muted">Gender</span>

                <span class="font-medium capitalize">{{ room.allowedGender }}</span>
              </div>
            </div>

            <!-- Features -->
            <div
              v-if="room.features?.length"
              class="flex flex-wrap gap-1"
            >
              <UBadge
                v-for="feature in room.features.slice(0, 3)"
                :key="feature"
                color="neutral"
                variant="subtle"
                size="xs"
              >
                {{ feature }}
              </UBadge>

              <UBadge
                v-if="room.features.length > 3"
                color="neutral"
                variant="subtle"
                size="xs"
              >
                +{{ room.features.length - 3 }} more
              </UBadge>
            </div>

            <USeparator />

            <!-- Price & Action -->
            <div class="flex justify-between items-center">
              <div>
                <span class="font-bold text-primary text-xl">
                  {{ formatCurrency(room.amountPerYear) }}
                </span>

                <span class="text-muted text-sm">/year</span>
              </div>

              <UButton
                color="primary"
                label="Book Now"
                icon="i-lucide-check"
                class="cursor-pointer"
                @click="openBookingModal(room)"
              />
            </div>
          </div>
        </UCard>
      </div>
    </template>

    <!-- Booking Confirmation Modal -->
    <UModal v-model:open="isBookingModalOpen">
      <template #content>
        <UCard v-if="selectedRoom">
          <template #header>
            <div class="flex justify-between items-center">
              <h3 class="font-bold text-xl">
                Confirm Booking
              </h3>

              <UButton
                variant="ghost"
                color="neutral"
                icon="i-lucide-x"
                @click="closeBookingModal"
              />
            </div>
          </template>

          <div class="space-y-6">
            <!-- Room Summary -->
            <div class="bg-muted/50 p-4 rounded-lg">
              <h4 class="mb-2 font-semibold">
                Room {{ selectedRoom.roomNumber }}
              </h4>

              <div class="space-y-1 text-sm">
                <p><span class="text-muted">Type:</span> {{ selectedRoom.roomType }}</p>

                <p><span class="text-muted">Floor:</span> {{ selectedRoom.floor }}</p>

                <p><span class="text-muted">Price:</span> {{ formatCurrency(selectedRoom.amountPerYear) }}/year</p>
              </div>
            </div>

            <!-- Academic Period Selection -->
            <UFormField
              label="Academic Period"
              required
            >
              <USelect
                v-model="selectedPeriod"
                :items="academicPeriods"
                class="w-full"
              />
            </UFormField>

            <!-- Warning -->
            <UAlert
              color="warning"
              icon="i-lucide-alert-triangle"
              title="Important"
              description="Once confirmed, your room allocation will be pending until payment is completed. You can only have one active booking at a time."
            />
          </div>

          <template #footer>
            <div class="flex justify-end gap-3">
              <UButton
                variant="outline"
                color="neutral"
                label="Cancel"
                :disabled="isBooking"
                @click="closeBookingModal"
              />

              <UButton
                color="primary"
                label="Confirm Booking"
                icon="i-lucide-check"
                :loading="isBooking"
                :disabled="isBooking"
                @click="confirmBooking"
              />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </UContainer>
</template>
