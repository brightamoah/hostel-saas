<script setup lang="ts">
import type { TabsItem } from "@nuxt/ui";

defineProps<{
  result: UploadResult;
  sheets: string[];
}>();

const emit = defineEmits<{ import: [] }>();

const tabs: TabsItem[] = [
  {
    label: "Errors",
    slot: "errors" as const,
    icon: "i-lucide-circle-alert",
    value: "errors",
  },
  {
    label: "Valid Data",
    slot: "valid" as const,
    icon: "i-lucide-circle-check-big",
    value: "valid",
  },
];

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
          :result="result"
          :sheets="sheets"
          @import="emit('import')"
        />
      </template>
    </UTabs>
  </div>
</template>
