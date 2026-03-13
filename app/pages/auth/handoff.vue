<script lang="ts" setup>
definePageMeta({
  layout: "auth",
});

const route = useRoute();
const toast = useToast();
const { $apiFetch } = useNuxtApp();
const { fetch: refreshSession } = usePortalUserSession();

const loading = ref(true);
const error = ref<string | null>(null);
const status = ref<"processing" | "success" | "error">("processing");

const statusMessage = ref("Verifying your credentials...");

onMounted(async () => {
  const token = route.query.token;

  if (!token || typeof token !== "string") {
    status.value = "error";
    error.value = "Invalid or missing handoff token.";
  }

  try {
    statusMessage.value = "Authenticating...";

    const res = await $apiFetch("/api/auth/handoff", {
      method: "POST",
      body: { token },
    });

    statusMessage.value = "Setting up your session...";
    await refreshSession();

    status.value = "success";
    statusMessage.value = "Welcome! Redirecting to your dashboard...";

    await new Promise(resolve => setTimeout(resolve, 500));

    const nextUrl = res.nextUrl || "/admin/dashboard";

    await navigateTo(nextUrl);
  }
  catch (e: any) {
    error.value = e?.data?.message || e?.message || "Authentication failed. Please try logging in again.";
    toast.add({
      title: "Login transfer failed",
      description: error.value!,
      color: "error",
      duration: 8000,
    });
  }
  finally {
    loading.value = false;
  }
});

async function retryLogin() {
  await navigateTo({ name: "auth-login" }, { replace: true });
}
</script>

<template>
  <div>
    <div
      v-auto-animate
      class="flex flex-col justify-center items-center gap-6 mx-auto px-4 max-w-md"
    >
      <template v-if="status === 'processing'">
        <div class="flex flex-col items-center gap-4">
          <div class="relative">
            <UIcon
              name="i-lucide-shield-check"
              class="text-primary text-5xl"
            />
          </div>

          <h1 class="font-semibold text-xl text-center">
            Signing you in...
          </h1>

          <p class="text-muted text-sm text-center">
            {{ statusMessage }}
          </p>

          <UProgress
            animation="carousel"
            class="w-48"
          />
        </div>
      </template>

      <template v-else-if="status === 'success'">
        <div class="flex flex-col items-center gap-4">
          <UIcon
            name="i-lucide-check-circle"
            class="text-success text-5xl"
          />

          <h1 class="font-semibold text-xl text-center">
            Authentication Successful
          </h1>

          <p class="text-muted text-sm text-center">
            {{ statusMessage }}
          </p>
        </div>
      </template>

      <template v-else-if="status === 'error'">
        <div class="flex flex-col items-center gap-4 w-full">
          <UIcon
            name="i-lucide-shield-x"
            class="text-error text-5xl"
          />

          <h1 class="font-semibold text-xl text-center">
            Authentication Failed
          </h1>

          <UAlert
            color="error"
            variant="subtle"
            :title="error || 'An unexpected error occurred'"
            class="w-full text-center"
          />

          <div class="flex gap-3">
            <UButton
              color="primary"
              icon="i-lucide-log-in"
              class="cursor-pointer"
              @click="retryLogin"
            >
              Try Again
            </UButton>

            <UButton
              variant="outline"
              icon="i-lucide-home"
              :to="{ name: 'index' }"
              class="cursor-pointer"
            >
              Go Home
            </UButton>
          </div>

          <p class="text-muted text-xs text-center">
            If this problem persists, please contact support.
          </p>
        </div>
      </template>
    </div>
  </div>
</template>
