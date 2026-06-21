<script setup lang="ts">
import type { FormErrorEvent, FormSubmitEvent } from "@nuxt/ui";

const { isSaving, handleFormError } = defineProps<{
  isSaving: boolean;
  handleFormError: (event: FormErrorEvent) => void;
}>();

const emit = defineEmits<{ save: [] }>();

const state = defineModel<Partial<CompanyPortalSettingsSchema>>("state", { required: true });

const initialState = ref(JSON.stringify(state.value));
const isDirty = computed(() => JSON.stringify(state.value) !== initialState.value);

const formRef = useTemplateRef("formRef");

const toggles = [
  {
    key: "allowStudentSelfCheckout" as const,
    label: "Self-Checkout",
    description: "Students can initiate their own payments from the portal.",
    icon: "i-heroicons-credit-card",
  },
  {
    key: "allowStudentViewRoommates" as const,
    label: "View Roommates",
    description: "Students can see the names of others sharing their room.",
    icon: "i-lucide-users-round",
  },
  {
    key: "allowStudentMaintenanceRequests" as const,
    label: "Maintenance Requests",
    description: "Students can submit maintenance issues from the portal.",
    icon: "i-lucide-wrench",
  },
  {
    key: "allowStudentComplaints" as const,
    label: "Complaints",
    description: "Students can file complaints through the portal.",
    icon: "i-lucide-flag",
  },
];

function onSubmit(_e: FormSubmitEvent<CompanyPortalSettingsSchema>) {
  initialState.value = JSON.stringify(state.value);
  emit("save");
}

defineExpose({
  formRef,
});
</script>

<template>
  <UForm
    ref="formRef"
    :state
    :schema="companyPortalSettingsSchema"
    class="space-y-6 mx-auto pt-6 max-w-4xl"
    @submit="onSubmit"
    @error="handleFormError"
  >
    <div class="space-y-5">
      <div
        v-for="toggle in toggles"
        :key="toggle.key"
        class="flex justify-between items-center gap-3 bg-muted/30 p-4 border border-default rounded-lg transition-colors"
        :class="{ 'border-primary/50 bg-primary/5': state[toggle.key] }"
      >
        <div class="flex justify-center items-center p-2 rounded-lg transition-colors shrink-0">
          <UIcon
            :name="toggle.icon"
            class="size-6 transition-colors"
            :class="state[toggle.key] ? 'text-primary' : 'text-muted'"
          />
        </div>

        <div class="flex-1 min-w-0">
          <p class="font-medium text-highlighted text-sm">
            {{ toggle.label }}
          </p>

          <p class="mt-0.5 text-muted text-xs">
            {{ toggle.description }}
          </p>
        </div>

        <USwitch
          v-model="state[toggle.key]"
          :ui="{ base: 'cursor-pointer' }"
        />
      </div>
    </div>

    <div class="flex justify-end pt-2">
      <UButton
        type="submit"
        :label="isDirty ? 'Update' : 'Save Changes'"
        icon="i-lucide-save"
        color="primary"
        :loading="isSaving"
        class="cursor-pointer"
      />
    </div>
  </UForm>
</template>

<style scoped></style>
