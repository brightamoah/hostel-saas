<script lang="ts" setup>
function getGreeting() {
  const currentHour = new Date().getHours();

  if (currentHour < 12) {
    return "Good Morning";
  }
  else if (currentHour < 18) {
    return "Good Afternoon";
  }
  else {
    return "Good Evening";
  }
}

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

const dayNightImageUrlLight = computed(() => {
  const greeting = getGreeting();

  if (greeting === "Good Morning") return "svgs/light/sunnyCloud.svg";
  else if (greeting === "Good Afternoon") return "svgs/light/sunny.svg";
  else return "svgs/light/moon.svg";
});

const dayNightImageUrlDark = computed(() => {
  const greeting = getGreeting();

  if (greeting === "Good Morning") return "svgs/dark/sunnyCloud.svg";
  else if (greeting === "Good Afternoon") return "svgs/dark/sunny.svg";
  else return "svgs/dark/moon.svg";
});
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
        {{ getGreeting() }} {{ user?.name || "Admin" }}
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
      <UColorModeImage
        :light="dayNightImageUrlLight"
        :dark="dayNightImageUrlDark"
        width="100"
        height="100"
        alt="Weather"
        class="rounded-lg"
      />
    </template>
  </UAlert>
</template>

<style scoped>

</style>
