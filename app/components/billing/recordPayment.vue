<script lang="ts" setup>
import type { DateValue } from "@internationalized/date";

import { CalendarDate, getLocalTimeZone, now, parseAbsoluteToLocal, Time } from "@internationalized/date";

const { billing } = defineProps<{
  billing: Billing;
}>();

const emit = defineEmits<{ close: [boolean] }>();

const { $handleFormError } = useNuxtApp();

const billingStore = useBillingStore();
const { isRecordPaymentModalOpen, isLoading } = storeToRefs(billingStore);
const { recordManualPayment } = billingStore;

const subtotal = computed(() => Number(billing.amount));
const lateFee = computed(() => Number(billing.lateFee || 0));
const total = computed(() => subtotal.value + lateFee.value);
const balanceDue = computed(() => total.value - Number(billing.paidAmount));
const purpose = computed(() => billing.type);

const cardDetails = ref([
  { label: "Invoice Number", value: billing.invoiceNumber },
  { label: "Description", value: billing.description },
  { label: "Purpose", value: capitalizeWords(purpose.value) },
  { label: "Outstanding Amount", value: formatCurrency(balanceDue.value), isAmount: true },
]);

const recordPaymentState = ref<Partial<RecordManualPaymentSchema>>({
  billingId: undefined,
  amount: undefined,
  totalAmount: undefined,
  paymentMethod: "cash",
  transactionReference: "",
  paymentDate: new Date().toISOString(),
});

const dateModel = ref<DateValue | undefined>();
const timeModel = ref<string | undefined>();
let isSyncing = false;

watch(() => recordPaymentState.value.paymentDate, (newVal) => {
  if (isSyncing || !newVal) return;
  try {
    const zdt = parseAbsoluteToLocal(new Date(newVal).toISOString());
    dateModel.value = new CalendarDate(zdt.year, zdt.month, zdt.day);
    timeModel.value = `${String(zdt.hour).padStart(2, "0")}:${String(zdt.minute).padStart(2, "0")}`;
  }
  catch {}
}, { immediate: true });

watch([dateModel, timeModel], async ([newDate, newTime]) => {
  if (newDate && newTime) {
    isSyncing = true;
    const [h, m] = newTime.split(":").map(Number);
    try {
      const jsDate = newDate.toDate(getLocalTimeZone());
      jsDate.setHours(h || 0, m || 0, 0);
      recordPaymentState.value.paymentDate = jsDate.toISOString();
    }
    catch (e) {
      console.error(e);
    }
    await nextTick(() => isSyncing = false);
  }
});

onMounted(() => {
  recordPaymentState.value.billingId = billing.id;
  recordPaymentState.value.totalAmount = total.value;
  recordPaymentState.value.amount = balanceDue.value;
  recordPaymentState.value.transactionReference = `MAN-${billing.id}-${Date.now()}`;
});

const paymentForm = useTemplateRef("paymentForm");

const paymentMethodOptions = [
  { label: "Cash", value: "cash" },
  { label: "Bank Transfer", value: "bank transfer" },
  { label: "Mobile Money", value: "mobile money" },
  { label: "Card", value: "card" },
  { label: "Other", value: "other" },
];

async function submitPayment() {
  if (!recordPaymentState.value.billingId || !recordPaymentState.value.amount || !recordPaymentState.value.totalAmount || !recordPaymentState.value.paymentMethod || !recordPaymentState.value.transactionReference || !recordPaymentState.value.paymentDate) {
    return;
  }

  await recordManualPayment(recordPaymentState.value as RecordManualPaymentSchema);
  closeModal();
}

function closeModal() {
  isRecordPaymentModalOpen.value = false;
  emit("close", false);
}
</script>

<template>
  <UModal
    v-model:open="isRecordPaymentModalOpen"
    title="Record Manual Payment"
    description="Manually record a payment made by a student."
    :dismissible="false"
    :ui="{
      footer: 'justify-end',
      content: 'w-[80%] max-w-xl h-auto rounded-lg shadow-lg ring ring-default overflow-hidden',
      title: 'font-newsreader text-xl font-semibold',
      description: 'text-base text-muted',
      close: 'cursor-pointer',
      overlay: 'backdrop-blur-sm',
    }"
  >
    <template #body>
      <UForm
        ref="paymentForm"
        v-auto-animate
        :schema="recordManualPaymentSchema"
        :state="recordPaymentState"
        class="space-y-4"
        @error="$handleFormError"
        @submit="submitPayment"
      >
        <UCard>
          <div class="space-y-2">
            <p
              v-for="item in cardDetails"
              :key="item.label"
              class="text-sm"
            >
              <strong>{{ item.label }}: </strong>

              <span :class="item.isAmount ? 'font-semibold text-error' : ''">
                {{ item.value }}</span>
            </p>
          </div>
        </UCard>

        <UFormField
          label="Amount Paid GH₵"
          class="w-full"
          name="amount"
        >
          <UInput
            v-model.number="recordPaymentState.amount"
            type="number"
            placeholder="0.00"
            size="lg"
            :min="1"
            :max="balanceDue"
            class="w-full"
            autofocus
            :ui="{ leading: 'pr-2 mr-5' }"
          >
            <template #leading>
              GH₵
            </template>
          </UInput>
        </UFormField>

        <UFormField
          label="Payment Method"
          class="w-full"
          name="paymentMethod"
        >
          <USelect
            v-model="recordPaymentState.paymentMethod"
            :items="paymentMethodOptions"
            size="lg"
            class="w-full"
          />
        </UFormField>

        <UFormField
          label="Transaction Reference / Note"
          class="w-full"
          name="transactionReference"
        >
          <UInput
            v-model="recordPaymentState.transactionReference"
            placeholder="E.g. Receipt No, Bank Ref"
            size="lg"
            class="w-full"
          />
        </UFormField>

        <UFormField
          label="Payment Date"
          class="w-full"
          name="paymentDate"
        >
          <div class="gap-2 grid grid-cols-2">
            <AppDatePicker
              v-model="dateModel"
              size="lg"
              class="w-full"
            />

            <AppTimePicker
              v-model="timeModel"
              :minute-step="1"
              size="lg"
              class="w-full"
            />
          </div>
        </UFormField>
      </UForm>
    </template>

    <template #footer>
      <div class="flex gap-2.5">
        <UButton
          label="Cancel"
          color="neutral"
          variant="outline"
          class="cursor-pointer"
          @click="closeModal"
        />

        <UButton
          label="Save Payment"
          color="primary"
          variant="solid"
          class="cursor-pointer"
          icon="lucide-save"
          :loading="isLoading"
          @click="paymentForm?.submit()"
        />
      </div>
    </template>
  </UModal>
</template>

<style>
</style>
