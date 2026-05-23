<script setup lang="ts">
definePageMeta({
  middleware: ["requires-auth", "admin"],
  layout: {
    name: "settings",
    props: {
      title: "Admin Profile",
    },
  },
});

const settingsItems: ProfileSettingsItem[] = [
  {
    id: "security" as const,
    title: "Security Information",
    icon: "i-lucide-shield-check",
    buttonLabel: "Manage Security Info",
    description: "Keep your verification methods and security info up to date.",
    link: { name: "admin-profile-settings-security" },
  },
  {
    id: "password" as const,
    title: "Password",
    icon: "i-lucide-lock",
    buttonLabel: "Change Password",
    description: "Update your password regularly for security.",
    link: { name: "admin-profile-settings-changePassword" },
  },
  {
    id: "privacy" as const,
    title: "Privacy",
    icon: "i-lucide-file-lock",
    buttonLabel: "Manage Privacy",
    description: "View our privacy policy and terms of service.",
    link: { name: "admin-profile-settings-privacy" },
  },
  {
    id: "loginHistory" as const,
    title: "Login History",
    icon: "i-lucide-clock",
    buttonLabel: "View Login History",
    description: "Review your recent login activities.",
    link: { name: "admin-profile-settings-loginHistory" },
  },
];
</script>

<template>
  <div class="px-6">
    <UButton
      label="Back to Dashboard"
      icon="i-lucide-arrow-left"
      variant="link"
      color="neutral"
      :to="{ name: 'admin-dashboard' }"
      class="mb-6"
    />

    <div class="flex lg:flex-row flex-col gap-8">
      <SettingsUserCard />

      <div class="flex-1 gap-8 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
        <SettingsCard
          v-for="item in settingsItems"
          :key="item.id"
          v-bind="item"
        />
      </div>
    </div>
  </div>
</template>

<style scoped></style>
