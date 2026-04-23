<script setup lang="ts">
import { refDebounced } from "@vueuse/core";

definePageMeta({
  middleware: ["requires-auth"],
  layout: "onboard",
});

useSeoMeta({
  title: "Hostels - Find Your Next Stay",
  description: "Discover available hostels. Search by name or use a join code to find your perfect accommodation.",
});

type SortOptions = "price_asc" | "price_desc" | "availability" | "name";

const isMobile = inject(isMobileKey) as ComputedRef<boolean>;

const toast = useToast();
const { $apiFetch } = useNuxtApp();
const route = useRoute();
const router = useRouter();

const searchQuery = ref((route.query.search as string) || "");

const sortBy = ref<SortOptions>(route.query.sort as SortOptions || "availability");

const joinCode = ref("");
const isJoiningByCode = ref(false);
const isSelectingHostel = ref(false);
const selectedHostel = ref<StudentHostel | null>(null);

const currentPage = ref(Number(route.query.page) || 1);
const itemsPerPage = 6;

const debouncedSearch = refDebounced(searchQuery, 400);

const {
  data: allHostels,
  status,
  error,
  refresh,
} = await useFetch("/api/student/hostels", {
  method: "GET",
  key: "studentHostels",
  lazy: true,
  getCachedData: (key, nuxtApp, ctx) => {
    if (ctx.cause === "refresh:manual" || ctx.cause === "refresh:hook") return undefined;
    return nuxtApp.payload.data[key] ?? nuxtApp.static.data[key];
  },
});

const filteredHostels = computed(() => {
  const list = allHostels.value || [];

  if (!debouncedSearch.value.trim()) return list;

  const q = debouncedSearch.value.toLowerCase().trim();
  return list.filter(h =>
    h.name.toLowerCase().includes(q) || h.address.toLowerCase().includes(q),
  );
});

const sortedHostels = computed(() => {
  const listToSort = [...filteredHostels.value];

  switch (sortBy.value) {
    case "price_asc":
      listToSort.sort((a, b) => a.minimumRoomPrice - b.minimumRoomPrice);
      break;
    case "price_desc":
      listToSort.sort((a, b) => b.minimumRoomPrice - a.minimumRoomPrice);
      break;
    case "name":
      listToSort.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "availability":
      listToSort.sort((a, b) => b.availableRooms - a.availableRooms);
      break;
  }

  return listToSort;
});

const totalHostels = computed(() => sortedHostels.value.length);

const paginatedHostels = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  return sortedHostels.value.slice(start, start + itemsPerPage);
});

const currentItemsShowing = computed(() => {
  if (paginatedHostels.value.length === 0) return 0;
  return (currentPage.value - 1) * itemsPerPage + 1;
});

const lastItemShowing = computed(() => {
  return Math.min(currentPage.value * itemsPerPage, totalHostels.value);
});

function updatePage(page: number) {
  currentPage.value = page;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

watch([searchQuery, sortBy, currentPage], async () => {
  await router.replace({
    query: {
      ...route.query,
      search: searchQuery.value || undefined,
      sort: sortBy.value,
      page: currentPage.value > 1 ? currentPage.value : undefined,
    },
  });
});

watch([debouncedSearch, sortBy], () => {
  currentPage.value = 1;
});

const sortOptions = [
  { label: "Most Available", value: "availability" },
  { label: "Price: Low to High", value: "price_asc" },
  { label: "Price: High to Low", value: "price_desc" },
  { label: "Name: A-Z", value: "name" },
];

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
    v-auto-animate="{ duration: 400 }"
    class="py-10"
  >
    <div class="mb-4">
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
          :label="`${totalHostels} hostels`"
        />
      </div>

      <h1 class="font-newsreader font-bold text-highlighted text-4xl tracking-tight">
        Find Your Next Stay
      </h1>

      <p class="-mt-2 max-w-2xl text-muted text-lg">
        Browse available hostels or use a join code from your hostel administrator.
      </p>
    </div>

    <div
      v-if="!selectedHostel"
      v-auto-animate="{ duration: 400 }"
      class="flex sm:flex-row flex-col gap-3 mb-6"
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
      v-else-if="totalHostels === 0 && !selectedHostel"
      :title="searchQuery ? 'No hostels found' : 'No hostels available'"
      :description="searchQuery
        ? `No hostels match '${searchQuery}'`
        : 'Check back later or contact support.'"
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

    <div v-else-if="totalHostels > 0 && !selectedHostel">
      <div
        v-auto-animate="{ duration: 400 }"
        class="gap-3 grid grid-cols-1 sm:grid-cols-2"
      >
        <UCard
          v-for="hostel in paginatedHostels"

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
              v-auto-animate="{ duration: 400 }"
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

      <AppPagination
        items-name="hostels"
        :items="paginatedHostels"
        :total-items="totalHostels"
        :selected-items-length="0"
        :current-items-showing="currentItemsShowing"
        :last-item-showing="lastItemShowing"
        :default-page="currentPage"
        :items-per-page="itemsPerPage"
        :update-page="updatePage"
      />
    </div>
  </UContainer>
</template>
