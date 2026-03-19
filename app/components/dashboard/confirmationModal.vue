<script setup lang="ts" generic="T">
import type { SelectMenuItem } from "@nuxt/ui";

import z from "zod";

const {
  title,
  description,
  confirmLabel,
  cancelLabel,
  confirmColor,
  isLoading,
  renderTrigger,
  showSelectMenu = false,
  selectMenuRequired = true,
  selectMenuValidation,
} = defineProps<{
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmColor?: "primary" | "error" | "warning" | "info" | "success" | "neutral";
  isLoading?: boolean | Ref<boolean>;
  renderTrigger?: boolean;
  body?: string;
  showSelectMenu?: boolean;
  selectMenuPlaceholder?: string;
  selectMenuIcon?: string;
  selectMenuRequired?: boolean;
  selectMenuOptions?: SelectMenuItem[];
  selectMenuValidation?: z.ZodType<T>;
}>();

const emit = defineEmits<{
  (e: "confirm", data?: { selectedValue?: T }): void;
  (e: "update:selectedValue", value: T): void;
}>();

const open = defineModel<boolean>("open");

const selectedValue = ref<T>();

const validationError = ref<string>();

const isLoadingValue = computed(() => unref(isLoading));

const confirmLabelProp = computed(() => confirmLabel ?? "Confirm");
const cancelLabelProp = computed(() => cancelLabel ?? "Cancel");
const confirmColorProp = computed(() => confirmColor ?? "error");
const renderTriggerProp = computed(() => (typeof renderTrigger === "boolean" ? renderTrigger : true));

const instance = getCurrentInstance();
const hasIsLoading = computed(() => {
  const vnodeProps = instance?.vnode?.props ?? {};
  const propKeys = Object.keys(vnodeProps).map(k => k.toLowerCase());
  const propSet = new Set(propKeys);
  return propSet.has("isloading") || propSet.has("is-loading");
});

const confirmButtonLabel = computed(() =>
  hasIsLoading.value && isLoadingValue.value ? (confirmLabel ?? "") : confirmLabelProp.value,
);

const defaultSchema = z.any().refine(v => v !== undefined && v !== null, "This field is required");

function validateSelectMenu() {
  if (!showSelectMenu || !selectMenuRequired) return true;

  try {
    validationError.value = undefined;
    const schema = selectMenuValidation ?? defaultSchema;
    schema.parse(selectedValue.value);
    return true;
  }
  catch (err) {
    if (err instanceof z.ZodError) validationError.value = err.issues[0]?.message;

    return false;
  }
}

watch(selectedValue, (newValue) => {
  if (validationError.value) {
    validateSelectMenu();
  }
  // Emit the update event
  emit("update:selectedValue", newValue as T);
});

function onConfirm(close?: () => void) {
  if (showSelectMenu && selectMenuRequired && !validateSelectMenu()) return;

  emit("confirm", { selectedValue: selectedValue.value });

  if (hasIsLoading.value) return;

  if (typeof close === "function") close();
  open.value = false;
}

function show() {
  open.value = true;
}
function hide() {
  open.value = false;
  validationError.value = undefined;
  selectedValue.value = undefined;
}
function toggle() {
  open.value = !open.value;
}

defineExpose({
  show,
  hide,
  toggle,
  open,
  selectedValue,
});
</script>

<template>
  <UModal
    v-model:open="open"
    :title="title ?? 'Confirm action'"
    :description="description ?? 'Are you sure you want to proceed with this action?'"
    :ui="{
      footer: 'justify-end',
      body: 'text-lg',
      overlay: 'backdrop-blur-sm',
    }"
  >
    <template v-if="renderTriggerProp">
      <slot
        name="trigger"
        :show
        :hide
        :toggle
      >
        <UButton
          label="Open"
          color="neutral"
          variant="subtle"
        />
      </slot>
    </template>

    <template #body>
      <slot>
        <!-- default message if no slot provided -->
        <p class="text-base">
          {{ body ?? "Are you sure you want to proceed with this action?" }}
        </p>
      </slot>

      <slot
        v-if="showSelectMenu && selectMenuOptions"
        name="custom"
      >
        <UFormField
          label="Select Academic Period"
          class="mt-4 w-[80%]"
          :required="selectMenuRequired"
          :error="validationError"
        >
          <USelectMenu
            v-model="selectedValue"
            :items="selectMenuOptions"
            :icon="selectMenuIcon ?? 'i-lucide-calendar-days'"
            clear
            value-key="value"
            size="lg"
            :placeholder="selectMenuPlaceholder ?? 'Select an option'"
            class="w-full cursor-pointer"
            :ui="{
              item: 'cursor-pointer',
            }"
          />
        </UFormField>
      </slot>
    </template>

    <template #footer="{ close }">
      <UButton
        :label="cancelLabelProp"
        color="neutral"
        variant="outline"
        class="cursor-pointer"
        :disabled="hasIsLoading && isLoadingValue"
        @click="open = false"
      />

      <UButton
        :label="confirmButtonLabel"
        :color="confirmColorProp"
        :loading="isLoadingValue"
        :disabled="hasIsLoading && isLoadingValue"
        class="ml-2 cursor-pointer"
        @click="onConfirm(close)"
      />
    </template>
  </UModal>
</template>
