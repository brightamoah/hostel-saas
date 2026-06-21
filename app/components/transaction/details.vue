<script lang="ts" setup>
import { useDateFormat } from "@vueuse/core";

const { transaction } = defineProps<{
  transaction: PaymentTransaction;
}>();

const statusColor = computed(() =>
  paymentStatusColorMap[transaction.status],
);

const statusIcon = computed(() =>
  transactionStatusIconMap[transaction.status],
);

const studentDetails = computed(() => [
  {
    label: "Full Name",
    value: transaction.student?.user?.name,
    icon: "i-lucide-user",
  },
  {
    label: "Email",
    value: transaction.student?.user?.email,
    icon: "i-lucide-mail",
  },
  {
    label: "Phone",
    value: transaction.student?.phoneNumber,
    icon: "i-lucide-phone",
  },
  {
    label: "Gender",
    value: transaction.student?.gender,
    icon: "i-lucide-user-round",
    class: "capitalize",
  },
  {
    label: "Address",
    value: transaction.student?.address,
    icon: "i-lucide-map-pin",
  },
]);

const paymentDetails = computed(() => [
  {
    label: "Reference",
    value: transaction.transactionReference,
    icon: "i-lucide-hash",
  },
  {
    label: "Method",
    value: transaction.paymentMethod,
    icon: "i-heroicons-credit-card",
    class: "capitalize",
  },
  {
    label: "Date",
    value: useDateFormat(transaction.paymentDate, "ddd Do MMM, YYYY · h:mm A").value,
    icon: "i-lucide-calendar-days",
  },
]);

const copied = ref(false);
async function copyReference() {
  await navigator.clipboard.writeText(transaction.transactionReference);
  copied.value = true;
  setTimeout(() => (copied.value = false), 2000);
}
</script>

<template>
  <UModal
    title="Transaction Details"
    :description="`Reference: ${transaction.transactionReference}`"
    :ui="{
      content:
        'w-[95%] sm:w-[85%] max-w-2xl rounded-xl shadow-xl ring ring-default overflow-hidden',
      title: 'text-lg font-semibold text-highlighted',
      description: 'text-sm text-muted font-mono',
      close: 'cursor-pointer',
      overlay: 'backdrop-blur-sm',
      footer: 'justify-end gap-2',
    }"
  >
    <template #body>
      <div class="flex sm:flex-row flex-col justify-between items-start sm:items-center gap-4 bg-elevated/60 mb-6 p-4 rounded-xl">
        <div class="space-y-1">
          <p class="font-medium text-muted text-xs uppercase tracking-widest">
            Amount Paid
          </p>

          <h2 class="font-newsreader font-bold text-2xl tracking-tight">
            {{ formatCurrency(Number(transaction.amount)) }}
          </h2>

          <p class="flex items-center gap-1.5 text-muted text-xs">
            <UIcon
              name="i-lucide-calendar-clock"
              class="size-4 shrink-0"
            />
            {{ useDateFormat(transaction.paymentDate, "ddd Do MMM, YYYY [at] HH:mm").value }}
          </p>
        </div>

        <UBadge
          :color="statusColor"
          variant="subtle"
          class="gap-1.5 font-medium text-sm capitalize"
        >
          <UIcon
            :name="statusIcon"
            class="size-4.5"
          />
          {{ transaction.status }}
        </UBadge>
      </div>

      <div class="gap-5 grid grid-cols-1 sm:grid-cols-2 mb-6">
        <div class="space-y-4 bg-elevated/20 p-4 border border-default rounded-xl">
          <p class="flex items-center gap-2 font-semibold text-muted text-sm uppercase tracking-widest">
            <UIcon
              name="i-lucide-graduation-cap"
              class="size-5.5 text-primary"
            />
            Student
          </p>

          <DashboardDetailItem
            v-for="item in studentDetails"
            :key="item.label"
            :label="item.label"
            label-class="text-sm"
          >
            <div class="flex items-center gap-2">
              <UIcon
                :name="item.icon"
                class="mt-0.5 size-4.5 text-muted shrink-0"
              />

              <p class="text-sm">
                {{ item.value ?? "—" }}
              </p>
            </div>
          </DashboardDetailItem>
        </div>

        <div class="space-y-4 bg-elevated/20 p-4 border border-default rounded-xl">
          <p class="flex items-center gap-2 font-semibold text-muted text-sm uppercase tracking-widest">
            <UIcon
              name="i-heroicons-banknotes"
              class="size-5.5 text-primary"
            />
            Payment Info
          </p>

          <DashboardDetailItem
            v-for="item in paymentDetails"
            :key="item.label"
            :label="item.label"
            label-class="text-sm"
          >
            <div class="flex items-center gap-2">
              <UIcon
                :name="item.icon"
                class="mt-0.5 size-4.5 text-muted shrink-0"
              />

              <p class="text-sm">
                {{ item.value ?? "—" }}
              </p>
            </div>
          </DashboardDetailItem>
        </div>
      </div>

      <USeparator class="mb-6" />

      <div>
        <p class="flex items-center gap-2 mb-4 font-semibold text-muted text-xs uppercase tracking-widest">
          <UIcon
            name="i-lucide-file-text"
            class="size-4.5 text-primary"
          />
          Related Invoice
        </p>

        <div class="flex sm:flex-row flex-col justify-between sm:items-center gap-4 bg-elevated/30 p-4 border border-default rounded-xl">
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <p class="font-newsreader font-semibold text-lg tracking-tight">
                {{ transaction.billing?.invoiceNumber }}
              </p>

              <UBadge
                color="primary"
                variant="subtle"
                class="capitalize"
              >
                {{ transaction.billing?.type }}
              </UBadge>
            </div>

            <DashboardDetailItem
              :label="transaction.billing?.description || 'Invoice payment'"
              label-class="text-sm"
            >
              <div class="flex items-center gap-2">
                <UIcon
                  name="i-lucide-building-2"
                  class="mt-0.5 size-4.5 text-muted shrink-0"
                />

                <p class="text-sm">
                  {{ transaction.billing?.hostel?.name }}
                </p>
              </div>
            </DashboardDetailItem>
          </div>
        </div>
      </div>
    </template>

    <template #footer="{ close }">
      <UButton
        label="Close"
        color="error"
        variant="subtle"
        class="cursor-pointer"
        @click="close"
      />

      <UButton
        :icon="copied ? 'i-lucide-check' : 'i-lucide-copy'"
        :label="copied ? 'Copied!' : 'Copy Reference'"
        color="neutral"
        variant="subtle"
        class="cursor-pointer"
        @click="copyReference"
      />
    </template>
  </UModal>
</template>
