<script setup lang="ts">
import type { FormErrorEvent, FormSubmitEvent } from "@nuxt/ui";

const { settings, isFirstSetup, scope } = defineProps<{
  settings: CompanySettings | HostelSettings | null;
  isFirstSetup: boolean;
  scope: PaystackScope;
  handleFormError: (event: FormErrorEvent) => void;
}>();

const emit = defineEmits<{
  (e: "success"): void;
}>();

function isHostelSettings(val: CompanySettings | HostelSettings | null): val is HostelSettings {
  return val !== null && "useHostelSubaccount" in val;
}

const {
  mainBankOptions,
  mobileMoneyOptions,
  // bankOptions,
  banksStatus,
  isVerifying,
  verifiedAccountName,
  verifyError,
  verifyAccount,
  resetVerification,
  isCreating,
  createSubaccount,
  isUpdating,
  updateSubaccount,
  toggleHostelSubaccount,
} = usePaystackSetup(scope);

const isHostelScope = computed(() => typeof scope !== "string");

const isHostelSubaccountEnabled = ref(false);

watch(
  () => isHostelSettings(settings) ? settings.useHostelSubaccount : false,
  (val) => {
    isHostelSubaccountEnabled.value = Boolean(val);
  },
  { immediate: true },
);

async function onToggleHostelSubaccount(val: boolean) {
  const ok = await toggleHostelSubaccount(val);
  if (!ok) isHostelSubaccountEnabled.value = !val;
}

const stepOverride = ref<Step | null>(null);
const step = computed<Step>({
  get() {
    if (stepOverride.value !== null) return stepOverride.value;
    return settings?.paystackIsVerified ? "done" : "idle";
  },
  set(val) { stepOverride.value = val; },
});

watch(() => settings?.paystackIsVerified, () => {
  stepOverride.value = null;
});

const accountTypeOptions = [
  { label: "Bank Account", value: "bank_account" },
  { label: "Mobile Money", value: "mobile_money" },
];

const verifyState = ref({
  accountType: "bank_account" as "bank_account" | "mobile_money",
  accountNumber: "",
  bankCode: "",
});

const createState = ref<CreateSubaccountSchema>({
  accountType: "bank_account",
  businessName: "",
  settlementBank: "",
  accountNumber: "",
  percentageCharge: 100,
  description: "",
  primaryContactName: "",
  primaryContactEmail: "",
  primaryContactPhone: "",
});

const updateState = ref<UpdateSubaccountSchema>({
  percentageCharge: settings?.paystackPercentageCharge
    ? Number(settings.paystackPercentageCharge)
    : 100,
});

const verifyFormRef = useTemplateRef("verifyFormRef");
const createFormRef = useTemplateRef("createFormRef");
const isEditing = ref(false);

async function onVerifySubmit(_e: FormSubmitEvent<typeof verifyState.value>) {
  await verifyAccount(verifyState.value);
  if (verifiedAccountName.value) {
    createState.value.accountType = verifyState.value.accountType;
    createState.value.settlementBank = verifyState.value.bankCode;
    createState.value.accountNumber = verifyState.value.accountNumber;
    step.value = "confirmed";
  }
}

function onRejectVerification() {
  resetVerification();
  step.value = "verify";
}

async function onCreateSubmit(_e: FormSubmitEvent<typeof createState.value>) {
  const ok = await createSubaccount(createState.value);
  if (ok) {
    emit("success");
    step.value = "done";
  }
}

async function onUpdatePercentage() {
  await updateSubaccount({ percentageCharge: updateState.value.percentageCharge });
  isEditing.value = false;
  emit("success");
}

watch(
  () => settings?.paystackSubaccountCode,
  (code) => {
    if (code) {
      step.value = "done";
      isEditing.value = false;
    }
    else {
      step.value = "idle";
      resetVerification();
    }
  },
  { immediate: true },
);

watch(
  () => settings?.paystackPercentageCharge,
  (newCharge) => {
    updateState.value.percentageCharge = newCharge ? Number(newCharge) : 100;
  },
  { immediate: true },
);

const maskedAccountNumber = computed(() => settings?.paystackAccountType === "mobile_money"
  ? maskAccountNumberForApi(settings.paystackAccountNumber ?? null)
  : maskAccountNumberPartial(settings?.paystackAccountNumber ?? null));
</script>

<template>
  <div class="space-y-6 mx-auto mt-6 max-w-4xl">
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
    >
      <UAlert
        v-if="isFirstSetup && step === 'idle'"
        icon="i-lucide-sparkles"
        title="Welcome! Let's set up your payouts."
        description="Before you can start processing student bookings or generating automated invoices, you must link a verified bank account or mobile money wallet to receive your funds."
        color="primary"
        variant="subtle"
      />
    </Transition>

    <UCard
      v-if="isHostelScope"
      :ui="{ root: 'ring-default shadow-none', body: 'py-5' }"
    >
      <div class="flex items-center justify-between gap-4">
        <div>
          <p class="font-semibold text-highlighted text-base">
            Enable Custom Routing
          </p>

          <p class="mt-1 text-muted text-sm max-w-xl">
            When enabled, all payments for this hostel will be routed to this connected Paystack account instead of the main company account.
            <span
              v-if="!settings?.paystackSubaccountCode"
              class="block text-warning font-medium mt-1"
            >
              You must set up a payment account below before you can enable custom routing.
            </span>
          </p>
        </div>

        <USwitch
          v-model="isHostelSubaccountEnabled"
          :disabled="isUpdating || !settings?.paystackSubaccountCode"
          @update:model-value="onToggleHostelSubaccount"
        />
      </div>
    </UCard>

    <UCard
      v-if="settings?.paystackSubaccountCode"
      :ui="{
        root: settings.paystackIsVerified
          ? 'ring-success/30 shadow-none bg-success/5'
          : 'ring-warning/30 shadow-none bg-warning/5',
        body: 'py-4',
      }"
    >
      <div class="flex items-center gap-4">
        <div class="flex justify-center items-center rounded-full shrink-0">
          <UIcon
            :name="settings.paystackIsVerified ? 'i-lucide-circle-check-big' : 'i-lucide-circle-alert'"
            :class="settings.paystackIsVerified ? 'size-8 text-success' : 'size-8 text-warning'"
          />
        </div>

        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <p
              class="font-semibold text-base"
              :class="[
                settings.paystackIsVerified ? 'text-success' : 'text-warning',
              ]"
            >
              {{ settings.paystackIsVerified ? 'Account Connected' : 'Account Connected (Pending Verification)' }}
            </p>

            <UBadge
              :label="settings.paystackIsVerified ? 'Verified' : 'Pending'"
              :color="settings.paystackIsVerified ? 'success' : 'warning'"
              variant="subtle"
              size="xs"
              :ui="{
                label: 'text-xs',
              }"
            />
          </div>

          <p class="mt-0.5 font-medium text-muted text-sm truncate">
            {{ settings.paystackBusinessName }}
            <span class="opacity-40 mx-1.5">·</span>
            {{ maskedAccountNumber }}
            <span class="opacity-40 mx-1.5">·</span>
            {{ maskAccountNumberPartial(settings.paystackSubaccountCode) }}
          </p>
        </div>

        <UButton
          :label="isEditing ? 'Cancel' : 'Edit'"
          :icon="isEditing ? 'i-lucide-x' : 'i-lucide-pencil'"
          variant="ghost"
          color="neutral"
          size="md"
          class="cursor-pointer shrink-0"
          @click="isEditing = !isEditing"
        />
      </div>
    </UCard>

    <UCard
      v-if="step === 'done' && isEditing"
      :ui="{ root: 'ring-default shadow-none', header: 'pb-4', body: 'pt-0' }"
    >
      <template #header>
        <div class="flex items-center gap-3">
          <div class="flex justify-center items-center bg-primary/10 p-2 rounded-lg">
            <UIcon
              name="i-lucide-percent"
              class="size-5 text-primary"
            />
          </div>

          <div>
            <p class="font-semibold text-highlighted text-base">
              Settlement Percentage
            </p>

            <p class="mt-0.5 text-muted text-sm">
              Adjust how much of each payment is settled to your account
            </p>
          </div>
        </div>
      </template>

      <div class="space-y-4">
        <UFormField
          label="Percentage Charge"
          name="percentageCharge"
          size="lg"
        >
          <UInput
            v-model.number="updateState.percentageCharge"
            type="number"
            min="1"
            max="100"
            class="w-full max-w-xs"
            size="lg"
          >
            <template #trailing>
              <span class="font-medium text-muted text-sm">%</span>
            </template>
          </UInput>
        </UFormField>

        <div class="flex gap-2.5 pt-1">
          <UButton
            label="Cancel"
            color="neutral"
            variant="outline"
            class="cursor-pointer"
            @click="isEditing = false"
          />

          <UButton
            :label="isUpdating ? 'Saving…' : 'Save Changes'"
            icon="i-lucide-save"
            color="primary"
            :loading="isUpdating"
            class="cursor-pointer"
            @click="onUpdatePercentage"
          />
        </div>
      </div>
    </UCard>

    <UCard
      v-if="step === 'idle'"
      :ui="{ root: 'ring-default shadow-none', body: 'py-10' }"
    >
      <div class="flex flex-col items-center gap-4 text-center">
        <div class="flex justify-center items-center bg-muted/50 rounded-full">
          <UIcon
            name="i-lucide-landmark"
            class="size-8 text-muted"
          />
        </div>

        <div class="space-y-1 max-w-sm">
          <p class="font-semibold text-highlighted text-base">
            No payment account connected
          </p>

          <p class="text-muted text-sm leading-relaxed">
            Link a bank account or mobile money wallet to start receiving payments directly through Paystack.
          </p>
        </div>

        <UButton
          :label="isHostelScope ? 'Set Up Hostel Account' : 'Set Up Company Account'"
          icon="i-lucide-plus"
          color="primary"
          size="lg"
          class="mt-1 cursor-pointer"
          @click="step = 'verify'"
        />
      </div>
    </UCard>

    <UCard
      v-if="step === 'verify'"
      :ui="{ root: 'ring-default shadow-none', header: 'pb-4', body: 'pt-0' }"
    >
      <template #header>
        <div class="flex items-start gap-3">
          <div class="flex justify-center items-center bg-primary/10 p-2 rounded-lg shrink-0">
            <UIcon
              name="i-lucide-search-check"
              class="size-5 text-primary"
            />
          </div>

          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <p class="font-semibold text-highlighted text-sm">
                Verify Account
              </p>

              <UBadge
                label="Step 1 of 2"
                color="primary"
                variant="subtle"
                size="xs"
                :ui="{
                  label: 'text-xs',
                }"
              />
            </div>

            <p class="mt-0.5 text-muted text-xs">
              Confirm your bank account or mobile money number
            </p>
          </div>
        </div>
      </template>

      <UForm
        ref="verifyFormRef"
        :state="verifyState"
        :schema="verifyBankAccountSchema"
        class="space-y-4"
        @submit="onVerifySubmit"
        @error="handleFormError"
      >
        <div class="gap-4 grid grid-cols-1 sm:grid-cols-2">
          <UFormField
            label="Account Type"
            name="accountType"
            size="lg"
            required
          >
            <USelectMenu
              v-model="verifyState.accountType"
              :items="accountTypeOptions"
              value-key="value"
              class="w-full cursor-pointer"
              @update:model-value="verifyState.accountNumber = ''; resetVerification()"
            />
          </UFormField>

          <UFormField
            label="Bank / Provider"
            name="bankCode"
            size="lg"
            required
          >
            <USelectMenu
              v-model="verifyState.bankCode"
              :items="verifyState.accountType === 'bank_account' ? mainBankOptions : mobileMoneyOptions"
              :loading="banksStatus === 'pending'"
              value-key="value"
              placeholder="Select provider"
              class="w-full cursor-pointer"
              searchable
              @update:model-value="resetVerification()"
            />
          </UFormField>
        </div>

        <div class="gap-4 grid grid-cols-1 sm:grid-cols-2">
          <UFormField
            :label="verifyState.accountType === 'mobile_money' ? 'Mobile Money Number' : 'Account Number'"
            name="accountNumber"
            size="lg"
            required
          >
            <UInput
              v-model="verifyState.accountNumber"
              :placeholder="verifyState.accountType === 'mobile_money' ? '0241234567' : '1234567890123'"
              :icon="verifyState.accountType === 'mobile_money' ? 'i-lucide-smartphone' : 'i-lucide-hash'"
              inputmode="numeric"
              class="w-full"
              @update:model-value="resetVerification()"
            />
          </UFormField>
        </div>

        <!-- Verified name -->
        <div
          v-if="verifiedAccountName"
          class="flex items-center gap-3 bg-success/10 px-4 py-3 border border-success/20 rounded-lg"
        >
          <UIcon
            name="i-lucide-user-round-check"
            class="size-4 text-success shrink-0"
          />

          <p class="font-medium text-success text-sm">
            {{ verifiedAccountName }}
          </p>
        </div>

        <!-- Error -->
        <div
          v-if="verifyError"
          class="flex items-center gap-3 bg-error/10 px-4 py-3 border border-error/20 rounded-lg"
        >
          <UIcon
            name="i-lucide-circle-x"
            class="size-4 text-error shrink-0"
          />

          <p class="text-error text-sm">
            {{ verifyError }}
          </p>
        </div>

        <div class="flex gap-2.5 pt-1">
          <UButton
            label="Cancel"
            color="neutral"
            variant="outline"
            class="cursor-pointer"
            @click="step = 'idle'; resetVerification()"
          />

          <UButton
            type="submit"
            :label="isVerifying ? 'Verifying…' : 'Verify Account'"
            icon="i-lucide-search-check"
            color="primary"
            :loading="isVerifying"
            class="cursor-pointer"
          />
        </div>
      </UForm>
    </UCard>

    <!-- ── Step 2: Create Subaccount ── -->
    <UCard
      v-if="step === 'confirmed'"
      :ui="{ root: 'ring-default shadow-none', header: 'pb-4', body: 'pt-0' }"
    >
      <template #header>
        <div class="flex items-start gap-3">
          <div class="flex justify-center items-center bg-primary/10 p-2 rounded-lg shrink-0">
            <UIcon
              name="i-lucide-landmark"
              class="size-5 text-primary"
            />
          </div>

          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <p class="font-semibold text-highlighted text-sm">
                Complete Setup
              </p>

              <UBadge
                label="Step 2 of 2"
                color="primary"
                variant="subtle"
                size="xs"
                :ui="{
                  label: 'text-xs',
                }"
              />
            </div>

            <p class="mt-0.5 text-muted text-xs">
              Fill in your business details to finish creating the subaccount
            </p>
          </div>
        </div>
      </template>

      <!-- Verified account pill -->
      <div class="flex items-center gap-3 bg-success/10 mb-4 px-4 py-3 border border-success/20 rounded-lg">
        <UIcon
          name="i-lucide-user-round-check"
          class="size-4 text-success shrink-0"
        />

        <p class="flex-1 text-success text-sm">
          Account confirmed: <span class="font-semibold">{{ verifiedAccountName }}</span>
        </p>

        <UButton
          label="Change"
          variant="ghost"
          color="neutral"
          size="xs"
          class="cursor-pointer"
          @click="onRejectVerification"
        />
      </div>

      <UForm
        ref="createFormRef"
        :state="createState"
        :schema="createSubaccountSchema"
        class="space-y-4"
        @submit="onCreateSubmit"
        @error="handleFormError"
      >
        <div class="gap-4 grid grid-cols-1 sm:grid-cols-2">
          <UFormField
            label="Business Name"
            name="businessName"
            size="lg"
            required
            class="sm:col-span-2"
          >
            <UInput
              v-model="createState.businessName"
              placeholder="Sunrise Hostels Ltd."
              icon="i-lucide-building-2"
              class="w-full"
            />
          </UFormField>

          <UFormField
            label="Settlement Percentage"
            name="percentageCharge"
            size="lg"
            required
          >
            <UInput
              v-model.number="createState.percentageCharge"
              type="number"
              min="1"
              max="100"
              placeholder="100"
              class="w-full"
            >
              <template #trailing>
                <span class="font-medium text-muted text-sm">%</span>
              </template>
            </UInput>
          </UFormField>

          <UFormField
            label="Description"
            name="description"
            size="lg"
          >
            <UInput
              v-model="createState.description"
              placeholder="Optional description"
              icon="i-lucide-text"
              class="w-full"
            />
          </UFormField>
        </div>

        <USeparator
          label="Primary Contact"
          size="sm"
          :ui="{ label: 'text-sm mt-2 text-muted' }"
        />

        <div class="gap-4 grid grid-cols-1 sm:grid-cols-2">
          <UFormField
            label="Name"
            name="primaryContactName"
            size="lg"
          >
            <UInput
              v-model="createState.primaryContactName"
              icon="i-lucide-user"
              class="w-full"
            />
          </UFormField>

          <UFormField
            label="Email"
            name="primaryContactEmail"
            size="lg"
          >
            <UInput
              v-model="createState.primaryContactEmail"
              type="email"
              icon="i-lucide-mail"
              class="w-full"
            />
          </UFormField>

          <UFormField
            label="Phone"
            name="primaryContactPhone"
            size="lg"
          >
            <UInput
              v-model="createState.primaryContactPhone"
              icon="i-lucide-phone"
              class="w-full"
            />
          </UFormField>
        </div>

        <div class="flex gap-2.5 pt-1">
          <UButton
            label="Back"
            color="neutral"
            variant="outline"
            icon="i-lucide-arrow-left"
            class="cursor-pointer"
            @click="step = 'verify'"
          />

          <UButton
            type="submit"
            :label="isCreating ? 'Creating…' : 'Create Subaccount'"
            icon="i-lucide-landmark"
            color="primary"
            :loading="isCreating"
            class="cursor-pointer"
          />
        </div>
      </UForm>
    </UCard>
  </div>
</template>
