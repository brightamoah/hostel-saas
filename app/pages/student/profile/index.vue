<script setup lang="ts">
definePageMeta({
  middleware: ["requires-auth"],
  layout: {
    name: "settings",
    props: {
      title: "Student Profile",
    },
  },
});

const settingsItems: ProfileSettingsItem[] = [
  {
    id: "security-info" as const,
    title: "Security Information",
    icon: "i-lucide-shield-check",
    buttonLabel: "Manage Security Info",
    description: "Keep your verification methods and security info up to date.",
    link: { name: "student-profile-settings-security" },
  },
  {
    id: "password" as const,
    title: "Password",
    icon: "i-lucide-lock",
    buttonLabel: "Change Password",
    description: "Update your password regularly for security.",
    link: { name: "student-profile-settings-changePassword" },
  },
  {
    id: "privacy" as const,
    title: "Privacy",
    icon: "i-lucide-file-lock",
    buttonLabel: "Manage Privacy",
    description: "View our privacy policy and terms of service.",
    link: { name: "student-profile-settings-privacy" },
  },
  {
    id: "loginHistory" as const,
    title: "Login History",
    icon: "i-lucide-clock",
    buttonLabel: "View Login History",
    description: "Review your recent login activities.",
    link: { name: "student-profile-settings-loginHistory" },
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
      :to="{ name: 'student-dashboard' }"
      class="mb-6"
    />

    <div class="gap-8 grid grid-cols-1 lg:grid-cols-4">
      <SettingsUserCard class="lg:row-span-2" />

      <div class="gap-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 lg:col-span-3">
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
