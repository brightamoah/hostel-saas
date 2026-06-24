<script setup lang="ts">
type ModalType = "confirm" | "delete" | "warning" | "info" | "success";

interface Props {

  open?: boolean;
  dismissible?: boolean;

  type?: ModalType;
  title?: string;
  description?: string;
  icon?: string;

  confirmLabel?: string;
  confirmColor?: ColorType;
  confirmVariant?: VariantType;
  confirmSize?: SizeType;
  confirmIcon?: string;
  confirmLoading?: boolean;

  showCancel?: boolean;
  cancelLabel?: string;

  hideIcon?: boolean;
}

const {
  open = false,
  dismissible = true,
  type = "confirm",
  showCancel = true,
  cancelLabel = "Cancel",
  hideIcon = false,
  confirmLoading = false,
  title,
  description,
  icon,
  confirmLabel,
  confirmColor,
  confirmIcon,
  confirmSize = "lg",
} = defineProps<Props>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  "confirm": [];
  "cancel": [];
}>();

const typeConfig = computed(() => {
  switch (type) {
    case "delete":
      return {
        icon: "i-lucide-trash-2",
        iconClass: "text-error",
        title: "Delete Item",
        description: "Are you sure you want to delete this? This action cannot be undone.",
        confirmLabel: "Delete",
        confirmColor: "error" as const,
        confirmIcon: "i-lucide-trash-2",
      };
    case "warning":
      return {
        icon: "i-lucide-triangle-alert",
        iconClass: "text-warning",
        title: "Are you sure?",
        description: "This action may have unintended consequences. Please review before proceeding.",
        confirmLabel: "Proceed",
        confirmColor: "warning" as const,
        confirmIcon: "i-lucide-triangle-alert",
      };
    case "info":
      return {
        icon: "i-lucide-info",
        iconClass: "text-info",
        title: "Information",
        description: "Here is some important information for you.",
        confirmLabel: "Got it",
        confirmColor: "info" as const,
        confirmIcon: undefined,
      };
    case "success":
      return {
        icon: "i-lucide-circle-check-big",
        iconClass: "text-success",
        title: "Success!",
        description: "Your action was completed successfully.",
        confirmLabel: "Continue",
        confirmColor: "success" as const,
        confirmIcon: undefined,
      };
    default:
      return {
        icon: "i-lucide-circle-help",
        iconClass: "text-primary",
        title: "Confirm Action",
        description: "Are you sure you want to proceed?",
        confirmLabel: "Confirm",
        confirmColor: "primary" as const,
        confirmIcon: "i-lucide-circle-check-big",
      };
  }
});

const resolvedIcon = computed(() => icon ?? typeConfig.value.icon);
const resolvedTitle = computed(() => title ?? typeConfig.value.title);
const resolvedDescription = computed(() => description ?? typeConfig.value.description);
const resolvedConfirmLabel = computed(() => confirmLabel ?? typeConfig.value.confirmLabel);
const resolvedConfirmColor = computed(() => confirmColor ?? typeConfig.value.confirmColor);
const resolvedConfirmIcon = computed(() => confirmIcon ?? typeConfig.value.confirmIcon);
const resolvedIconClass = computed(() => typeConfig.value.iconClass);

function onConfirm() {
  emit("confirm");
}

function onCancel() {
  emit("update:open", false);
  emit("cancel");
}
</script>

<template>
  <UModal
    :open
    :dismissible
    :close="false"
    :ui="{
      footer: 'justify-end',
      content: 'max-w-md  rounded-lg shadow-lg ring ring-default overflow-hidden',
      title: 'font-newsreader text-xl font-semibold',
      close: 'cursor-pointer',
      overlay: 'backdrop-blur-sm',
    }"
    @update:open="$emit('update:open', $event)"
  >
    <slot />

    <template #content>
      <div class="flex flex-col items-center gap-4 p-6 text-center">
        <slot name="icon">
          <UIcon
            v-if="!hideIcon"
            :class="resolvedIconClass"
            :name="resolvedIcon"
            class="size-16"
          />
        </slot>

        <slot name="header">
          <div class="flex flex-col gap-1">
            <slot name="title">
              <p class="font-semibold text-highlighted text-xl">
                {{ resolvedTitle }}
              </p>
            </slot>

            <slot name="description">
              <p class="w-full max-w-sm text-muted text-base">
                {{ resolvedDescription }}
              </p>
            </slot>
          </div>
        </slot>

        <slot name="body" />

        <slot name="actions">
          <div class="flex justify-center items-center gap-3 mt-1 w-full max-w-xs">
            <UButton
              v-if="showCancel && type !== 'info' && type !== 'success'"
              :label="cancelLabel"
              :size="confirmSize"
              color="neutral"
              variant="outline"
              class="flex flex-1 justify-center-safe items-center text-center cursor-pointer"
              @click="onCancel"
            />

            <UButton
              :label="resolvedConfirmLabel"
              :color="resolvedConfirmColor"
              :size="confirmSize"
              variant="solid"
              class="flex justify-center-safe items-center text-center cursor-pointer"
              :leading-icon="resolvedConfirmIcon"
              :loading="confirmLoading"
              :class="(type === 'info' || type === 'success') ? 'w-full max-w-3xs' : 'flex-1'"
              @click="onConfirm"
            />
          </div>
        </slot>
      </div>
    </template>
  </UModal>
</template>
