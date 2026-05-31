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

const logoFile = ref<any>(null);
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

const initialState = ref(JSON.stringify(state.value));
const isDirty = computed(() => {
  return JSON.stringify(state.value) !== initialState.value || !!getFirstFile(logoFile.value);
});

async function onSubmit(_e: FormSubmitEvent<HostelBrandingSchema>) {
  isUploading.value = true;
  try {
    const { $apiFetch } = useNuxtApp();

    const firstLogo = getFirstFile(logoFile.value);
    if (firstLogo) {
      const oldUrl = state.value.logoUrl;

      const formData = new FormData();
      formData.append("file", firstLogo, firstLogo.name);
      formData.append("folder", "hostel-logos");
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
            await $apiFetch("/api/upload/image", {
              method: "DELETE",
              body: { key },
            });
          }
        }
        catch (e) {
          console.error("Failed to delete old logo", e);
        }
      }
    }

    initialState.value = JSON.stringify(state.value);
    logoFile.value = null;

    emit("save");
  }
  catch (error) {
    console.error("Upload failed", error);
  }
  finally {
    isUploading.value = false;
  }
}

const logoInputRef = useTemplateRef("logoInputRef");
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
            description="Upload hostel logo"
            accept="image/*"
            :max-files="1"
            class="hidden"
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
            @update:model-value="state.primaryColor = $event ?? undefined"
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
            clear
            :placeholder="state.accentColor ? colorLabel(state.accentColor) : 'Select color'"
            class="w-full cursor-pointer"
            @update:model-value="state.accentColor = $event ?? undefined"
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

<style scoped></style>
