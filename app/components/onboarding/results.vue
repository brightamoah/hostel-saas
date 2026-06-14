<script setup lang="ts">
import type { TabsItem } from "@nuxt/ui";

const props = defineProps<{
  result: UploadResult;
  sheets: string[];
  isImporting?: boolean;
  onboardingStatus?: OnboardingImportStatus;
}>();

const emit = defineEmits<{ import: [] }>();

const tabs = computed<TabsItem[]>(() => {
  const items: TabsItem[] = [
    {
      label: "Errors",
      slot: "errors" as const,
      icon: "i-lucide-circle-alert",
      value: "errors",
    },
    {
      label: "Ready for Import",
      slot: "valid" as const,
      icon: "i-lucide-circle-check-big",
      value: "valid",
    },
  ];

  const hasUpdated = props.sheets.some(s => (props.result.validation[s]?.updated?.length ?? 0) > 0);
  if (hasUpdated) {
    items.push({
      label: "Updated",
      slot: "updated" as const,
      icon: "i-lucide-refresh-cw",
      value: "updated",
    });
  }

  const hasSkipped = props.sheets.some(s => (props.result.validation[s]?.skipped?.length ?? 0) > 0);
  if (hasSkipped) {
    items.push({
      label: "Skipped",
      slot: "skipped" as const,
      icon: "i-lucide-skip-forward",
      value: "skipped",
    });
  }

  return items;
});

const activeTab = ref("errors");
</script>

<template>
  <div>
    <UTabs
      v-model="activeTab"
      :items="tabs"
      :ui="{
        list: 'mb-5',
        trigger: 'cursor-pointer',
      }"
    >
      <template #errors>
        <OnboardingAccordion
          :result
          :sheets
        />
      </template>

      <template #valid>
        <OnboardingValidSummary
          :result
          :sheets
          :is-importing
          :onboarding-status
          @import="emit('import')"
        />
      </template>

      <template #updated>
        <OnboardingUpdatedSummary
          :result
          :sheets
        />
      </template>

      <template #skipped>
        <OnboardingSkippedSummary
          :result
          :sheets
        />
      </template>
    </UTabs>
  </div>
</template>
