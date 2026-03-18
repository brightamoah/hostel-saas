<script lang="ts" setup>
defineProps<{
  isLoading?: boolean;
  isUploading?: boolean;
  removeHostelLogo: () => void;
  regenerateJoinCode: () => void;
  copyJoinCode: () => void;
}>();

const name = defineModel<string | undefined>("name", { default: "", required: true });
const slug = defineModel<string | undefined>("slug", { default: "", required: true });
const supportEmail = defineModel<string | undefined>("supportEmail", { default: "", required: true });
const supportPhone = defineModel<string | undefined>("supportPhone", { default: "", required: true });
const joinCode = defineModel<string | undefined>("joinCode", { default: "", required: true });
const address = defineModel<string | undefined>("address", { default: "", required: true });
const logoFile = defineModel<File | null>("logoFile", { default: null });

const isMobile = inject(isMobileKey) as ComputedRef<boolean>;
</script>

<template>
  <div class="gap-5 grid grid-cols-1 md:grid-cols-2">
    <UFormField
      label="Hostel Name"
      name="hostelName"
      class="w-full"
    >
      <UInput
        v-model="name"
        placeholder="e.g. Kings Hostel - Accra"
        icon="i-lucide-home"
        class="w-full"
        :size="isMobile ? 'lg' : 'xl'"
      />
    </UFormField>

    <UFormField
      label="Hostel Slug"
      name="hostelSlug"
      class="w-full"
    >
      <UInput
        v-model="slug"
        placeholder="e.g. kings-hostel-accra"
        icon="i-lucide-hash"
        class="w-full"
        :size="isMobile ? 'lg' : 'xl'"
      />

      <template #help>
        <span class="text-muted text-xs">
          Portal: <span class="font-mono">/h/{{ slug || "your-hostel" }}</span>
        </span>
      </template>
    </UFormField>

    <UFormField
      label="Hostel Support Email"
      name="supportEmail"
      class="w-full"
    >
      <UInput
        v-model="supportEmail"
        placeholder="e.g. support@kingshostel.com"
        icon="i-lucide-mail"
        class="w-full"
        :size="isMobile ? 'lg' : 'xl'"
        @update:model-value="supportEmail = $event"
      />
    </UFormField>

    <UFormField
      label="Hostel Support Phone Number"
      name="supportPhone"
      class="w-full"
    >
      <UInput
        v-model="supportPhone"
        placeholder="e.g. +233 55 000 0000"
        icon="i-lucide-phone"
        class="w-full"
        type="tel"
        :size="isMobile ? 'lg' : 'xl'"
      />
    </UFormField>

    <div class="flex flex-col gap-3">
      <UFormField
        label="Hostel Join Code"
        name="joinCode"
        class="w-full"
      >
        <div class="flex gap-2">
          <UInput
            v-model="joinCode"
            placeholder="e.g. KINGS2024"
            icon="i-lucide-key-round"
            class="flex-1 font-mono uppercase tracking-wider"
            :size="isMobile ? 'lg' : 'xl'"
            maxlength="10"
          />

          <UTooltip text="Regenerate code">
            <UButton
              type="button"
              variant="outline"
              color="neutral"
              icon="i-lucide-refresh-cw"
              :size="isMobile ? 'lg' : 'xl'"
              class="cursor-pointer"
              @click="regenerateJoinCode"
            />
          </UTooltip>

          <UTooltip text="Copy code">
            <UButton
              type="button"
              variant="outline"
              color="neutral"
              icon="i-lucide-copy"
              :size="isMobile ? 'lg' : 'xl'"
              class="cursor-pointer"
              :disabled="!joinCode"
              @click="copyJoinCode"
            />
          </UTooltip>
        </div>

        <template #help>
          <span class="text-muted text-xs">
            Students use this code to join your hostel.
          </span>
        </template>
      </UFormField>

      <UFormField
        label="Hostel Address"
        name="hostelAddress"
        class="w-full"
      >
        <UTextarea
          v-model="address"
          placeholder="e.g. 123 Main St, Accra"
          icon="i-lucide-map-pin"
          class="w-full"
          :size="isMobile ? 'lg' : 'xl'"
          :rows="3"
        />
      </UFormField>
    </div>

    <UFormField
      label="Hostel Logo / Image"
      name="hostelLogo"
      class="w-full"
    >
      <UFileUpload
        v-model="logoFile"
        icon="i-lucide-image"
        label="Drop your hostel Logo or image"
        description="SVG, PNG, JPG or GIF (max. 2MB)"
        class="w-full min-h-43"
        accept="image/png, image/jpeg, image/webp, image/jpg"
        :interactive="false"
        :disabled="isUploading || isLoading"
        :file-delete="{
          class: 'cursor-pointer hover:bg-error hover:text-white rounded size-5 hover:border-error text-center font-bold',
          onClick: removeHostelLogo,
        }"
        :ui="{
          base: 'border-3 border-muted rounded-md p-4 cursor-pointer',
        }"
      >
        <template #actions="{ open }">
          <UButton
            label="Select From Your Device"
            icon="i-lucide-upload"
            color="neutral"
            variant="outline"
            class="cursor-pointer"
            :disabled="isUploading || isLoading"
            @click="open()"
          />
        </template>
      </UFileUpload>
    </UFormField>
  </div>
</template>

<style scoped>

</style>
