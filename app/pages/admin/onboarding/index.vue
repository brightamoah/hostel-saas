<script setup lang="ts">
definePageMeta({
  layout: "admin-dashboard",
  middleware: ["requires-auth", "platform-or-owner"],
});

const {
  isUploading,
  isImporting,
  uploadResult,
  errorMessage,
  processFile,
  importData,
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

const totalSkipped = computed(() =>
  sheets.value.reduce(
    (sum, k) => sum + (uploadResult.value?.validation?.[k]?.skipped?.length ?? 0),
    0,
  ),
);

const view = computed<"upload" | "results">(() =>
  uploadResult.value ? "results" : "upload",
);
</script>

<template>
  <div class="flex flex-1">
    <UDashboardPanel id="onboarding">
      <template #header>
        <DashboardNav :title />
      </template>

      <template #body>
        <UContainer class="max-w-6xl">
          <div class="flex md:flex-row flex-col justify-between items-center gap-3 mb-6">
            <UButton
              :to="{ name: 'admin-onboarding-history' }"
              color="neutral"
              variant="subtle"
              label="View Import History"
              leading-icon="i-lucide-history"
              size="lg"
              class="flex justify-center items-center w-[70%] md:w-auto cursor-pointer"
            />

            <UButton
              label="Download Excel Template"
              icon="i-lucide-download"
              color="primary"
              size="lg"
              class="w-full md:w-auto cursor-pointer"
              to="/api/onboarding/template"
              target="_blank"
              external
            />
          </div>

          <UAlert
            v-if="errorMessage"
            class="mb-6"
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

          <Transition
            name="page-slide"
            mode="out-in"
          >
            <div :key="view">
              <template v-if="view === 'upload'">
                <OnboardingUpload
                  v-model:uploading="isUploading"
                  class="mx-auto max-w-3xl"
                  @file="processFile"
                />
              </template>

              <template v-else-if="uploadResult">
                <OnboardingResultSummary
                  :sheet-count="sheets.length"
                  :total-valid
                  :total-invalid
                  :total-skipped
                  :is-importing="isImporting"
                  @reset="resetUpload"
                  @import="importData"
                />

                <OnboardingResults
                  :result="uploadResult"
                  :sheets
                  :is-importing="isImporting"
                  @import="importData"
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
