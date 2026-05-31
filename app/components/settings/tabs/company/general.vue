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

const logoInputRef = useTemplateRef("logoInputRef");
const faviconInputRef = useTemplateRef("faviconInputRef");

const logoFile = ref<any>(null);
const faviconFile = ref<any>(null);
const isUploading = ref(false);

function getFirstFile(val: any): File | null {
  if (!val) return null;
  if (val instanceof File) return val;
  if (Array.isArray(val) && val.length > 0) return val[0];
  if (val.length > 0) return val[0];
  return null;
}

const logoPreviewUrl = computed(() => {
  const file = getFirstFile(logoFile.value);
  if (file) {
    return URL.createObjectURL(file);
  }
  return state.value.logoUrl;
});

const faviconPreviewUrl = computed(() => {
  const file = getFirstFile(faviconFile.value);
  if (file) {
    return URL.createObjectURL(file);
  }
  return state.value.faviconUrl;
});

const initialState = ref(JSON.stringify(state.value));
const isDirty = computed(() => {
  return JSON.stringify(state.value) !== initialState.value || !!getFirstFile(logoFile.value) || !!getFirstFile(faviconFile.value);
});

async function onSubmit(_e: FormSubmitEvent<CompanyGeneralSettingsSchema>) {
  isUploading.value = true;
  try {
    const { $apiFetch } = useNuxtApp();

    const firstLogo = getFirstFile(logoFile.value);
    if (firstLogo) {
      const oldUrl = state.value.logoUrl;
      const formData = new FormData();
      formData.append("file", firstLogo, firstLogo.name);
      formData.append("folder", "company");
      const res = await $apiFetch("/api/upload/image", {
        method: "POST",
        body: formData,
      });
      state.value.logoUrl = res.url;

      if (oldUrl) {
        try {
          let key = "";
          if (oldUrl.startsWith("http")) {
            const urlObj = new URL(oldUrl);
            key = urlObj.pathname.slice(1);
          }
          else if (oldUrl.startsWith("/api/images/")) {
            key = oldUrl.replace("/api/images/", "");
          }
          if (key) {
            await $apiFetch("/api/upload/image", { method: "DELETE", body: { key } });
          }
        }
        catch (e) {
          console.error("Failed to delete old logo", e);
        }
      }
    }

    const firstFavicon = getFirstFile(faviconFile.value);
    if (firstFavicon) {
      const oldUrl = state.value.faviconUrl;
      const formData = new FormData();
      formData.append("file", firstFavicon, firstFavicon.name);
      formData.append("folder", "company-favicons");
      const res = await $apiFetch("/api/upload/image", { method: "POST", body: formData });
      state.value.faviconUrl = res.url;

      if (oldUrl) {
        try {
          let key = "";
          if (oldUrl.startsWith("http")) {
            const urlObj = new URL(oldUrl);
            key = urlObj.pathname.slice(1);
          }
          else if (oldUrl.startsWith("/api/images/")) {
            key = oldUrl.replace("/api/images/", "");
          }
          if (key) {
            await $apiFetch("/api/upload/image", { method: "DELETE", body: { key } });
          }
        }
        catch (e) {
          console.error("Failed to delete old favicon", e);
        }
      }
    }

    initialState.value = JSON.stringify(state.value);
    logoFile.value = null;
    faviconFile.value = null;

    emit("save");
  }
  catch (error) {
    console.error("Upload failed", error);
  }
  finally {
    isUploading.value = false;
  }
}
</script>

<template>
  <UForm
    ref="formRef"
    :loading="isSaving || isUploading"
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
            @update:model-value="(val: string | null) => state.primaryColor = val ?? undefined"
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
            @update:model-value="(val: string | null) => state.accentColor = val ?? undefined"
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
          label="Logo"
          name="logoUrl"
          size="lg"
          class="sm:col-span-2 lg:col-span-1"
        >
          <div
            class="group relative w-full h-36 rounded-xl border-2 border-dashed border-muted overflow-hidden cursor-pointer"
            @click="logoInputRef?.open()"
          >
            <NuxtImg
              v-if="logoPreviewUrl"
              :src="logoPreviewUrl"
              class="w-full h-full object-contain"
            />

            <div
              v-else
              class="w-full h-full flex flex-col items-center justify-center bg-muted/10"
            >
              <UIcon
                name="i-lucide-image"
                class="size-8 text-muted"
              />

              <span class="text-muted text-xs mt-2 font-medium">Upload Logo</span>
            </div>

            <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
              <UIcon
                name="i-lucide-image-up"
                class="size-6 text-white"
              />

              <span class="text-white text-xs font-medium">{{ logoPreviewUrl ? 'Change Logo' : 'Upload Logo' }}</span>
            </div>
          </div>

          <AppMediaUpload
            ref="logoInputRef"
            v-model="logoFile"
            description="Upload company logo"
            accept="image/*"
            :max-files="1"
            class="hidden"
          />
        </UFormField>

        <UFormField
          label="Favicon"
          name="faviconUrl"
          size="lg"
        >
          <div
            class="group relative w-full h-36 rounded-xl border-2 border-dashed border-muted overflow-hidden cursor-pointer"
            @click="faviconInputRef?.open()"
          >
            <img
              v-if="faviconPreviewUrl"
              :src="faviconPreviewUrl"
              class="w-full h-full object-contain"
            >

            <div
              v-else
              class="w-full h-full flex flex-col items-center justify-center bg-muted/10"
            >
              <UIcon
                name="i-lucide-image"
                class="size-8 text-muted"
              />

              <span class="text-muted text-xs mt-2 font-medium">Upload Favicon</span>
            </div>

            <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
              <UIcon
                name="i-lucide-image-up"
                class="size-6 text-white"
              />

              <span class="text-white text-xs font-medium">{{ faviconPreviewUrl ? 'Change Favicon' : 'Upload Favicon' }}</span>
            </div>
          </div>

          <AppMediaUpload
            ref="faviconInputRef"
            v-model="faviconFile"
            description="Upload favicon"
            accept="image/*"
            :max-files="1"
            class="hidden"
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
        :label="isDirty ? 'Update' : 'Save Changes'"
        icon="i-lucide-save"
        color="primary"
        size="lg"
        :loading="isSaving || isUploading"
        class="cursor-pointer"
      />
    </div>
  </UForm>
</template>
