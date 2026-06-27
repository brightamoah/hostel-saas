<script lang="ts" setup>
const {
  isOpen,
  isSaving,
} = defineProps<{
  isOpen: boolean;
  isSaving: boolean;
}>();

const emit = defineEmits<{
  "update:isOpen": [value: boolean];
  "save": [payload: { title: string; description: string }];
}>();

const saveForm = ref({ title: "", description: "" });

// Reset form when modal opens
watch(() => isOpen, (newVal) => {
  if (newVal) {
    saveForm.value = { title: "", description: "" };
  }
});

function handleSave() {
  emit("save", saveForm.value);
}
</script>

<template>
  <UModal
    :open="isOpen"
    title="Save Report Template"
    description="Give your report configuration a name so you can quickly run it again later."
    :ui="{
      footer: 'justify-end',
      content: 'rounded-xl shadow-xl ring ring-default overflow-hidden',
      title: 'font-semibold text-base',
      close: 'cursor-pointer',
      overlay: 'backdrop-blur-sm',
    }"
    @update:open="emit('update:isOpen', $event)"
  >
    <template #body>
      <div class="space-y-4 w-full">
        <UFormField
          label="Title"
          required
          class="w-full"
        >
          <UInput
            v-model="saveForm.title"
            placeholder="e.g. Monthly Room Revenue"
            class="w-full"
            auto-focus
          />
        </UFormField>

        <UFormField
          label="Description"
          class="w-full"
        >
          <UTextarea
            v-model="saveForm.description"
            placeholder="Optional description of what this report is for"
            class="w-full"
          />
        </UFormField>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton
          label="Cancel"
          color="neutral"
          variant="ghost"
          @click="emit('update:isOpen', false)"
        />

        <UButton
          label="Save Template"
          color="primary"
          :loading="isSaving"
          :disabled="!saveForm.title"
          @click="handleSave"
        />
      </div>
    </template>
  </UModal>
</template>
