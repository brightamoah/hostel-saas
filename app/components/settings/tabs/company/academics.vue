<script setup lang="ts">
import type { FormErrorEvent, FormSubmitEvent } from "@nuxt/ui";

const { isSaving, handleFormError } = defineProps<{
  isSaving: boolean;
  handleFormError: (event: FormErrorEvent) => void;
}>();

const emit = defineEmits<{ save: [] }>();

const state = defineModel<Partial<CompanyAcademicSettingsSchema>>("state", { required: true });

const initialState = ref(JSON.stringify(state.value));
const isDirty = computed(() => JSON.stringify(state.value) !== initialState.value);

const formRef = useTemplateRef("formRef");

const periodOptions = companyAcademicSettingsSchema.shape.defaultAcademicPeriod.options.map(period => ({
  label: capitalizeWords(period),
  value: period,
}));

const yearIsValid = computed(() =>
  /^\d{4}\/\d{4}$/.test(state.value.defaultAcademicYear ?? ""),
);

function onSubmit(_e: FormSubmitEvent<CompanyAcademicSettingsSchema>) {
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
    :schema="companyAcademicSettingsSchema"
    class="space-y-6 mx-auto mt-6 max-w-2xl"
    @submit="onSubmit"
    @error="handleFormError"
  >
    <UCard :ui="{ root: 'ring-default shadow-none', header: 'pb-4', body: 'pt-0' }">
      <template #header>
        <div class="flex items-center gap-3">
          <div class="flex justify-center items-center bg-primary/10 p-2 rounded-lg">
            <UIcon
              name="i-lucide-graduation-cap"
              class="size-5 text-primary"
            />
          </div>

          <div>
            <p class="font-semibold text-highlighted text-sm">
              Academic Defaults
            </p>

            <p class="mt-0.5 text-muted text-xs">
              Pre-fills new allocations and billing records - can be overridden per record
            </p>
          </div>
        </div>
      </template>

      <div class="gap-4 grid grid-cols-1">
        <UFormField
          label="Default Academic Year"
          name="defaultAcademicYear"
          size="lg"
          required
        >
          <UInput
            v-model="state.defaultAcademicYear"
            placeholder="2025/2026"
            icon="i-lucide-calendar"
            class="w-full"
            :trailing-icon="yearIsValid ? 'i-lucide-circle-check' : undefined"
            :ui="{ trailingIcon: yearIsValid ? 'text-success' : '' }"
          />

          <template #hint>
            <span
              class="text-xs"
              :class="yearIsValid ? 'text-success' : 'text-muted'"
            >
              {{ yearIsValid ? 'Valid format' : 'Format: YYYY/YYYY' }}
            </span>
          </template>
        </UFormField>

        <UFormField
          label="Default Academic Period"
          name="defaultAcademicPeriod"
          size="lg"
          required
        >
          <USelectMenu
            v-model="state.defaultAcademicPeriod"
            :items="periodOptions"
            value-key="value"
            placeholder="Select academic period"
            icon="i-lucide-book-open"
            class="w-full cursor-pointer"
          />
        </UFormField>
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
