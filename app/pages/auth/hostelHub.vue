<script setup lang="ts">
definePageMeta({
  middleware: ["requires-auth"],
  layout: "onboard",
});

useSeoMeta({
  title: "Hostels - Find Your Next Stay",
  description: "Discover available hostels. Search by name or use a join code to find your perfect accommodation.",
});

const isMobile = inject(isMobileKey) as ComputedRef<boolean>;

const toast = useToast();
const { $apiFetch } = useNuxtApp();

const {
  data: hostels,
  status,
  error,
  refresh,
} = await useFetch("/api/student/hostels", {
  method: "GET",
  key: "studentHostels",
  lazy: true,
  default: () => [],
  getCachedData: (key, nuxtApp, ctx) => {
    if (ctx.cause === "refresh:manual" || ctx.cause === "refresh:hook") return undefined;
    return nuxtApp.payload.data[key] ?? nuxtApp.static.data[key];
  },
});

const searchQuery = ref("");
const sortBy = ref<"price_asc" | "price_desc" | "availability" | "name">("availability");
const joinCode = ref("");
const isJoiningByCode = ref(false);
const isSelectingHostel = ref(false);
const selectedHostel = ref<StudentHostel | null>(null);

const sortOptions = [
  { label: "Most Available", value: "availability" },
  { label: "Price: Low to High", value: "price_asc" },
  { label: "Price: High to Low", value: "price_desc" },
  { label: "Name: A-Z", value: "name" },
];

const filteredHostels = computed(() => {
  if (!hostels.value) return [];

  let result = [...hostels.value];

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim();
    result = result.filter(h =>
      h.name.toLowerCase().includes(q)
      || h.address.toLowerCase().includes(q),
    );
  }

  switch (sortBy.value) {
    case "price_asc":
      result.sort((a, b) => a.minimumRoomPrice - b.minimumRoomPrice);
      break;
    case "price_desc":
      result.sort((a, b) => b.minimumRoomPrice - a.minimumRoomPrice);
      break;
    case "name":
      result.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "availability":
      result.sort((a, b) => b.availableRooms - a.availableRooms);
      break;
  }

  return result;
});

async function joinByCode() {
  const code = joinCode.value.trim().toUpperCase();

  if (!code || code.length < 4) {
    toast.add({
      title: "Invalid Code",
      description: "Please enter a valid join code (at least 4 characters).",
      color: "warning",
      icon: "i-lucide-triangle-alert",
    });
    return;
  }

  isJoiningByCode.value = true;

  try {
    const response = await $apiFetch("/api/student/hostels/joinByCode", {
      method: "POST",
      body: { code },
    });

    joinCode.value = "";

    toast.add({
      title: "Hostel Found!",
      description: `You can now view rooms at ${response.hostel.name}`,
      color: "success",
      icon: "i-lucide-check-circle",
    });

    await navigateTo({
      name: "hostels-hostelSlug",
      params: { hostelSlug: response.hostel.slug },
    });
  }
  catch (err: any) {
    toast.add({
      title: "Invalid Code",
      description: err?.data?.message || "The join code is invalid or expired.",
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  }
  finally {
    isJoiningByCode.value = false;
  }
}

function selectHostel(hostel: StudentHostel) {
  selectedHostel.value = hostel;
}

// function clearSelection() {
//   selectedHostel.value = null;
// }

async function confirmSelection() {
  if (!selectedHostel.value) return;

  isSelectingHostel.value = true;

  try {
    await navigateTo({
      name: "hostels-hostelSlug",
      params: { hostelSlug: selectedHostel.value.slug },
    });
  }
  catch (err: any) {
    toast.add({
      title: "Navigation Failed",
      description: `Failed to navigate to room catalog.${err}`,
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  }
  finally {
    isSelectingHostel.value = false;
  }
}
</script>

<template>
  <UContainer
    v-auto-animate
    class="py-10"
  >
    <div class="mb-10">
      <div class="flex items-center gap-2 mb-2">
        <UBadge
          color="primary"
          variant="subtle"
          label="Explore"
          size="sm"
        />

        <UBadge
          color="neutral"
          variant="subtle"
          size="sm"
          :label="`${filteredHostels.length} hostels`"
        />
      </div>

      <h1 class="mb-2 font-newsreader font-bold text-highlighted text-4xl tracking-tight">
        Find Your Next Stay
      </h1>

      <p class="max-w-2xl text-muted text-lg">
        Browse available hostels or use a join code from your hostel administrator.
      </p>
    </div>

    <div
      v-if="!selectedHostel"
      v-auto-animate
      class="flex sm:flex-row flex-col gap-3 mb-8"
    >
      <USelect
        v-model="sortBy"
        :items="sortOptions"
        size="lg"
        class="w-full sm:w-48 cursor-pointer"
        :ui="{
          base: 'rounded-xl',
          item: 'cursor-pointer',
        }"
      />

      <UInput
        v-model="searchQuery"
        placeholder="Search by city, country or name..."
        icon="i-lucide-search"
        :size="isMobile ? 'md' : 'xl'"
        class="flex-1"
        :ui="{ base: 'rounded-xl' }"
      />

      <UFieldGroup
        size="lg"
        class="w-100"
      >
        <UInput
          v-model="joinCode"
          placeholder="Enter code (e.g. KINGS-26)"
          :size="isMobile ? 'md' : 'xl'"
          class="flex-1 max-w-sm font-mono uppercase"
          :disabled="isJoiningByCode"
          :ui="{ base: 'rounded-xl' }"
          @keyup.enter="joinByCode"
        />

        <UButton
          color="primary"
          class="rounded-xl cursor-pointer"
          :label="isJoiningByCode ? 'Joining...' : 'Join'"
          icon="i-lucide-arrow-right"
          :loading="isJoiningByCode"
          :disabled="isJoiningByCode || !joinCode.trim()"
          @click="joinByCode"
        />
      </UFieldGroup>
    </div>

    <div
      v-if="status === 'pending'"
      class="gap-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
    >
      <UCard
        v-for="i in 6"
        :key="i"
        class="overflow-hidden"
      >
        <template #header>
          <USkeleton class="w-full h-48" />
        </template>

        <USkeleton class="mb-2 w-3/4 h-6" />

        <USkeleton class="mb-4 w-1/2 h-4" />

        <USkeleton class="w-full h-10" />
      </UCard>
    </div>

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
          Failed to Load Hostels
        </h3>

        <p class="mb-4 text-muted">
          {{ error.message || 'Something went wrong' }}
        </p>

        <UButton
          color="primary"
          label="Try Again"
          icon="i-lucide-refresh-cw"
          class="cursor-pointer"
          @click="() => refresh()"
        />
      </div>
    </UCard>

    <UEmpty
      v-else-if="filteredHostels.length === 0 && !selectedHostel"
      :title="searchQuery ? 'No hostels found' : 'No hostels available'"
      :description="searchQuery ? `No hostels match '${searchQuery}'` : 'Check back later or contact support.'"
      icon="i-lucide-search-x"
      size="xl"
      variant="naked"
      :ui="{
        title: 'text-highlighted font-newsreader font-bold text-2xl',
        description: 'text-muted text-base',
        avatar: 'size-16 text-5xl bg-default',
      }"
      class="flex flex-1 justify-center items-center w-full"
      :actions="[
        {
          label: 'Clear Search',
          icon: 'i-lucide-x',
          variant: 'subtle',
          color: 'neutral',
          size: 'lg',
          class: 'cursor-pointer',
          onClick: () => { searchQuery = ''; },
        },
      ]"
    />

    <div
      v-else-if="filteredHostels.length && !selectedHostel"
      v-auto-animate
      class="gap-3 grid grid-cols-1 sm:grid-cols-2"
    >
      <UCard
        v-for="hostel in filteredHostels"
        :key="hostel.id"
        class="overflow-hidden"
        :ui="{ body: 'p-0 flex items-stretch gap-0' }"
      >
        <img
          v-if="hostel.logoUrl"
          :src="hostel.logoUrl"
          :alt="hostel.name"
          class="w-28 min-w-28 object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        >

        <div
          v-else
          class="flex justify-center items-center bg-muted/10 w-28 min-w-28"
        >
          <UIcon
            name="i-lucide-building-2"
            class="text-muted text-3xl"
          />
        </div>

        <div class="flex flex-col flex-1 gap-1.5 px-3.5 py-3 min-w-0">
          <header class="flex justify-between items-start gap-3">
            <div class="min-w-0">
              <h2 class="font-medium text-highlighted text-sm truncate">
                {{ hostel.name }}
              </h2>

              <UBadge
                v-for="type in hostel.roomTypes.slice(0, 3)"
                :key="type"
                color="neutral"
                variant="subtle"
                size="xs"
              >
                {{ type }}
              </UBadge>
            </div>

            <UBadge
              :color="hostel.availableRooms > 0 ? 'success' : 'error'"
              variant="subtle"
              size="md"
              class="truncate shrink-0"
            >
              <UIcon
                name="i-lucide-door-open"
                class="size-4"
              />
              {{ hostel.availableRooms }} {{ hostel.availableRooms === 1 ? 'room' : 'rooms' }} available
            </UBadge>
          </header>

          <p class="flex items-center gap-1 font-medium text-muted text-xs">
            <UIcon
              name="i-lucide-map-pin"
              class="size-4 shrink-0"
            />
            {{ hostel.address }}
          </p>

          <USeparator class="my-0.5" />

          <div
            v-auto-animate
            class="flex items-center gap-1.5 mt-4"
          >
            <UButton
              color="primary"
              variant="solid"
              size="sm"
              label="View rooms"
              icon="i-lucide-arrow-right"
              class="cursor-pointer"
              @click="selectHostel(hostel); confirmSelection()"
            />

            <UBadge
              color="info"
              variant="subtle"
              size="md"
              class="ml-auto truncate"
            >
              <UIcon
                name="i-lucide-banknote"
                class="size-4"
              />
              From {{ formatCurrency(hostel.minimumRoomPrice) }}/year
            </UBadge>
          </div>
        </div>
      </UCard>
    </div>

    <!-- <UCard
      v-if="selectedHostel"
      class="mb-8 border-2 border-muted"
    >
      <div class="flex md:flex-row flex-col items-center gap-6">
        <div class="group relative mx-auto md:mx-0 rounded-xl max-w-lg h-52 overflow-hidden shrink-0">
          <img
            v-if="selectedHostel.logoUrl"
            :src="selectedHostel.logoUrl"
            :alt="selectedHostel.name"
            class="w-full h-full object-fill group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          >

          <div
            v-else
            class="flex justify-center items-center bg-primary/10 rounded-xl w-full h-full"
          >
            <UIcon
              name="i-lucide-building-2"
              class="text-primary/50 text-6xl"
            />
          </div>
        </div>

        <div class="flex-1 md:text-left text-center">
          <h2 class="mb-2 font-bold text-2xl">
            {{ selectedHostel.name }}
          </h2>

          <p class="flex justify-center md:justify-start items-center gap-1 mb-3 text-muted">
            <UIcon
              name="i-lucide-map-pin"
              class="size-4"
            />
            {{ selectedHostel.address }}
          </p>

          <div class="flex flex-wrap justify-center md:justify-start gap-2 mb-4">
            <UBadge
              color="success"
              variant="subtle"
              size="lg"
            >
              <UIcon
                name="i-lucide-door-open"
                class="mr-0.5 size-4"
              />
              {{ selectedHostel.availableRooms }} {{ selectedHostel.availableRooms > 1 ? 'rooms' : 'room' }} available
            </UBadge>

            <UBadge
              color="info"
              variant="subtle"
              size="lg"
            >
              <UIcon
                name="i-lucide-banknote"
                class="mr-0.5 size-4"
              />
              From {{ formatCurrency(selectedHostel.minimumRoomPrice) }}/year
            </UBadge>

            <UBadge
              v-for="type in selectedHostel.roomTypes.slice(0, 3)"
              :key="type"
              color="neutral"
              variant="subtle"
            >
              {{ type }}
            </UBadge>
          </div>

          <div class="flex md:flex-row flex-col gap-3">
            <UButton
              color="primary"
              size="lg"
              icon="i-lucide-arrow-right"
              label="View Rooms & Book"
              class="flex justify-center items-center cursor-pointer"
              :loading="isSelectingHostel"
              :disabled="isSelectingHostel"
              @click="confirmSelection"
            />

            <UButton
              variant="outline"
              color="neutral"
              size="lg"
              icon="i-lucide-x"
              label="Choose Another"
              class="flex justify-center items-center cursor-pointer"
              :disabled="isSelectingHostel"
              @click="clearSelection"
            />
          </div>
        </div>
      </div>
    </UCard> -->
  </UContainer>
</template>
