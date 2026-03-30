<script setup lang="ts">
definePageMeta({
  middleware: ["requires-auth"],
  layout: {
    name: "settings",
    props: {
      title: "Security Information",
    },
  },
});

const userProfile = inject(userProfileKey);

const securityItems = computed<SecuritySettingsItem[]>(() => [
  {
    id: "phone" as const,
    label: "Phone Number",
    value: userProfile?.value?.phoneNumber || "N/A",
    edit: true,
    icon: "i-lucide-phone-call",
  },
  {
    id: "email" as const,
    label: "Email Address",
    value: userProfile?.value?.email || "N/A",
    edit: false,
    icon: "i-lucide-mail",

  },
  {
    id: "password" as const,
    label: "Password",
    value: "*****************",
    edit: true,
    icon: "i-lucide-lock",
    link: { name: "student-profile-settings-changePassword" },
  },
  {
    id: "2fa" as const,
    label: "Two-Factor Authentication",
    value: "Disabled",
    edit: false,
    icon: "i-lucide-shield-check",
  },
]);
</script>

<template>
  <div>
    <UButton
      label="Back to Profile"
      icon="i-lucide-arrow-left"
      variant="link"
      color="neutral"
      :to="{ name: 'student-profile' }"
      class="mb-6"
    />

    <UCard
      class="shadow-md mx-auto max-w-4xl"
      variant="subtle"
    >
      <h2 class="font-bold text-xl">
        Security Settings
      </h2>

      <p>Manage your security preferences and protect your account.</p>

      <USeparator
        size="sm"
        class="my-4"
      />

      <div
        v-for="item in securityItems"
        :key="item.id"
        class="flex flex-col mb-5"
      >
        <div class="flex justify-between items-center">
          <DashboardDetailItem
            :label="item.label"
            :value="item.value"
          >
            <template #label="{ label }">
              <h3 class="flex items-center gap-2 font-semibold text-default text-base text-center">
                <UIcon
                  :name="item.icon"
                  class="size-6"
                />

                <span>
                  {{ label }}
                </span>
              </h3>
            </template>

            <template #default="{ value }">
              <p class="text-muted text-base">
                {{ value }}
              </p>
            </template>
          </DashboardDetailItem>

          <UButton
            v-if="item.edit"
            icon="i-lucide-notebook-pen"
            variant="link"
            color="neutral"
            class="hover:text-primary cursor-pointer"
            :to="item.link"
          />

          <UButton
            v-if="item.id === '2fa' && item.value === 'Disabled'"
            label="Enable 2FA"
            :icon="item.icon"
            variant="subtle"
            color="primary"
            class="cursor-pointer"
          />
        </div>

        <USeparator
          size="sm"
          class="mt-5"
        />
      </div>

      <p class="text-muted">
        For enhanced security, consider enabling two-factor authentication and regularly updating your password.
      </p>

      <UAlert
        class="flex items-center mt-5"
        variant="subtle"
        color="warning"
        icon="i-lucide-triangle-alert"
        title="Two-Factor Authentication not Enabled"
        description="Enable two-factor authentication to add an extra layer of security to your account."
        :ui="{
          icon: 'size-6',
        }"
      />
    </UCard>
  </div>
</template>

<style scoped>

</style>
