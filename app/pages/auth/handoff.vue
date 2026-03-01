<script lang="ts" setup>
definePageMeta({
  layout: "auth",
  middleware: ["auth-redirect"],
});

const route = useRoute();
const toast = useToast();
const { $apiFetch } = useNuxtApp();
const { fetch: refreshSession } = useUserSession();

const loading = ref(true);
const error = ref<string | null>(null);

onMounted(async () => {
  try {
    const token = route.query.token;

    if (!token || typeof token !== "string") {
      throw new Error("Missing handoff token.");
    }

    const res = await $apiFetch("/api/auth/handoff", {
      method: "POST",
      body: { token },
    });

    await refreshSession();

    // Use nextUrl from server if provided, else default
    const next = res.nextUrl || "/admin/dashboard";

    await navigateTo(next);
  }
  catch (e: any) {
    error.value = e?.data?.message || e?.message || "Handoff failed. Please log in again.";
    toast.add({
      title: "Login transfer failed",
      description: error.value!,
      color: "error",
    });
  }
  finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="flex flex-col justify-center items-center gap-4 mx-auto max-w-md">
    <h1 class="font-semibold text-lg text-center">
      Signing you in…
    </h1>

    <div
      v-if="loading"
      class="space-y-3"
    >
      <p class="text-muted text-sm">
        Please wait while we transfer you to the admin portal.
      </p>

      <UProgress animation="carousel" />
    </div>

    <div
      v-else-if="error"
      class="space-y-4"
    >
      <UAlert
        color="error"
        variant="subtle"
        :title="error"
      />

      <div class="flex gap-2">
        <UButton
          to="/auth/login"
          color="primary"
        >
          Go to admin login
        </UButton>

        <UButton
          variant="outline"
          :to="{ path: '/', query: {} }"
        >
          Home
        </UButton>
      </div>
    </div>

    <div v-else>
      <p class="font-medium text-muted text-lg text-center">
        Redirecting…
      </p>
    </div>
  </div>
</template>

<style scoped>

</style>
