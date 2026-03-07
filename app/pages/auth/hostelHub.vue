<script setup lang="ts">
import { hostels } from "~/data/hostels";

definePageMeta({
  middleware: ["requires-auth"],
  layout: "onboard",
});

useSeoMeta({
  title: "Hostels — Find Your Next Stay",
  description: "Discover handpicked hostels across the globe.",
});

const searchQuery = ref("");
const sortBy = ref("rating");
const activeTagFilter = ref<string | null>(null);

const sortOptions = [
  { label: "Top Rated", value: "rating" },
  { label: "Price: Low to High", value: "price_asc" },
  { label: "Price: High to Low", value: "price_desc" },
  { label: "Most Reviewed", value: "reviews" },
];

const filteredHostels = computed(() => {
  let result = [...hostels];

  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    result = result.filter(h =>
      h.name.toLowerCase().includes(q)
      || h.city.toLowerCase().includes(q)
      || h.country.toLowerCase().includes(q)
      || h.location.toLowerCase().includes(q),
    );
  }

  if (activeTagFilter.value) {
    result = result.filter(h => h.tags.includes(activeTagFilter.value!));
  }

  switch (sortBy.value) {
    case "rating":
      result.sort((a, b) => b.rating - a.rating);
      break;
    case "price_asc":
      result.sort((a, b) => a.price - b.price);
      break;
    case "price_desc":
      result.sort((a, b) => b.price - a.price);
      break;
    case "reviews":
      result.sort((a, b) => b.reviewCount - a.reviewCount);
      break;
  }

  return result;
});
</script>

<template>
  <UContainer class="py-10">
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

      <p class="max-w-xl text-muted text-lg">
        Handpicked hostels across the globe — social, safe, and unforgettable.
      </p>
    </div>

    <div class="flex sm:flex-row flex-col gap-3 mb-8">
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
        size="lg"
        class="flex-1"
        :ui="{ base: 'rounded-xl' }"
      />

      <UFieldGroup size="lg">
        <UInput
          v-model="searchQuery"
          placeholder="Enter hostel code..."
          icon="i-lucide-key"
          size="lg"
          class="flex-1"
          :ui="{ base: 'rounded-xl' }"
        />

        <UButton
          color="primary"
          class="rounded-xl cursor-pointer"
          label="Use Code"
          icon="i-lucide-arrow-right"
        />
      </UFieldGroup>
    </div>

    <div
      v-if="activeTagFilter"
      class="flex items-center gap-2 mb-6"
    >
      <span class="text-muted text-sm">Filtering by:</span>

      <UBadge
        color="primary"
        variant="solid"
        :label="activeTagFilter"
        class="cursor-pointer"
        @click="activeTagFilter = null"
      >
        <template #trailing>
          <UIcon
            name="i-lucide-x"
            class="size-3"
          />
        </template>
      </UBadge>
    </div>

    <div
      v-if="filteredHostels.length"
      v-auto-animate
      class="gap-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
    >
      <UCard
        v-for="hostel in filteredHostels"
        :key="hostel.id"
        class="group hover:shadow-xl border border-default rounded-2xl overflow-hidden transition-all cursor-pointer"
        :ui="{ body: 'p-0' }"
        @click="navigateTo({ name: 'hostels-hostelSlug', params: { hostelSlug: hostel.id } })"
      >
        <div class="relative h-52 overflow-hidden">
          <NuxtImg
            :src="hostel.image"
            :alt="hostel.name"
            class="w-full h-full object-cover"
          />

          <div class="top-3 left-3 absolute">
            <UBadge
              v-if="hostel.badge"
              color="primary"
              variant="solid"
              :label="hostel.badge"
              size="sm"
              class="shadow-md backdrop-blur-sm"
            />
          </div>

          <div class="right-3 bottom-3 absolute">
            <UBadge
              color="neutral"
              variant="solid"
              size="sm"
              class="bg-white/90 shadow backdrop-blur font-semibold text-neutral-900"
            >
              From {{ hostel.currency }} {{ hostel.price }}
              <span class="font-normal text-neutral-700">/semester</span>
            </UBadge>
          </div>
        </div>

        <div class="pt-3">
          <div class="flex justify-center items-center gap-1 mb-1 text-muted text-xs">
            <UIcon
              name="i-lucide-map-pin"
              class="size-3 shrink-0"
            />

            <span>{{ hostel.location }}</span>
          </div>

          <h2 class="mb-3 font-bold text-highlighted group-hover:text-primary text-lg text-center leading-tight transition-colors">
            {{ hostel.name }}
          </h2>

          <div class="flex justify-center items-center">
            <UButton
              color="primary"
              label="View details"
              class="flex justify-center items-center w-[70%] font-medium cursor-pointer"
              trailing-icon="i-lucide-arrow-right"
              :ui="{ base: 'rounded-lg' }"
              @click="navigateTo({ name: 'hostels-hostelSlug', params: { hostelSlug: hostel.id } })"
            />
          </div>
        </div>
      </UCard>
    </div>

    <!-- Empty state -->
    <div
      v-else
      class="py-24 text-center"
    >
      <UIcon
        name="i-lucide-search-x"
        class="mx-auto mb-4 size-12 text-muted"
      />

      <p class="mb-1 font-semibold text-highlighted text-lg">
        No hostels found
      </p>

      <p class="mb-6 text-muted">
        Try adjusting your search or filters.
      </p>

      <UButton
        label="Clear search"
        variant="soft"
        @click="searchQuery = ''; activeTagFilter = null"
      />
    </div>
  </UContainer>
</template>
