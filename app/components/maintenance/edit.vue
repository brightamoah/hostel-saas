<script lang="ts" setup>
import type { FormErrorEvent, FormSubmitEvent } from "@nuxt/ui";

import z from "zod";

const { editMaintenanceState, clearState, editMaintenance } = defineProps<{
  editMaintenanceState: EditFormState;
  isLoading: boolean | Ref<boolean>;
  editMaintenance: (payload: FormSubmitEvent<EditFormState>) => Promise<void>;
  handleFormError: (event: FormErrorEvent) => void;
  clearState: () => void;
}>();

const {
  student,
} = useFetchStudentDashboardData();

const editMaintenanceFormRef = useTemplateRef("editMaintenanceFormRef");

const editState = ref<EditFormState>({
  ...editMaintenanceState,
  existingMedia: editMaintenanceState.existingMedia
    ? JSON.parse(JSON.stringify(editMaintenanceState.existingMedia))
    : [],
  mediaAttachments: undefined as File[] | undefined,
});

const frontendEditSchema = createMaintenanceSchema.extend({
  existingMedia: z.array(mediaAttachmentSchema).optional(),
});

async function handleEditMaintenance(payload: FormSubmitEvent<unknown>) {
  await editMaintenance(payload as FormSubmitEvent<EditFormState>);
}

onUnmounted(() => {
  clearState();
});
</script>

<template>
  <UModal
    title="Edit Maintenance Request"
    description="Modify the details of the maintenance request below."
    :dismissible="false"
    :ui="{
      footer: 'justify-end',
      content: 'max-w-3xl  rounded-lg shadow-lg ring ring-default overflow-hidden',
      title: 'font-newsreader text-xl font-semibold',
      close: 'cursor-pointer',
      overlay: 'backdrop-blur-sm',
    }"
  >
    <template #body>
      <MaintenanceForm
        ref="editMaintenanceFormRef"
        v-model:state="editState"
        :schema="frontendEditSchema"
        :student
        @submit="handleEditMaintenance"
        @error="handleFormError"
      />
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
          :label="isLoading ? 'Submitting...' : 'Submit'"
          color="primary"
          icon="i-lucide-send"
          class="cursor-pointer"
          :loading="unref(isLoading)"
          @click="editMaintenanceFormRef?.maintenanceForm?.submit()"
        />
      </div>
    </template>
  </UModal>
</template>

<style scoped>

</style>
