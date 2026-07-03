export function useCompanySettings() {
  const { $apiFetch, $handleFormError } = useNuxtApp();
  const { isPlatformAdmin } = usePortalUserSession();
  const route = useRoute();
  const router = useRouter();
  const toast = useToast();

  const selectedCompanyId = ref<number | undefined>(
    route.query.companyId ? Number(route.query.companyId) : undefined,
  );

  const { data, status, refresh } = useFetch<CompanySettingsResponseData>(
    "/api/settings/company",
    {
      key: computed(() => `companySettings:${selectedCompanyId.value || "default"}`),
      query: computed(() => (selectedCompanyId.value ? { companyId: selectedCompanyId.value } : {})),
      lazy: true,
      watch: [selectedCompanyId],
      default: () => ({
        success: false,
        data: null,
        isFirstSetup: true,
      }),
      getCachedData: (key, nuxtApp, ctx) => {
        if (ctx.cause === "refresh:manual" || ctx.cause === "refresh:hook") return undefined;
        return nuxtApp.payload.data[key] ?? nuxtApp.static.data[key];
      },
    },
  );

  const settings = computed(() => data.value?.data ?? null);
  const isFirstSetup = computed(() => data.value?.isFirstSetup ?? true);

  const generalState = ref<Partial<CompanyGeneralSettingsSchema>>({});
  const billingState = ref<Partial<CompanyBillingSettingsSchema>>({});
  const notificationsState = ref<Partial<CompanyNotificationSettingsSchema>>({});
  const portalState = ref<Partial<CompanyPortalSettingsSchema>>({});
  const academicState = ref<Partial<CompanyAcademicSettingsSchema>>({});

  watchEffect(() => {
    const setting = settings.value;
    if (!setting) return;

    generalState.value = {
      logoUrl: setting.logoUrl ?? undefined,
      faviconUrl: setting.faviconUrl ?? undefined,
      primaryColor: setting.primaryColor ?? undefined,
      accentColor: setting.accentColor ?? undefined,
      companyWebsite: setting.companyWebsite ?? undefined,
      supportEmail: setting.supportEmail ?? undefined,
      supportPhone: setting.supportPhone ?? undefined,
      billingEmail: setting.billingEmail ?? undefined,
      invoiceFooterText: setting.invoiceFooterText ?? undefined,
      termsUrl: setting.termsUrl ?? undefined,
      privacyUrl: setting.privacyUrl ?? undefined,
      studentPortalMessage: setting.studentPortalMessage ?? undefined,
    };

    billingState.value = {
      lateFeeEnabled: setting.lateFeeEnabled,
      lateFeeType: setting.lateFeeType,
      lateFeeValue: setting.lateFeeValue !== undefined ? Number(setting.lateFeeValue) : 0,
      lateFeeGracePeriodDays: setting.lateFeeGracePeriodDays,
      autoSendInvoices: setting.autoSendInvoices,
      invoiceDueDays: setting.invoiceDueDays,
      allowPartialPayments: setting.allowPartialPayments,
      minimumPartialPaymentPercent: setting.minimumPartialPaymentPercent !== undefined
        ? Number(setting.minimumPartialPaymentPercent)
        : 20,
    };

    notificationsState.value = {
      notifyOnPayment: setting.notifyOnPayment,
      notifyOnOverdue: setting.notifyOnOverdue,
      notifyOnAllocation: setting.notifyOnAllocation,
      notifyOnMaintenance: setting.notifyOnMaintenance,
      notifyOnUpcoming: setting.notifyOnUpcoming,
      overdueReminderDays: setting.overdueReminderDays ?? [3, 7, 14],
      upcomingReminderDays: setting.upcomingReminderDays ?? [7, 3, 1, 0],
    };

    portalState.value = {
      allowStudentSelfCheckout: setting.allowStudentSelfCheckout,
      allowStudentViewRoommates: setting.allowStudentViewRoommates,
      allowStudentMaintenanceRequests: setting.allowStudentMaintenanceRequests,
      allowStudentComplaints: setting.allowStudentComplaints,
    };

    academicState.value = {
      defaultAcademicYear: setting.defaultAcademicYear,
      defaultAcademicPeriod: setting.defaultAcademicPeriod,
    };
  });

  const isSaving = ref(false);

  async function save(tab: CompanySettingsTab, payload: Record<string, unknown>) {
    isSaving.value = true;
    try {
      const queryParams = selectedCompanyId.value ? { companyId: selectedCompanyId.value } : {};

      await $apiFetch("/api/settings/company", {
        method: "PATCH",
        body: payload,
        query: queryParams,
      });

      toast.add({
        title: "Settings saved",
        description: "Your changes have been applied.",
        color: "success",
        icon: "i-lucide-circle-check-big",
      });

      await refresh();
    }
    catch (error) {
      const message = (error as any)?.data?.message ?? "Something went wrong.";
      toast.add({
        title: "Failed to save settings",
        description: message,
        color: "error",
        icon: "i-lucide-circle-alert",
        duration: 8000,
      });
    }
    finally {
      isSaving.value = false;
    }
  }

  const { companyList, companyListStatus } = useAdminDashboardData();

  if (isPlatformAdmin.value) {
    watchEffect(() => {
      if (companyList.value && companyList.value.length && !selectedCompanyId.value) {
        selectedCompanyId.value = companyList.value[0]?.id;
      }
    });
  }

  const companyOptions = computed(() => companyList.value
    ? companyList.value.map(company => ({
        label: company.name,
        value: company.id,
      }))
    : []);

  const activeTab = computed({
    get() {
      return (route.query.tab as CompanySettingsTab) || "payments";
    },
    set(tab: CompanySettingsTab) {
      void router.push({
        path: "/admin/settings/company",
        query: {
          ...route.query,
          tab,
        },
      });
    },
  });

  watch([selectedCompanyId, isPlatformAdmin], ([companyId, isPlatformAdminValue]) => {
    if (isPlatformAdminValue && companyId) {
      const existingQueries = router.currentRoute.value.query;

      if (existingQueries.companyId !== String(companyId)) {
        void router.push({
          path: "/admin/settings/company",
          query: {
            ...existingQueries,
            companyId: String(companyId),
          },
        });
      }
    }
  });

  const isMounted = ref(false);
  onMounted(() => {
    isMounted.value = true;
  });

  const isCompanyDropdownLoading = computed(() => {
    if (!isMounted.value) return true;

    return companyListStatus.value === "pending";
  });

  return {
    settings,
    status,
    isFirstSetup,

    generalState,
    billingState,
    notificationsState,
    portalState,
    academicState,

    isPlatformAdmin,
    companyOptions,
    selectedCompanyId,
    companyListStatus,
    isCompanyDropdownLoading,

    activeTab,
    isSaving,
    save,
    refresh,
    handleFormError: $handleFormError,
  };
}
