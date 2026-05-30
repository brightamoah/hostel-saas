<script setup lang="ts">
import type { TabsItem } from "@nuxt/ui";

definePageMeta({
  layout: {
    name: "settings",
    props: {
      title: "Company Settings",
    },
  },
  middleware: ["requires-auth", "admin", "platform-or-owner"],
});

const {
  status,
  settings,
  isFirstSetup,
  activeTab,
  generalState,
  billingState,
  notificationsState,
  portalState,
  academicState,
  isSaving,
  companyOptions,
  selectedCompanyId,
  isCompanyDropdownLoading,
  isPlatformAdmin,
  save,
  handleFormError,
} = useCompanySettings();

const tabs = [

  {
    label: "Payments",
    value: "payments",
    icon: "i-lucide-landmark",
    slot: "payments" as const,
  },
  {
    label: "Billing Rules",
    value: "billing",
    icon: "i-lucide-receipt",
    slot: "billing" as const,
  },
  {
    label: "Notifications",
    value: "notifications",
    icon: "i-lucide-bell",
    slot: "notifications" as const,
  },
  {
    label: "Student Portal",
    value: "portal",
    icon: "i-lucide-user-round",
    slot: "portal" as const,
  },
  {
    label: "Academic",
    value: "academic",
    icon: "i-lucide-graduation-cap",
    slot: "academic" as const,
  },
  {
    label: "General",
    value: "general",
    icon: "i-lucide-settings-2",
    slot: "general" as const,
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
        v-if="isPlatformAdmin"
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
          v-model="selectedCompanyId"
          :items="companyOptions"
          :loading="isCompanyDropdownLoading"
          size="lg"
          value-key="value"
          placeholder="Select a company…"
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
        Loading company configurations...
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
        indicator: 'rounded-full  h-0.5',
      }"
    >
      <template #payments>
        <SettingsTabsPayments
          :key="`payments-${selectedCompanyId}`"
          v-model:target-company-id="selectedCompanyId"
          :settings
          :is-first-setup
          scope="company"
          :handle-form-error
        />
      </template>

      <template #billing>
        <SettingsTabsCompanyBillingRules
          :key="`billing-${selectedCompanyId}`"
          v-model:state="billingState"
          :is-saving
          :handle-form-error
          @save="save('billing', billingState)"
        />
      </template>

      <template #notifications>
        <SettingsTabsCompanyNotifications
          :key="`notifications-${selectedCompanyId}`"
          v-model:state="notificationsState"
          :is-saving
          :handle-form-error
          @save="save('notifications', notificationsState)"
        />
      </template>

      <template #portal>
        <SettingsTabsCompanyStudentPortal
          :key="`portal-${selectedCompanyId}`"
          v-model:state="portalState"
          :is-saving
          :handle-form-error
          @save="save('portal', portalState)"
        />
      </template>

      <template #academic>
        <SettingsTabsCompanyAcademics
          :key="`academic-${selectedCompanyId}`"
          v-model:state="academicState"
          :is-saving
          :handle-form-error
          @save="save('academic', academicState)"
        />
      </template>

      <template #general>
        <SettingsTabsCompanyGeneral
          :key="`general-${selectedCompanyId}`"
          v-model:state="generalState"
          :is-saving
          :handle-form-error
          @save="save('general', generalState)"
        />
      </template>
    </UTabs>
  </div>
</template>

<style scoped>

</style>
