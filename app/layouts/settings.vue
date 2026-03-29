<script lang="ts" setup>
const { title = "Settings" } = defineProps<{
  title?: string;
}>();
</script>

<template>
  <UDashboardGroup unit="rem">
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
                  {{ title }}
                </h2>
              </NuxtLink>
            </template>
          </DashboardNav>
        </template>

        <template #body>
          <slot />
        </template>
      </UDashboardPanel>
    </div>

    <DashboardNotificationSlideOver />
  </UDashboardGroup>
</template>

<style scoped>

</style>
