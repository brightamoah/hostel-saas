<script setup lang="ts">
definePageMeta({
  layout: "auth",
});

const { clear: clearPortalUserSession } = usePortalUserSession();

onMounted(async () => {
  try {
    await new Promise(resolve => setTimeout(resolve, 1000));

    await clearPortalUserSession();
    clearNuxtData();
  }
  finally {
    await navigateTo({ name: "auth-login" }, { replace: true });
  }
});
</script>

<template>
  <div class="flex flex-col justify-center items-center h-full">
    <UIcon
      name="i-lucide-loader"
      size="48"
      class="mx-auto mb-4 text-primary animate-spin"
    />

    <h2 class="mb-2 font-semibold text-2xl">
      Logging Out...
    </h2>

    <p class="text-muted">
      You are being logged out of your account.
    </p>
  </div>
</template>

<style scoped>

</style>
