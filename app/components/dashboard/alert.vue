<script lang="ts" setup>
const {
  greeting,
  dayNightImageUrlDark,
  dayNightImageUrlLight,
} = useGreetings();

const { user } = usePortalUserSession();
const { userProfile } = useUser();

const refreshContext = inject(refreshKey);
const isMobile = inject(isMobileKey);

const {
  canResend,
  coolDownTime,
  refreshIsLoading,
  handleRefresh,
} = refreshContext ?? {};
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
        {{ greeting }} {{ user?.name || "Admin" }}
      </h1>
    </template>

    <template #description>
      <p class="text-muted text-base">
        Manage {{ userProfile?.hostel ?? "Kayanest" }} operations efficiently from your dashboard.
      </p>

      <div class="flex gap-2 mt-3">
        <UButton
          :label="isMobile ? 'Profile' : 'View Profile'"
          variant="subtle"
          color="neutral"
          icon="i-lucide-user"
          class="cursor-pointer"
          :to="{ name: 'admin-profile' }"
        />

        <DashboardRefreshButton
          :cool-down-time="coolDownTime!"
          :handle-refresh="handleRefresh!"
          :can-resend="canResend!"
          :refresh-is-loading="refreshIsLoading!"
          :label="isMobile ? 'Refresh' : 'Refresh Data'"
          variant="solid"
          color="primary"
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
