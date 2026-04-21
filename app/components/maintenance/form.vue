<script lang="ts" setup generic="T extends object">
import type { FormSubmitEvent } from "@nuxt/ui";
import type z from "zod";

import { capitalize } from "vue";

const { student } = defineProps<{
  student: DashboardStudent["student"];
  schema: z.ZodType<T>;
}>();

const emit = defineEmits<{
  submit: [payload: FormSubmitEvent<T>];
}>();

const state = defineModel<Partial<CreateMaintenanceSchema> & { existingMedia?: MediaAttachment[] }>("state", { required: true });

const issueTypes = computed(() => {
  const types = createMaintenanceSchema.shape.issueType.def.options[0].options.map(type => ({
    label: capitalize(type),
    value: type as CreateMaintenanceSchema["issueType"],
  }));
  return types;
});

const rooms = computed(() => student?.allocation?.room);

const roomOptions = computed(() => {
  const room = rooms.value;

  return room
    ? [{
        label: `${capitalize(room.hostel.name)} - Room ${room.roomNumber} (${getOrdinalString(room.floor)} Floor)`,
        value: room.id,
      }]
    : [];
});

const hostelOptions = computed(() => {
  const hostel = rooms.value?.hostel ? [rooms.value.hostel] : [];

  return hostel.length > 0
    ? hostel.map(h => ({
        label: capitalize(h.name),
        value: h.id,
      }))
    : [];
});

function removeExistingMedia(index: number) {
  if (state.value.existingMedia) {
    state.value.existingMedia.splice(index, 1);
  }
}

const priorityOptions = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
  { label: "Emergency", value: "emergency" },
];

watchEffect(() => {
  if (roomOptions.value.length === 1 && !state.value.roomId) state.value.roomId = roomOptions.value[0]?.value;

  if (hostelOptions.value.length === 1 && !state.value.hostelId) state.value.hostelId = hostelOptions.value[0]?.value;

  if (student?.id && !state.value.studentId) state.value.studentId = student.id;
});

const maintenanceForm = useTemplateRef("maintenanceForm");

defineExpose({
  maintenanceForm,
});
</script>

<template>
  <UForm
    ref="maintenanceForm"
    :state
    :schema
    @submit.prevent="(e) => emit('submit', e)"
  >
    <div class="flex md:flex-row flex-col justify-between gap-5 mb-4 px-4">
      <UFormField
        required
        label="Issue Type"
        name="issueType"
        class="w-full"
      >
        <USelectMenu
          v-model="state.issueType"
          :items="issueTypes"
          placeholder="Select issue type"
          value-key="value"
          class="w-full cursor-pointer"
          size="xl"
          clear
        />
      </UFormField>

      <UFormField
        required
        label="Room"
        name="roomId"
        class="w-full"
      >
        <USelectMenu
          v-model="state.roomId"
          :items="roomOptions"
          placeholder="Select room"
          class="w-full cursor-pointer"
          size="xl"
          value-key="value"
          clear
        />
      </UFormField>
    </div>

    <div class="flex md:flex-row flex-col justify-between gap-5 mb-4 px-4">
      <UFormField
        required
        label="Hostel"
        name="hostelId"
        class="w-full"
      >
        <USelectMenu
          v-model="state.hostelId"
          :items="hostelOptions"
          placeholder="Select Hostel"
          class="w-full cursor-pointer"
          size="xl"
          value-key="value"
          clear
        />
      </UFormField>

      <UFormField
        required
        label="Priority"
        name="priority"
        class="w-full"
      >
        <USelectMenu
          v-model="state.priority"
          :items="priorityOptions"
          placeholder="Select Priority"
          class="w-full cursor-pointer"
          size="xl"
          value-key="value"
          clear
        />
      </UFormField>
    </div>

    <UFormField
      required
      label="Description"
      name="description"
      class="gap-5 mb-4 px-4 w-full"
    >
      <UTextarea
        v-model="state.description"
        placeholder="Describe the issue in detail"
        class="w-full"
        size="xl"
        :rows="4"
      />
    </UFormField>

    <div
      v-if="state.existingMedia?.length"
      class="mb-4 px-4"
    >
      <p class="mb-2 font-medium text-highlighted text-sm">
        Existing Attachments
      </p>

      <div class="flex flex-wrap gap-4">
        <div
          v-for="(media, index) in state.existingMedia"
          :key="media.url"
          class="group relative flex-none p-0 border border-default rounded-lg size-24 overflow-hidden"
        >
          <img
            v-if="media.type === 'image'"
            :src="media.url"
            class="w-full h-full object-cover"
          >

          <video
            v-else-if="media.type === 'video'"
            :src="media.url"
            class="w-full h-full object-cover"
            autoplay
            muted
            loop
            playsinline
          />

          <div class="bottom-0 absolute inset-x-0 bg-black/60 backdrop-blur-sm py-0.5 font-medium text-[10px] text-white text-center uppercase tracking-wider">
            {{ media.name.split('.').pop() }}
          </div>

          <UButton
            icon="i-lucide-x"
            size="xs"
            color="error"
            variant="solid"
            class="top-1 right-1 z-20 absolute flex justify-center items-center opacity-0 group-hover:opacity-100 shadow-sm p-0 rounded-full size-6 transition-opacity cursor-pointer"
            @click.stop.prevent="removeExistingMedia(index)"
          />
        </div>
      </div>
    </div>

    <UFormField
      label="Media Attachments"
      name="mediaAttachments"
      class="gap-5 mb-2 px-4 w-full"
    >
      <AppMediaUpload
        v-model="state.mediaAttachments"
        :max-files="3 - (state.existingMedia?.length || 0)"
      />
    </UFormField>
  </UForm>
</template>

<style scoped>

</style>
