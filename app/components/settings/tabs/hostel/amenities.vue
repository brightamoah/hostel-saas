<script setup lang="ts">
import type { FormErrorEvent, FormSubmitEvent } from "@nuxt/ui";

const { isSaving, handleFormError } = defineProps<{
  isSaving: boolean;
  handleFormError: (event: FormErrorEvent) => void;
}>();

const emit = defineEmits<{ save: [] }>();

const state = defineModel<Partial<HostelAmenitiesSchema>>("state", { required: true });

const AMENITY_OPTIONS: { label: string; value: string }[] = [
  { label: "CCTV / Security cameras", value: "CCTV" },
  { label: "24/7 Security", value: "24/7 Security" },
  { label: "Gym / Fitness center", value: "Gym" },
  { label: "Laundry room", value: "Laundry" },
  { label: "Swimming pool", value: "Pool" },
  { label: "Generator / Backup power", value: "Generator" },
  { label: "Water heater", value: "Water Heater" },
  { label: "Air conditioning", value: "Air Conditioning" },
  { label: "Study room", value: "Study Room" },
  { label: "Common room / Lounge", value: "Common Room" },
  { label: "Kitchen / Cooking area", value: "Kitchen" },
  { label: "Elevator", value: "Elevator" },
  { label: "Fire safety equipment", value: "Fire Safety" },
  { label: "Borehole / Water supply", value: "Borehole" },
  { label: "On-site canteen", value: "Canteen" },
];

const selected = computed({
  get: () => state.value.amenities ?? [],
  set: (val) => { state.value.amenities = val; },
});

function toggle(value: string) {
  const current = selected.value;
  if (current.includes(value)) {
    selected.value = current.filter(v => v !== value);
  }
  else {
    selected.value = [...current, value];
  }
}

function isSelected(value: string) {
  return selected.value.includes(value);
}

const customInput = ref("");

function addCustom() {
  const trimmed = customInput.value.trim();
  if (!trimmed || selected.value.includes(trimmed)) return;
  selected.value = [...selected.value, trimmed];
  customInput.value = "";
}

function removeAmenity(value: string) {
  selected.value = selected.value.filter(v => v !== value);
}

const customAmenities = computed(() =>
  selected.value.filter(v => !AMENITY_OPTIONS.find(o => o.value === v)),
);

function onSubmit(_e: FormSubmitEvent<HostelAmenitiesSchema>) {
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
    <UCard :ui="{ root: 'ring-default shadow-none' }">
      <template #header>
        <div class="flex justify-between items-center">
          <div class="flex items-center gap-3">
            <div class="flex justify-center items-center bg-primary/10 p-2 rounded-lg">
              <UIcon
                name="i-lucide-sparkles"
                class="size-5 text-primary"
              />
            </div>

            <div>
              <p class="font-semibold text-highlighted text-sm">
                Facilities & Amenities
              </p>

              <p class="mt-0.5 text-muted text-xs">
                Select all amenities available at this hostel
              </p>
            </div>
          </div>

          <UBadge
            :label="`${selected.length} selected`"
            color="primary"
            variant="subtle"
          />
        </div>
      </template>

      <!-- Predefined grid -->
      <div class="gap-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <button
          v-for="option in AMENITY_OPTIONS"
          :key="option.value"
          type="button"
          class="flex items-center gap-3 px-4 py-3 border rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary text-left transition-colors cursor-pointer"
          :class="isSelected(option.value)
            ? 'border-primary/50 bg-primary/8 text-primary'
            : 'border-default bg-transparent hover:bg-elevated/40 text-default'"
          @click="toggle(option.value)"
        >
          <UIcon
            :name="featureIconMap[option.value]"
            class="size-5 shrink-0"
            :class="isSelected(option.value) ? 'text-primary' : 'text-muted'"
          />

          <span class="font-medium text-sm leading-snug">{{ option.label }}</span>

          <UIcon
            v-if="isSelected(option.value)"
            name="i-lucide-check"
            class="ml-auto size-4 text-primary shrink-0"
          />
        </button>
      </div>

      <USeparator
        class="my-5"
        label="Custom amenities"
        :ui="{ label: 'text-sm text-muted' }"
      />

      <!-- Custom input -->
      <div class="flex gap-2.5 mb-4">
        <UInput
          v-model="customInput"
          placeholder="Add a custom amenity…"
          icon="i-lucide-plus"
          class="flex-1"
          @keydown.enter.prevent="addCustom"
        />

        <UButton
          label="Add"
          color="primary"
          variant="outline"
          :disabled="!customInput.trim()"
          class="cursor-pointer shrink-0"
          @click="addCustom"
        />
      </div>

      <!-- Custom amenity tags -->
      <div
        v-if="customAmenities.length"
        class="flex flex-wrap gap-2"
      >
        <UBadge
          v-for="amenity in customAmenities"
          :key="amenity"
          :label="amenity"
          :icon="featureIconMap[amenity]"
          color="primary"
          variant="subtle"
          size="lg"
          class="gap-1.5"
        >
          <template #trailing>
            <button
              type="button"
              class="flex justify-center items-center hover:text-error transition-colors cursor-pointer"
              @click="removeAmenity(amenity)"
            >
              <UIcon
                name="i-lucide-x"
                class="size-4"
              />
            </button>
          </template>
        </UBadge>
      </div>

      <div
        v-else-if="!selected.length"
        class="py-4 text-muted text-sm text-center"
      >
        No amenities selected yet
      </div>
    </UCard>

    <div class="flex justify-end py-2">
      <UButton
        type="submit"
        label="Save Amenities"
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
