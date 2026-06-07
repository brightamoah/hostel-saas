<script setup lang="ts">
definePageMeta({
  layout: "admin-dashboard",
  middleware: ["requires-auth", "platform-or-owner"],
});

const {
  isUploading,
  uploadResult,
  errorMessage,
  processFile,
  resetUpload,
} = useOnboardingUpload();

const title = "Onboarding";

const sheets = computed<string[]>(() => {
  if (!uploadResult.value?.validation) return [];
  return Object.keys(uploadResult.value.validation).filter(
    k =>
      (uploadResult.value?.validation?.[k]?.valid?.length ?? 0) > 0
      || (uploadResult.value?.validation?.[k]?.invalid?.length ?? 0) > 0,
  );
});

const totalValid = computed(() =>
  sheets.value.reduce(
    (sum, k) => sum + (uploadResult.value?.validation?.[k]?.valid?.length ?? 0),
    0,
  ),
);

const totalInvalid = computed(() =>
  sheets.value.reduce(
    (sum, k) => sum + (uploadResult.value?.validation?.[k]?.invalid?.length ?? 0),
    0,
  ),
);

const view = computed<"upload" | "results">(() =>
  uploadResult.value ? "results" : "upload",
);
</script>

<template>
  <div class="flex flex-1">
    <UDashboardPanel id="rooms">
      <template #header>
        <DashboardNav :title />
      </template>

      <template #body>
        <UContainer class="max-w-6xl">
          <div class="flex justify-end items-center mb-6">
            <UButton
              label="Download Onboarding Template"
              icon="i-lucide-download"
              class="cursor-pointer"
            />
          </div>

          <Transition
            name="page-slide"
            mode="out-in"
          >
            <div :key="view">
              <template v-if="view === 'upload'">
                <OnboardingUpload
                  v-model:uploading="isUploading"
                  @file="processFile"
                />

                <UAlert
                  v-if="errorMessage"
                  class="mt-4"
                  color="error"
                  variant="subtle"
                  orientation="horizontal"
                  icon="i-lucide-triangle-alert"
                  :title="errorMessage"
                  :actions="[{
                    label: 'Dismiss',
                    color: 'error',
                    variant: 'subtle',
                    class: 'cursor-pointer',
                    icon: 'i-lucide-x',
                    size: 'lg',
                    onClick: () => { errorMessage = '' },
                  }]"
                  :ui="{
                    icon: 'size-6',
                  }"
                />
              </template>

              <template v-else-if="uploadResult">
                <OnboardingResultSummary
                  :sheet-count="sheets.length"
                  :total-valid
                  :total-invalid
                  @reset="resetUpload"
                />

                <OnboardingResults
                  :result="uploadResult"
                  :sheets
                />
              </template>
            </div>
          </Transition>
        </UContainer>
      </template>
    </UDashboardPanel>
  </div>
</template>

<style scoped>
.page-slide-enter-active,
.page-slide-leave-active {
  transition:
    opacity 0.22s ease,
    transform 0.22s ease;
}
.page-slide-enter-from {
  opacity: 0;
  transform: translateY(10px);
}
.page-slide-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
