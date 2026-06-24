<script setup lang="ts">
import type { DateValue } from "@internationalized/date";

interface Props {
  size?: SizeType;
  buttonSize?: SizeType;
  min?: DateValue;
  max?: DateValue;
  range?: boolean;
}

const {
  range = false,
  min,
  max,
  size,
  buttonSize,
} = defineProps<Props>();

const isMobile = inject("isMobile", computed(() => false)) as ComputedRef<boolean>;

const computedSize = computed(() => size ?? (isMobile.value ? 'lg' : 'xl'));
const computedButtonSize = computed(() => buttonSize ?? (isMobile.value ? 'sm' : 'md'));

const modelValue = defineModel<DateModel>("date");
</script>

<template>
  <UInputDate
    v-model="modelValue"
    :min-value="min"
    :max-value="max"
    :size="computedSize"
    :range
    class="w-full"
  >
    <template #trailing>
      <UPopover>
        <UButton
          color="neutral"
          variant="link"
          :size="computedButtonSize"
          icon="i-lucide-calendar-days"
          aria-label="Select a date"
          class="px-0 cursor-pointer"
        />

        <template #content>
          <UCalendar
            v-model="modelValue"
            :min-value="min"
            :max-value="max"
            :range
            :number-of-months="range ? 2 : 1"
            class="p-2"
          />
        </template>
      </UPopover>
    </template>
  </UInputDate>
</template>

<style scoped>

</style>
