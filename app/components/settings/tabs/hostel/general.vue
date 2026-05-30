<script setup lang="ts">
import type { FormErrorEvent, FormSubmitEvent } from "@nuxt/ui";

const { isSaving, handleFormError } = defineProps<{
  isSaving: boolean;
  handleFormError: (event: FormErrorEvent) => void;
}>();

const emit = defineEmits<{ save: [] }>();

const state = defineModel<Partial<HostelBrandingSchema>>("state", { required: true });

const config = useAppConfig();

watch(() => [state.value.primaryColor, state.value.accentColor], ([primary, accent]) => {
  if (primary) config.ui.colors.primary = colorLabel(primary).toLocaleLowerCase();

  if (accent) config.ui.colors.neutral = colorLabel(accent).toLocaleLowerCase();
}, { immediate: true });

function onSubmit(_e: FormSubmitEvent<HostelBrandingSchema>) {
  emit("save");
}
</script>

<template>
  <UForm
    :state
    class="space-y-6 mx-auto mt-4 max-w-5xl"
    @submit="onSubmit"
    @error="handleFormError"
  >
    <!-- Branding overrides -->
    <UCard :ui="{ root: 'ring-default shadow-none' }">
      <template #header>
        <div class="flex items-center gap-3">
          <div class="flex justify-center items-center bg-primary/10 p-2 rounded-lg">
            <UIcon
              name="i-lucide-palette"
              class="size-5 text-primary"
            />
          </div>

          <div>
            <p class="font-semibold text-highlighted text-sm">
              Branding Overrides
            </p>

            <p class="mt-0.5 text-muted text-xs">
              These override the company-level branding for this hostel only
            </p>
          </div>
        </div>
      </template>

      <div class="gap-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <UFormField
          label="Logo URL"
          name="logoUrl"
          size="lg"
          class="sm:col-span-2 lg:col-span-1"
        >
          <UInput
            v-model="state.logoUrl"
            placeholder="https://yourhostel.com/logo.png"
            icon="i-lucide-image"
            class="w-full"
          />
        </UFormField>

        <UFormField
          label="Primary Color"
          name="primaryColor"
          size="lg"
        >
          <USelectMenu
            :model-value="state.primaryColor"
            :items="UI_COLORS"
            value-key="value"
            :placeholder="state.primaryColor ? colorLabel(state.primaryColor) : 'Select color'"
            class="w-full cursor-pointer"
            @update:model-value="state.primaryColor = $event"
          >
            <template #leading>
              <span
                class="border border-default rounded-full size-4 transition-colors shrink-0"
                :style="{ backgroundColor: state.primaryColor ?? 'transparent' }"
              />
            </template>

            <template #item="{ item }">
              <span
                class="border border-default rounded-full size-4 shrink-0"
                :style="{ backgroundColor: item.value }"
              />

              <span class="ml-2 text-sm">{{ item.label }}</span>
            </template>
          </USelectMenu>
        </UFormField>

        <UFormField
          label="Accent Color"
          name="accentColor"
          size="lg"
        >
          <USelectMenu
            :model-value="state.accentColor"
            :items="NEUTRAL_COLORS"
            value-key="value"
            :placeholder="state.accentColor ? colorLabel(state.accentColor) : 'Select color'"
            class="w-full cursor-pointer"
            @update:model-value="state.accentColor = $event"
          >
            <template #leading>
              <span
                class="border border-default rounded-full size-4 transition-colors shrink-0"
                :style="{ backgroundColor: state.accentColor ?? 'transparent' }"
              />
            </template>

            <template #item="{ item }">
              <span
                class="border border-default rounded-full size-4 shrink-0"
                :style="{ backgroundColor: item.value }"
              />

              <span class="ml-2 text-sm">{{ item.label }}</span>
            </template>
          </USelectMenu>
        </UFormField>
      </div>
    </UCard>

    <!-- Support contact overrides -->
    <UCard :ui="{ root: 'ring-default shadow-none', header: 'pb-4', body: 'pt-0' }">
      <template #header>
        <div class="flex items-center gap-3">
          <div class="flex justify-center items-center bg-primary/10 p-2 rounded-lg">
            <UIcon
              name="i-lucide-headset"
              class="size-5 text-primary"
            />
          </div>

          <div>
            <p class="font-semibold text-highlighted text-sm">
              Support Contact Overrides
            </p>

            <p class="mt-0.5 text-muted text-xs">
              Override company-level contact info for this hostel
            </p>
          </div>
        </div>
      </template>

      <div class="gap-4 grid grid-cols-1 sm:grid-cols-2">
        <UFormField
          label="Support Email"
          name="supportEmail"
          size="lg"
        >
          <UInput
            v-model="state.supportEmail"
            type="email"
            placeholder="support@yourhostel.com"
            icon="i-lucide-mail"
            class="w-full"
          />
        </UFormField>

        <UFormField
          label="Support Phone"
          name="supportPhone"
          size="lg"
        >
          <UInput
            v-model="state.supportPhone"
            placeholder="+233 24 000 0000"
            icon="i-lucide-phone"
            class="w-full"
          />
        </UFormField>
      </div>
    </UCard>

    <div class="flex justify-end py-2">
      <UButton
        type="submit"
        label="Save Changes"
        icon="i-lucide-save"
        color="primary"
        size="lg"
        :loading="isSaving"
        class="cursor-pointer"
      />
    </div>
  </UForm>
</template>

<style scoped></style>
