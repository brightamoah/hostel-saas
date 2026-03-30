<script setup lang="ts">
const { $handleFormError } = useNuxtApp();

const companyStore = useCompanyStore();

const {
  createHostelState,
  isLoading,
  isUploading,
} = storeToRefs(companyStore);

const {
  copyJoinCode,
  createHostel,
  removeStandaloneHostelLogo,
  regenerateStandaloneJoinCode,
} = companyStore;

const hostelFormRef = useTemplateRef("hostelFormRef");
</script>

<template>
  <UModal
    title="Create New Hostel"
    description="Fill in the details below to create a new hostel in the system."
    class="w-[70%]"
    :dismissible="false"
    :ui="{
      footer: 'justify-end',
      content: 'md:w-[70%] max-w-3xl  rounded-lg shadow-lg ring ring-default overflow-hidden',
      title: 'font-newsreader text-xl font-semibold',
      close: 'cursor-pointer',
      overlay: 'backdrop-blur-sm',
    }"
  >
    <UButton
      label="New Hostel"
      icon="i-lucide-building-2"
      size="lg"
      variant="subtle"
      class="justify-center items-center w-full sm:w-auto cursor-pointer"
    />

    <template #body>
      <UForm
        ref="hostelFormRef"
        :state="createHostelState"
        :schema="hostelDetailsSchema"
        @submit.prevent="createHostel"
        @error="$handleFormError"
      >
        <CompanyHostelForm
          v-model:name="createHostelState.name"
          v-model:slug="createHostelState.slug"
          v-model:support-email="createHostelState.supportEmail"
          v-model:support-phone="createHostelState.supportPhone"
          v-model:join-code="createHostelState.joinCode"
          v-model:address="createHostelState.address"
          v-model:logo-file="createHostelState.logo"
          :is-loading
          :is-uploading
          :copy-join-code="() => copyJoinCode"
          :remove-hostel-logo="removeStandaloneHostelLogo"
          :regenerate-join-code="regenerateStandaloneJoinCode"
        />
      </UForm>
    </template>

    <template #footer="{ close }">
      <div class="flex gap-2.5">
        <UButton
          label="Cancel"
          color="error"
          variant="outline"
          class="cursor-pointer"
          @click="close"
        />

        <UButton
          color="primary"
          icon="i-lucide-send"
          class="cursor-pointer"
          :label=" isLoading ? 'Submitting...' : 'Create Hostel'"
          :loading="isLoading"
          @click="hostelFormRef?.submit()"
        />
      </div>
    </template>
  </UModal>
</template>

<style scoped>

</style>
