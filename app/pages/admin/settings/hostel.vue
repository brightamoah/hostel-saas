<script setup lang="ts">
import type { TabsItem } from "@nuxt/ui";

definePageMeta({
  layout: {
    name: "settings",
    props: {
      title: "Hostel Settings",
    },
  },
  middleware: ["requires-auth", "admin"],
});

const {
  hostelId,
  hostelOptions,
  selectedHostelId,
  isPlatformAdminOrOwner,
  isHostelDropdownLoading,
  settings,
  status,
  isFirstSetup,
  activeTab,
  generalState,
  policiesState,
  operationsState,
  amenitiesState,
  isSaving,
  save,
  refresh,
  handleFormError,
} = useHostelSettings();

const paystackScope = computed(() => ({ hostel: hostelId.value }));

const tabs = [
  {
    label: "General",
    value: "general",
    slot: "general" as const,
    icon: "i-lucide-building-2",
  },
  {
    label: "Payments",
    value: "payments",
    slot: "payments" as const,
    icon: "i-lucide-landmark",
  },
  {
    label: "Policies",
    value: "policies",
    slot: "policies" as const,
    icon: "i-lucide-shield-check",
  },
  {
    label: "Amenities",
    value: "amenities",
    slot: "amenities" as const,
    icon: "i-lucide-sparkles",
  },
  {
    label: "Operations",
    value: "operations",
    slot: "operations" as const,
    icon: "i-lucide-settings-2",
  },
] satisfies TabsItem[];
</script>

<template>
  <div class="max-w-screen">
    <div class="flex justify-between gap-3 mb-4">
      <UButton
        label="Back to Profile"
        icon="i-lucide-arrow-left"
        variant="link"
        color="neutral"
        :to="{ name: 'admin-profile' }"
        class="mb-3"
      />

      <div
        v-if="isPlatformAdminOrOwner"
        class="flex flex-nowrap justify-end items-center gap-3 mb-3 w-full max-w-lg overflow-x-hidden"
      >
        <UIcon
          name="i-lucide-building-2"
          class="size-5 text-muted shrink-0"
        />

        <p class="text-muted text-sm whitespace-nowrap shrink-0">
          Viewing settings for:
        </p>

        <USelectMenu
          v-model="selectedHostelId"
          :items="hostelOptions"
          :loading="isHostelDropdownLoading"
          size="lg"
          value-key="value"
          placeholder="Select a hostel…"
          searchable
          class="w-full max-w-3xs cursor-pointer"
        />
      </div>
    </div>

    <div
      v-if="status === 'pending'"
      class="flex flex-col justify-center items-center opacity-50 py-20"
    >
      <UIcon
        name="i-lucide-loader"
        class="mb-4 size-12 text-primary animate-spin"
      />

      <p class="text-muted text-sm">
        Loading hostel configurations...
      </p>
    </div>

    <UTabs
      v-else
      v-model="activeTab"
      :items="tabs"
      variant="link"
      size="lg"
      class="w-full"
      :ui="{
        list: 'sm:justify-center space-x-6 md:gap-15',
        trigger: 'cursor-pointer',
        label: 'hidden sm:block',
        indicator: 'rounded-full h-0.5',
      }"
    >
      <template #general>
        <SettingsTabsHostelGeneral
          :key="`general-${hostelId}`"
          v-model:state="generalState"
          :is-saving
          :handle-form-error
          @save="save('general', generalState)"
        />
      </template>

      <template #payments>
        <SettingsTabsPayments
          :key="`payments-${hostelId}`"
          :settings
          :is-first-setup
          :scope="paystackScope"
          :handle-form-error
          @refresh="refresh()"
        />
      </template>

      <template #policies>
        <SettingsTabsHostelPolicies
          :key="`policies-${hostelId}`"
          v-model:state="policiesState"
          :is-saving
          :handle-form-error
          @save="save('policies', policiesState)"
        />
      </template>

      <template #operations>
        <SettingsTabsHostelOperations
          :key="`operations-${hostelId}`"
          v-model:state="operationsState"
          :is-saving
          :handle-form-error
          @save="save('operations', operationsState)"
        />
      </template>

      <template #amenities>
        <SettingsTabsHostelAmenities
          :key="`amenities-${hostelId}`"
          v-model:state="amenitiesState"
          :is-saving
          :handle-form-error
          @save="save('amenities', amenitiesState)"
        />
      </template>
    </UTabs>
  </div>
</template>

<style scoped>

</style>
