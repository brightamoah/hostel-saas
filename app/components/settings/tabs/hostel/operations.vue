<script setup lang="ts">
import type { FormErrorEvent, FormSubmitEvent } from "@nuxt/ui";

const { isSaving, handleFormError } = defineProps<{
  isSaving: boolean;
  handleFormError: (event: FormErrorEvent) => void;
}>();

const emit = defineEmits<{ save: [] }>();

const state = defineModel<Partial<HostelOperationsSchema>>("state", { required: true });

function onSubmit(_e: FormSubmitEvent<HostelOperationsSchema>) {
  emit("save");
}
</script>

<template>
  <UForm
    :state
    class="space-y-6 mx-auto max-w-5xl"
    @submit="onSubmit"
    @error="handleFormError"
  >
    <!-- Check-in / Check-out -->
    <UCard :ui="{ root: 'ring-default shadow-none', header: 'pb-4', body: 'pt-0' }">
      <template #header>
        <div class="flex items-center gap-3">
          <div class="flex justify-center items-center bg-primary/10 p-2 rounded-lg">
            <UIcon
              name="i-lucide-calendar-clock"
              class="size-5 text-primary"
            />
          </div>

          <div>
            <p class="font-semibold text-highlighted text-sm">
              Check-in & Check-out
            </p>

            <p class="mt-0.5 text-muted text-xs">
              Standard times displayed to students on the portal
            </p>
          </div>
        </div>
      </template>

      <div class="gap-4 grid grid-cols-1 sm:grid-cols-2">
        <UFormField
          label="Check-in Time"
          name="checkInTime"
          size="lg"
        >
          <AppTimePicker
            v-model="state.checkInTime"
            icon="i-lucide-log-in"
            :hour-cycle="24"
            size="lg"
            class="w-full"
          />
        </UFormField>

        <UFormField
          label="Check-out Time"
          name="checkOutTime"
          size="lg"
        >
          <AppTimePicker
            v-model="state.checkOutTime"
            icon="i-lucide-log-out"
            :hour-cycle="24"
            size="lg"
            class="w-full"
          />
        </UFormField>
      </div>
    </UCard>

    <!-- Amenities (WiFi + Parking) -->
    <UCard :ui="{ root: 'ring-default shadow-none', header: 'pb-4', body: 'pt-0' }">
      <template #header>
        <div class="flex items-center gap-3">
          <div class="flex justify-center items-center bg-primary/10 p-2 rounded-lg">
            <UIcon
              name="i-lucide-building-2"
              class="size-5 text-primary"
            />
          </div>

          <div>
            <p class="font-semibold text-highlighted text-sm">
              Amenities
            </p>

            <p class="mt-0.5 text-muted text-xs">
              Availability and details shown to students
            </p>
          </div>
        </div>
      </template>

      <div class="space-y-4">
        <!-- WiFi -->
        <div
          class="border border-default rounded-lg overflow-hidden transition-colors"
          :class="state.wifiAvailable ? 'border-primary/30' : ''"
        >
          <div
            class="flex justify-between items-center gap-4 px-4 py-3 transition-colors"
            :class="state.wifiAvailable ? 'bg-primary/5' : 'bg-muted/30'"
          >
            <div class="flex items-center gap-3">
              <UIcon
                name="i-lucide-wifi"
                class="size-4 transition-colors shrink-0"
                :class="state.wifiAvailable ? 'text-primary' : 'text-muted'"
              />

              <div>
                <p class="font-medium text-highlighted text-sm">
                  WiFi
                </p>

                <p class="text-muted text-xs">
                  Connection details shown to students
                </p>
              </div>
            </div>

            <USwitch
              v-model="state.wifiAvailable"
              :ui="{ base: 'cursor-pointer' }"
            />
          </div>

          <Transition
            enter-active-class="transition-all duration-200 ease-out"
            enter-from-class="opacity-0 -translate-y-1"
            enter-to-class="opacity-100 translate-y-0"
            leave-active-class="transition-all duration-150 ease-in"
            leave-from-class="opacity-100 translate-y-0"
            leave-to-class="opacity-0 -translate-y-1"
          >
            <div
              v-if="state.wifiAvailable"
              class="px-4 pt-3 pb-4 border-default border-t"
            >
              <UFormField
                name="wifiDetails"
                size="lg"
                hint="SSID, password, or connection instructions"
              >
                <UTextarea
                  v-model="state.wifiDetails"
                  placeholder="Network: HostelNet_5G&#10;Password: welcome2024&#10;Contact reception if you have issues."
                  :rows="3"
                  class="w-full"
                />
              </UFormField>
            </div>
          </Transition>
        </div>

        <!-- Parking -->
        <div
          class="border border-default rounded-lg overflow-hidden transition-colors"
          :class="state.parkingAvailable ? 'border-primary/30' : ''"
        >
          <div
            class="flex justify-between items-center gap-4 px-4 py-3 transition-colors"
            :class="state.parkingAvailable ? 'bg-primary/5' : 'bg-muted/30'"
          >
            <div class="flex items-center gap-3">
              <UIcon
                name="i-lucide-car"
                class="size-4 transition-colors shrink-0"
                :class="state.parkingAvailable ? 'text-primary' : 'text-muted'"
              />

              <div>
                <p class="font-medium text-highlighted text-sm">
                  Parking
                </p>

                <p class="text-muted text-xs">
                  Availability and access instructions
                </p>
              </div>
            </div>

            <USwitch
              v-model="state.parkingAvailable"
              :ui="{ base: 'cursor-pointer' }"
            />
          </div>

          <Transition
            enter-active-class="transition-all duration-200 ease-out"
            enter-from-class="opacity-0 -translate-y-1"
            enter-to-class="opacity-100 translate-y-0"
            leave-active-class="transition-all duration-150 ease-in"
            leave-from-class="opacity-100 translate-y-0"
            leave-to-class="opacity-0 -translate-y-1"
          >
            <div
              v-if="state.parkingAvailable"
              class="px-4 pt-3 pb-4 border-default border-t"
            >
              <UFormField
                name="parkingDetails"
                size="lg"
                hint="Location, capacity, or access instructions"
              >
                <UTextarea
                  v-model="state.parkingDetails"
                  placeholder="Free parking available behind Block B. Capacity: 20 vehicles. Students must register their plate at reception."
                  :rows="3"
                  class="w-full"
                />
              </UFormField>
            </div>
          </Transition>
        </div>
      </div>
    </UCard>

    <div class="flex justify-end pb-2">
      <UButton
        type="submit"
        label="Save Operations"
        icon="i-lucide-save"
        color="primary"
        size="lg"
        :loading="isSaving"
        class="cursor-pointer"
      />
    </div>
  </UForm>
</template>
