<script setup lang="ts">
definePageMeta({
  middleware: ["requires-auth", "admin"],
  layout: {
    name: "admin-dashboard",
    props: {
      sidebar: false,
    },
  },
});

const title = ref("Admin Profile");

const settingsItems: ProfileSettingsItem[] = [
  {
    id: "security-info" as const,
    title: "Security Information",
    icon: "i-lucide-shield-check",
    buttonLabel: "Manage Security Info",
    description: "Keep your verification methods and security info up to date.",
    link: { name: "admin-profile-settings-security" },
  },
  {
    id: "security-info" as const,
    title: "Security Information",
    icon: "i-lucide-shield-check",
    buttonLabel: "Manage Security Info",
    description: "Keep your verification methods and security info up to date.",
    link: { name: "admin-profile-settings-security" },
  },
  {
    id: "security-info" as const,
    title: "Security Information",
    icon: "i-lucide-shield-check",
    buttonLabel: "Manage Security Info",
    description: "Keep your verification methods and security info up to date.",
    link: { name: "admin-profile-settings-security" },
  },
  {
    id: "security-info" as const,
    title: "Security Information",
    icon: "i-lucide-shield-check",
    buttonLabel: "Manage Security Info",
    description: "Keep your verification methods and security info up to date.",
    link: { name: "admin-profile-settings-security" },
  },
];
</script>

<template>
  <div class="flex flex-1">
    <UDashboardPanel id="admin-profile">
      <template #header>
        <DashboardNav
          :title
          :show-toggle="false"
        >
          <template #title>
            <NuxtLink
              :to="{ name: 'admin-dashboard' }"
              class="flex items-center gap-2"
            >
              <AppLogo class="size-6 md:size-8" />

              <h2 class="hidden md:block font-newsreader font-semibold text-2xl">
                KayaNest
              </h2>
            </NuxtLink>
          </template>
        </DashboardNav>
      </template>

      <template #body>
        <div class="p-4 sm:p-6 lg:p-8">
          <div class="flex gap-8">
            <SettingsUserCard class="lg:row-span-2" />

            <div class="flex-1 gap-8 grid grid-cols-3">
              <SettingsCard
                v-for="item in settingsItems"
                :key="item.id"
                v-bind="item"
              />
            </div>
          </div>
        </div>
      </template>
    </UDashboardPanel>
  </div>
</template>

<style scoped></style>
