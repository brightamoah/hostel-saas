export function usePaystackSetup(scope: PaystackScope) {
  const { $apiFetch } = useNuxtApp();
  const toast = useToast();
  const route = useRoute();

  const companyQuery = computed(() => route.query.companyId ? { companyId: route.query.companyId } : {});

  const baseUrl = computed(() => scope === "company"
    ? "/api/settings/company/paystack"
    : `/api/settings/hostel/${scope.hostel}/paystack`,
  );

  const banksKey = computed(() => `paystackBanks:${typeof scope === "string" ? scope : scope.hostel}`);

  const { data: banksData, status: banksStatus } = useFetch<PaystackBanksResponseData>(
    "/api/settings/company/paystack/banks",
    {
      key: banksKey,
      query: companyQuery,
      lazy: true,
      watch: [companyQuery],
      default: () => ({
        success: false,
        data: null,
        currency: "GHS",
        cached: false,
      }),
      getCachedData: (key, nuxtApp, ctx) => {
        if (ctx.cause === "refresh:manual" || ctx.cause === "refresh:hook") return undefined;
        return nuxtApp.payload.data[key] ?? nuxtApp.static.data[key];
      },
    },
  );

  const banks = computed(() => banksData.value?.data ?? []);

  const mainBankOptions = computed(() => banks.value
    .filter(bank => bank.type === "ghipss")
    .map(bank => ({
      label: bank.name,
      value: bank.code,
    })));

  const mobileMoneyOptions = computed(() => banks.value
    .filter(bank => bank.type === "mobile_money")
    .map(bank => ({
      label: bank.name,
      value: bank.code,
    })));

  const bankOptions = computed(() =>
    banks.value.map(bank => ({
      label: bank.name,
      value: bank.code,
    })),
  );

  const isVerifying = ref(false);
  const verifiedAccountName = ref<string | null>(null);
  const verifyError = ref<string | null>(null);

  async function verifyAccount(payload: VerifyBankAccountSchema) {
    isVerifying.value = true;
    verifiedAccountName.value = null;
    verifyError.value = null;

    try {
      const response = await $apiFetch<VerifyAccountResponseData>(
        `${baseUrl.value}/verifyAccount`,
        {
          method: "POST",
          body: payload,
          query: companyQuery.value,
        },
      );
      verifiedAccountName.value = response.data.accountName;
    }
    catch (error) {
      const message = (error as any)?.data?.message ?? "Could not verify account.";
      verifyError.value = message;
      toast.add({
        title: "Account verification failed",
        description: message,
        color: "error",
        icon: "i-lucide-circle-alert",
        duration: 8000,
      });
    }
    finally {
      isVerifying.value = false;
    }
  }

  function resetVerification() {
    verifiedAccountName.value = null;
    verifyError.value = null;
  }

  const isCreating = ref(false);

  async function createSubaccount(payload: CreateSubaccountSchema): Promise<boolean> {
    isCreating.value = true;
    try {
      const response = await $apiFetch<CreateSubaccountResponseData>(`${baseUrl.value}/subaccount`, {
        method: "POST",
        body: payload,
        query: companyQuery.value,
      });

      toast.add({
        title: "Subaccount created",
        description: response.message ?? "Paystack subaccount linked successfully.",
        color: "success",
        icon: "i-lucide-circle-check-big",
      });

      return true;
    }
    catch (error) {
      const message = (error as any)?.data?.message ?? "Failed to create subaccount.";
      toast.add({
        title: "Subaccount creation failed",
        description: message,
        color: "error",
        icon: "i-lucide-circle-alert",
        duration: 8000,
      });
      return false;
    }
    finally {
      isCreating.value = false;
    }
  }

  const isUpdating = ref(false);

  async function updateSubaccount(payload: UpdateSubaccountSchema | HostelSubaccountToggleSchema): Promise<boolean> {
    isUpdating.value = true;
    try {
      const response = await $apiFetch<UpdateSubaccountResponse>(`${baseUrl.value}/subaccount`, {
        method: "PATCH",
        body: payload,
        query: companyQuery.value,
      });

      toast.add({
        title: "Subaccount updated",
        description: response.message ?? "Changes saved successfully.",
        color: "success",
        icon: "i-lucide-circle-check-big",
      });

      return true;
    }
    catch (error) {
      const message = (error as any)?.data?.message ?? "Failed to update subaccount.";
      toast.add({
        title: "Update failed",
        description: message,
        color: "error",
        icon: "i-lucide-circle-alert",
        duration: 8000,
      });
      return false;
    }
    finally {
      isUpdating.value = false;
    }
  }

  async function toggleHostelSubaccount(value: boolean): Promise<boolean> {
    return updateSubaccount({ useHostelSubaccount: value });
  }

  return {
    banks,
    bankOptions,
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

    mainBankOptions,
    mobileMoneyOptions,
  };
}
