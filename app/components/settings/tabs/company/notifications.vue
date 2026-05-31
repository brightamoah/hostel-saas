<script setup lang="ts">
import type { FormErrorEvent, FormSubmitEvent } from "@nuxt/ui";

const { isSaving, handleFormError } = defineProps<{
  isSaving: boolean;
  handleFormError: (event: FormErrorEvent) => void;
}>();

const emit = defineEmits<{ save: [] }>();

const state = defineModel<Partial<CompanyNotificationSettingsSchema>>("state", { required: true });

const initialState = ref(JSON.stringify(state.value));
const isDirty = computed(() => JSON.stringify(state.value) !== initialState.value);

watch(() => state.value, (newVal) => {
  if (!isSaving && JSON.stringify(newVal) === initialState.value) return;
}, { deep: true });

const formRef = useTemplateRef("formRef");

const toggles = [
  {
    key: "notifyOnPayment" as const,
    label: "Payment Received",
    description: "Alert admins whenever a student completes a payment.",
    icon: "i-lucide-circle-dollar-sign",
  },
  {
    key: "notifyOnOverdue" as const,
    label: "Overdue Bills",
    description: "Send reminders when bills pass their due date.",
    icon: "i-lucide-clock-alert",
  },
  {
    key: "notifyOnAllocation" as const,
    label: "Room Allocation Changes",
    description: "Notify on new allocations, transfers, and cancellations.",
    icon: "i-lucide-door-open",
  },
  {
    key: "notifyOnMaintenance" as const,
    label: "Maintenance Requests",
    description: "Alert admins on new or updated maintenance submissions.",
    icon: "i-lucide-wrench",
  },
];

const reminderInput = ref(
  (state.value.overdueReminderDays ?? [3, 7, 14]).join(", "),
);

watch(reminderInput, (val) => {
  const parsed = val
    .split(",")
    .map(s => Number.parseInt(s.trim(), 10))
    .filter(n => !Number.isNaN(n) && n > 0 && n <= 365);
  state.value.overdueReminderDays = [...new Set(parsed)].sort((a, b) => a - b);
});

function onSubmit(_e: FormSubmitEvent<CompanyNotificationSettingsSchema>) {
  initialState.value = JSON.stringify(state.value);
  emit("save");
}
</script>

<template>
  <UForm
    ref="formRef"
    :state
    :schema="companyNotificationSettingsSchema"
    class="space-y-6 mx-auto mt-6 max-w-4xl"
    @submit="onSubmit"
    @error="handleFormError"
  >
    <div class="space-y-5">
      <div
        v-for="toggle in toggles"
        :key="toggle.key"
        class="flex items-center gap-3 bg-muted/30 p-4 border border-default rounded-lg transition-colors"
        :class="{ 'border-primary/50 bg-primary/5': state[toggle.key] }"
      >
        <div class="flex justify-center items-center p-2 rounded-lg transition-colors shrink-0">
          <UIcon
            :name="toggle.icon"
            class="size-5 transition-colors"
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

    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="opacity-0 -translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-1"
    >
      <UCard
        v-if="state.notifyOnOverdue"
        :ui="{ root: 'ring-default shadow-none', header: 'pb-4', body: 'pt-0' }"
      >
        <template #header>
          <div class="flex items-center gap-3">
            <div class="flex justify-center items-center bg-warning/10 p-2 rounded-lg">
              <UIcon
                name="i-lucide-calendar-clock"
                class="size-5 text-warning"
              />
            </div>

            <div>
              <p class="font-semibold text-highlighted text-sm">
                Overdue Reminder Schedule
              </p>

              <p class="mt-0.5 text-muted text-xs">
                Days after the due date to send automated reminder emails
              </p>
            </div>
          </div>
        </template>

        <div class="space-y-4">
          <UFormField
            name="overdueReminderDays"
            size="lg"
            hint="Enter comma-separated numbers between 1–365 (e.g. 3, 7, 14)"
          >
            <UInput
              v-model="reminderInput"
              placeholder="3, 7, 14"
              icon="i-lucide-timer"
              class="w-full max-w-sm"
            />
          </UFormField>

          <div
            v-if="state.overdueReminderDays?.length"
            class="space-y-2"
          >
            <p class="font-medium text-muted text-xs">
              Scheduled reminders
            </p>

            <div class="flex flex-wrap gap-2">
              <UBadge
                v-for="day in state.overdueReminderDays"
                :key="day"
                :label="`Day ${day}`"
                color="warning"
                variant="subtle"
                size="md"
              >
                <template #leading>
                  <UIcon
                    name="i-lucide-bell-dot"
                    class="size-3"
                  />
                </template>
              </UBadge>
            </div>
          </div>

          <div
            v-else
            class="flex items-center gap-2 text-muted text-xs"
          >
            <UIcon
              name="i-lucide-info"
              class="size-3.5 shrink-0"
            />

            <span>No valid reminder days entered yet.</span>
          </div>
        </div>
      </UCard>
    </Transition>

    <!-- Footer -->
    <div class="flex justify-end pb-2">
      <UButton
        type="submit"
        :label="isDirty ? 'Update' : 'Save Changes'"
        icon="i-lucide-save"
        color="primary"
        size="lg"
        :loading="isSaving"
        class="cursor-pointer"
      />
    </div>
  </UForm>
</template>
