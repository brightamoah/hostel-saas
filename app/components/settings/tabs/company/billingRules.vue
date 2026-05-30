<script setup lang="ts">
import type { FormErrorEvent, FormSubmitEvent } from "@nuxt/ui";

const { isSaving, handleFormError } = defineProps<{
  isSaving: boolean;
  handleFormError: (event: FormErrorEvent) => void;
}>();

const emit = defineEmits<{ save: [] }>();

const state = defineModel<Partial<CompanyBillingSettingsSchema>>("state", { required: true });

const formRef = useTemplateRef("formRef");

const lateFeeTypeOptions = [
  { label: "Flat Amount", value: "flat" },
  { label: "Percentage", value: "percent" },
];

function onSubmit(_e: FormSubmitEvent<CompanyBillingSettingsSchema>) {
  emit("save");
}
</script>

<template>
  <UForm
    ref="formRef"
    :state
    :schema="companyBillingSettingsSchema"
    class="space-y-6 mx-auto mt-6 max-w-4xl"
    @submit="onSubmit"
    @error="handleFormError"
  >
    <!-- Late Fees -->
    <UCard :ui="{ root: 'ring-default shadow-none', header: 'pb-4', body: 'pt-0' }">
      <template #header>
        <div class="flex items-center gap-3">
          <div class="flex justify-center items-center bg-primary/10 p-2 rounded-lg">
            <UIcon
              name="i-lucide-clock-alert"
              class="size-5 text-primary"
            />
          </div>

          <div>
            <p class="font-semibold text-highlighted text-sm">
              Late Fees
            </p>

            <p class="mt-0.5 text-muted text-xs">
              Automatically penalise overdue payments after a grace period
            </p>
          </div>
        </div>
      </template>

      <div class="space-y-4">
        <UFormField name="lateFeeEnabled">
          <div class="flex justify-between items-center gap-4 bg-muted/30 p-4 border border-default rounded-lg">
            <div>
              <p class="font-medium text-highlighted text-sm">
                Enable Late Fees
              </p>

              <p class="mt-0.5 text-muted text-xs">
                Automatically apply a late fee after the grace period expires.
              </p>
            </div>

            <USwitch
              v-model="state.lateFeeEnabled"
              :ui="{ base: 'cursor-pointer' }"
            />
          </div>
        </UFormField>

        <Transition
          enter-active-class="transition-all duration-200 ease-out"
          enter-from-class="opacity-0 -translate-y-1"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition-all duration-150 ease-in"
          leave-from-class="opacity-100 translate-y-0"
          leave-to-class="opacity-0 -translate-y-1"
        >
          <div
            v-if="state.lateFeeEnabled"
            class="gap-4 grid grid-cols-1 sm:grid-cols-3"
          >
            <UFormField
              label="Fee Type"
              name="lateFeeType"
              size="lg"
              required
            >
              <USelectMenu
                v-model="state.lateFeeType"
                :items="lateFeeTypeOptions"
                value-key="value"
                class="w-full cursor-pointer"
              />
            </UFormField>

            <UFormField
              :label="state.lateFeeType === 'percent' ? 'Fee Percentage' : 'Fee Amount'"
              name="lateFeeValue"
              size="lg"
              required
            >
              <UInput
                v-model.number="state.lateFeeValue"
                type="number"
                min="0"
                class="w-full"
              >
                <template #trailing>
                  <span class="font-medium text-muted text-sm">
                    {{ state.lateFeeType === 'percent' ? '%' : 'GHS' }}
                  </span>
                </template>
              </UInput>
            </UFormField>

            <UFormField
              label="Grace Period"
              name="lateFeeGracePeriodDays"
              size="lg"
              required
            >
              <UInput
                v-model.number="state.lateFeeGracePeriodDays"
                type="number"
                min="0"
                class="w-full"
              >
                <template #trailing>
                  <span class="font-medium text-muted text-sm">days</span>
                </template>
              </UInput>
            </UFormField>
          </div>
        </Transition>
      </div>
    </UCard>

    <!-- Invoices -->
    <UCard :ui="{ root: 'ring-default shadow-none', header: 'pb-4', body: 'pt-0' }">
      <template #header>
        <div class="flex items-center gap-3">
          <div class="flex justify-center items-center bg-primary/10 p-2 rounded-lg">
            <UIcon
              name="i-lucide-receipt"
              class="size-5 text-primary"
            />
          </div>

          <div>
            <p class="font-semibold text-highlighted text-sm">
              Invoices
            </p>

            <p class="mt-0.5 text-muted text-xs">
              Control how and when invoices are sent to students
            </p>
          </div>
        </div>
      </template>

      <div class="space-y-4">
        <UFormField name="autoSendInvoices">
          <div class="flex justify-between items-center gap-4 bg-muted/30 p-4 border border-default rounded-lg">
            <div>
              <p class="font-medium text-highlighted text-sm">
                Auto-send Invoices
              </p>

              <p class="mt-0.5 text-muted text-xs">
                Email invoices to students automatically when created.
              </p>
            </div>

            <USwitch
              v-model="state.autoSendInvoices"
              :ui="{ base: 'cursor-pointer' }"
            />
          </div>
        </UFormField>

        <UFormField
          label="Invoice Due Days"
          name="invoiceDueDays"
          size="lg"
          required
        >
          <UInput
            v-model.number="state.invoiceDueDays"
            type="number"
            min="1"
            max="365"
            icon="i-lucide-calendar-clock"
            class="w-full max-w-xs"
          >
            <template #trailing>
              <span class="font-medium text-muted text-sm">days after issue</span>
            </template>
          </UInput>
        </UFormField>
      </div>
    </UCard>

    <!-- Partial Payments -->
    <UCard :ui="{ root: 'ring-default shadow-none', header: 'pb-4', body: 'pt-0' }">
      <template #header>
        <div class="flex items-center gap-3">
          <div class="flex justify-center items-center bg-primary/10 p-2 rounded-lg">
            <UIcon
              name="i-lucide-wallet"
              class="size-5 text-primary"
            />
          </div>

          <div>
            <p class="font-semibold text-highlighted text-sm">
              Partial Payments
            </p>

            <p class="mt-0.5 text-muted text-xs">
              Let students pay their bills in installments
            </p>
          </div>
        </div>
      </template>

      <div class="space-y-4">
        <UFormField name="allowPartialPayments">
          <div class="flex justify-between items-center gap-4 bg-muted/30 p-4 border border-default rounded-lg">
            <div>
              <p class="font-medium text-highlighted text-sm">
                Allow Partial Payments
              </p>

              <p class="mt-0.5 text-muted text-xs">
                Students can pay their bills in installments.
              </p>
            </div>

            <USwitch
              v-model="state.allowPartialPayments"
              :ui="{ base: 'cursor-pointer' }"
            />
          </div>
        </UFormField>

        <Transition
          enter-active-class="transition-all duration-200 ease-out"
          enter-from-class="opacity-0 -translate-y-1"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition-all duration-150 ease-in"
          leave-from-class="opacity-100 translate-y-0"
          leave-to-class="opacity-0 -translate-y-1"
        >
          <UFormField
            v-if="state.allowPartialPayments"
            label="Minimum First Payment"
            name="minimumPartialPaymentPercent"
            size="lg"
            hint="The smallest initial installment a student must pay"
            required
          >
            <UInput
              v-model.number="state.minimumPartialPaymentPercent"
              type="number"
              min="0"
              max="100"
              icon="i-lucide-percent"
              class="w-full max-w-xs"
            >
              <template #trailing>
                <span class="font-medium text-muted text-sm">% of total</span>
              </template>
            </UInput>
          </UFormField>
        </Transition>
      </div>
    </UCard>

    <!-- Footer -->
    <div class="flex justify-end pb-2">
      <UButton
        type="submit"
        label="Save Billing Rules"
        icon="i-lucide-save"
        color="primary"
        size="lg"
        :loading="isSaving"
        class="cursor-pointer"
      />
    </div>
  </UForm>
</template>
