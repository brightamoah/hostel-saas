<script setup lang="ts">
import type { FormErrorEvent, FormSubmitEvent } from "@nuxt/ui";

const { isSaving, handleFormError } = defineProps<{
  isSaving: boolean;
  handleFormError: (event: FormErrorEvent) => void;
}>();

const emit = defineEmits<{ save: [] }>();

const state = defineModel<Partial<CompanyGeneralSettingsSchema>>("state", { required: true });

const config = useAppConfig();

watch(() => [state.value.primaryColor, state.value.accentColor], ([primary, accent]) => {
  if (primary) {
    config.ui.colors.primary = colorLabel(primary).toLocaleLowerCase();
  }
  if (accent) {
    config.ui.colors.neutral = colorLabel(accent).toLocaleLowerCase();
  }
}, { immediate: true });

const formRef = useTemplateRef("formRef");

function onSubmit(_e: FormSubmitEvent<CompanyGeneralSettingsSchema>) {
  emit("save");
}
</script>

<template>
  <UForm
    ref="formRef"
    :loading="isSaving"
    :schema="companyGeneralSettingsSchema"
    :state
    class="space-y-6 mx-auto mt-4 max-w-5xl"
    @submit="onSubmit"
    @error="handleFormError"
  >
    <UCard
      :ui="{
        root: 'ring-default shadow-none', header: 'pb-4', body: 'pt-0' }"
    >
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
              Branding
            </p>

            <p class="mt-0.5 text-muted text-xs">
              Customize your company's visual identity
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
            placeholder="https://yourcompany.com/logo.png"
            icon="i-lucide-image"
            class="w-full"
          />
        </UFormField>

        <UFormField
          label="Favicon URL"
          name="faviconUrl"
          size="lg"
        >
          <UInput
            v-model="state.faviconUrl"
            placeholder="https://yourcompany.com/favicon.ico"
            icon="i-lucide-image"
            class="w-full"
          />
        </UFormField>

        <UFormField
          label="Website"
          name="companyWebsite"
          size="lg"
        >
          <UInput
            v-model="state.companyWebsite"
            placeholder="https://yourcompany.com"
            icon="i-lucide-globe"
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
            clear
            :placeholder="state.primaryColor ? colorLabel(state.primaryColor) : 'Select color'"
            class="w-full cursor-pointer"
            :ui="{
              item: 'cursor-pointer',
            }"
            @update:model-value="(val: string | undefined) => state.primaryColor = val ?? undefined"
          >
            <template #leading>
              <span
                class="border border-default rounded-full size-6 transition-colors shrink-0"
                :style="{ backgroundColor: state.primaryColor ?? 'transparent' }"
              />
            </template>

            <template #item="{ item }">
              <span
                class="border border-default rounded-full size-6 shrink-0"
                :style="{ backgroundColor: item.hex }"
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
            clear
            :placeholder="state.accentColor ? colorLabel(state.accentColor) : 'Select color'"
            class="w-full cursor-pointer"
            :ui="{
              item: 'cursor-pointer',
            }"
            @update:model-value="(val: string | undefined) => state.accentColor = val ?? undefined"
          >
            <template #leading>
              <span
                class="border border-default rounded-full size-6 transition-colors shrink-0"
                :style="{ backgroundColor: state.accentColor ?? 'transparent' }"
              />
            </template>

            <template #item="{ item }">
              <span
                class="border border-default rounded-full size-6 shrink-0"
                :style="{ backgroundColor: item.hex }"
              />

              <span class="ml-2 font-medium text-sm">{{ item.label }}</span>
            </template>
          </USelectMenu>
        </UFormField>
      </div>
    </UCard>

    <UCard
      :ui="{
        root: 'ring-default shadow-none',
        header: 'pb-4',
        body: 'pt-0',
      }"
    >
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
              Contact & Support
            </p>

            <p class="mt-0.5 text-muted text-xs">
              How customers and students can reach you
            </p>
          </div>
        </div>
      </template>

      <div class="gap-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <UFormField
          label="Support Email"
          name="supportEmail"
          size="lg"
        >
          <UInput
            v-model="state.supportEmail"
            type="email"
            placeholder="support@yourcompany.com"
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

        <UFormField
          label="Billing Email"
          name="billingEmail"
          size="lg"
        >
          <UInput
            v-model="state.billingEmail"
            type="email"
            placeholder="billing@yourcompany.com"
            icon="i-lucide-mail"
            class="w-full"
          />
        </UFormField>

        <UFormField
          label="Terms URL"
          name="termsUrl"
          size="lg"
        >
          <UInput
            v-model="state.termsUrl"
            placeholder="https://yourcompany.com/terms"
            icon="i-lucide-scroll-text"
            class="w-full"
          />
        </UFormField>

        <UFormField
          label="Privacy URL"
          name="privacyUrl"
          size="lg"
        >
          <UInput
            v-model="state.privacyUrl"
            placeholder="https://yourcompany.com/privacy"
            icon="i-lucide-shield"
            class="w-full"
          />
        </UFormField>
      </div>
    </UCard>

    <UCard
      :ui="{
        root: 'ring-default shadow-none',
        header: 'pb-4',
        body: 'pt-0',
      }"
    >
      <template #header>
        <div class="flex items-center gap-3">
          <div class="flex justify-center items-center bg-primary/10 p-2 rounded-lg">
            <UIcon
              name="i-lucide-file-text"
              class="size-5 text-primary"
            />
          </div>

          <div>
            <p class="font-semibold text-highlighted text-sm">
              Content & Messaging
            </p>

            <p class="mt-0.5 text-muted text-xs">
              Text shown on invoices and the student portal
            </p>
          </div>
        </div>
      </template>

      <div class="space-y-4">
        <UFormField
          label="Invoice Footer Text"
          name="invoiceFooterText"
          size="lg"
          hint="Shown at the bottom of every invoice"
        >
          <UTextarea
            v-model="state.invoiceFooterText"
            placeholder="Custom text shown at the bottom of every invoice…"
            class="w-full"
            :rows="3"
          />
        </UFormField>

        <UFormField
          label="Student Portal Welcome Message"
          name="studentPortalMessage"
          size="lg"
          hint="Displayed on the student dashboard"
        >
          <UTextarea
            v-model="state.studentPortalMessage"
            placeholder="A welcome message shown on the student dashboard…"
            class="w-full"
            :rows="3"
          />
        </UFormField>
      </div>
    </UCard>

    <div class="flex justify-end items-center gap-3 py-2">
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
