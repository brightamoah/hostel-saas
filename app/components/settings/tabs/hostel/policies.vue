<script setup lang="ts">
import type { FormErrorEvent, FormSubmitEvent } from "@nuxt/ui";

const { isSaving, handleFormError } = defineProps<{
  isSaving: boolean;
  handleFormError: (event: FormErrorEvent) => void;
}>();

const emit = defineEmits<{ save: [] }>();

const state = defineModel<Partial<HostelPoliciesSchema>>("state", { required: true });

const initialState = ref(JSON.stringify(state.value));
const isDirty = computed(() => JSON.stringify(state.value) !== initialState.value);

const genderPolicyOptions = [
  {
    label: "Per Room",
    value: "per_room",
    description: "Gender enforced individually on each room",
  },
  {
    label: "Hostel Wide",
    value: "hostel_wide",
    description: "The entire hostel has one gender setting",
  },
];

const hostelGenderOptions = [
  { label: "Male only", value: "male" },
  { label: "Female only", value: "female" },
  { label: "Mixed", value: "mixed" },
];

watch(() => state.value.genderPolicy, (val) => {
  if (val === "per_room") state.value.hostelGender = undefined;
});

function onSubmit(_e: FormSubmitEvent<HostelPoliciesSchema>) {
  initialState.value = JSON.stringify(state.value);
  emit("save");
}
</script>

<template>
  <UForm
    :state
    :schema="hostelPoliciesSchema"
    class="space-y-6 mx-auto mt-4 max-w-5xl"
    @submit="onSubmit"
    @error="handleFormError"
  >
    <!-- Gender Policy -->
    <UCard :ui="{ root: 'ring-default shadow-none', header: 'pb-4', body: 'pt-0' }">
      <template #header>
        <div class="flex items-center gap-3">
          <div class="flex justify-center items-center bg-primary/10 p-2 rounded-lg">
            <UIcon
              name="i-lucide-users"
              class="size-5 text-primary"
            />
          </div>

          <div>
            <p class="font-semibold text-highlighted text-sm">
              Gender Policy
            </p>

            <p class="mt-0.5 text-muted text-xs">
              Control how gender restrictions are applied across the hostel
            </p>
          </div>
        </div>
      </template>

      <div class="gap-4 grid grid-cols-1 sm:grid-cols-2">
        <UFormField
          label="Gender Policy"
          name="genderPolicy"
          size="lg"
          required
        >
          <USelectMenu
            v-model="state.genderPolicy"
            :items="genderPolicyOptions"
            value-key="value"
            class="w-full cursor-pointer"
            placeholder="Select gender policy"
          >
            <template #item="{ item }">
              <div>
                <p class="font-medium text-sm">
                  {{ item.label }}
                </p>

                <p class="text-muted text-xs">
                  {{ item.description }}
                </p>
              </div>
            </template>
          </USelectMenu>
        </UFormField>

        <Transition
          enter-active-class="transition-all duration-200 ease-out"
          enter-from-class="opacity-0 -translate-y-1"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition-all duration-150 ease-in"
          leave-from-class="opacity-100 translate-y-0"
          leave-to-class="opacity-0 -translate-y-1"
        >
          <UFormField
            v-if="state.genderPolicy === 'hostel_wide'"
            label="Hostel Gender"
            name="hostelGender"
            size="lg"
            required
          >
            <USelectMenu
              v-model="state.hostelGender"
              :items="hostelGenderOptions"
              value-key="value"
              placeholder="Select gender"
              class="w-full cursor-pointer"
            />
          </UFormField>
        </Transition>
      </div>
    </UCard>

    <!-- Hostel Rules (Visitor + Quiet Hours combined) -->
    <UCard :ui="{ root: 'ring-default shadow-none', header: 'pb-4', body: 'pt-0' }">
      <template #header>
        <div class="flex items-center gap-3">
          <div class="flex justify-center items-center bg-primary/10 p-2 rounded-lg">
            <UIcon
              name="i-lucide-scroll-text"
              class="size-5 text-primary"
            />
          </div>

          <div>
            <p class="font-semibold text-highlighted text-sm">
              Hostel Rules
            </p>

            <p class="mt-0.5 text-muted text-xs">
              Visitor access limits and quiet hour windows shown to students
            </p>
          </div>
        </div>
      </template>

      <div class="space-y-4">
        <div class="gap-4 grid grid-cols-1 sm:grid-cols-2">
          <UFormField
            label="Max Visitors Per Room"
            name="maxVisitorsPerRoom"
            size="lg"
            hint="Maximum allowed at any time"
          >
            <UInput
              v-model.number="state.maxVisitorsPerRoom"
              placeholder="e.g. 4"
              type="number"
              min="0"
              max="100"
              icon="i-lucide-users"
              class="w-full"
            />
          </UFormField>
        </div>

        <UFormField
          label="Visitor Policy"
          name="visitorPolicy"
          size="lg"
          hint="Written rules displayed to students on the portal"
        >
          <UTextarea
            v-model="state.visitorPolicy"
            placeholder="e.g. Visitors are allowed between 8am–10pm. All visitors must sign in at the reception desk…"
            :rows="3"
            class="w-full"
          />
        </UFormField>

        <USeparator
          label="Quiet Hours"
          :ui="{ label: 'text-sm text-muted' }"
        />

        <div class="gap-4 grid grid-cols-1 sm:grid-cols-2">
          <UFormField
            label="Quiet Hours Start"
            name="quietHoursStart"
            size="lg"
            hint="24-hour format"
          >
            <AppTimePicker
              v-model="state.quietHoursStart"
              type="time"
              placeholder="23:00"
              icon="i-lucide-moon"
              class="w-full"
              size="lg"
              :hour-cycle="24"
              :minute-step="1"
            />
          </UFormField>

          <UFormField
            label="Quiet Hours End"
            name="quietHoursEnd"
            size="lg"
            hint="24-hour format"
          >
            <AppTimePicker
              v-model="state.quietHoursEnd"
              icon="i-lucide-sun"
              :hour-cycle="24"
              size="lg"
              :minute-step="1"
              placeholder="7:00"
            />
          </UFormField>
        </div>
      </div>
    </UCard>

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
