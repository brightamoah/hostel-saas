<script setup lang="ts">
defineProps<{
  userName: string;
  refreshIsLoading: boolean;
  canResend: boolean;
  coolDownTime: number;
  handleRefresh: () => Promise<boolean>;
}>();

const {
  dayNightImageUrlDark,
  dayNightImageUrlLight,
} = useGreetings();
</script>

<template>
  <UAlert
    variant="subtle"
    color="neutral"
    orientation="horizontal"
    class="w-full shrink-0"
  >
    <template #title>
      <h1 class="font-semibold text-xl">
        Welcome back, {{ userName }}
      </h1>
    </template>

    <template #description>
      <p class="mt-1 text-muted text-base">
        Manage your hostel stay efficiently from here!
      </p>

      <div class="flex gap-2 mt-3">
        <UButton
          label="View Profile"
          icon="i-lucide-circle-user-round"
          size="lg"
          class="justify-center items-center cursor-pointer"
          :to="{ name: 'student-profile' }"
        />

        <DashboardRefreshButton
          variant="solid"
          color="neutral"
          :can-resend
          :cool-down-time
          :refresh-is-loading
          :handle-refresh
        />
      </div>
    </template>

    <template #actions>
      <DashboardSunMoon
        :day-night-image-url-dark
        :day-night-image-url-light
      />
    </template>
  </UAlert>
</template>

<style scoped>

</style>
