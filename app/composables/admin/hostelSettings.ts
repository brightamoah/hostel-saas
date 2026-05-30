export function useHostelSettings() {
  const { $apiFetch, $handleFormError } = useNuxtApp();

  const { isPlatformAdminOrOwner, user } = usePortalUserSession();

  const assignedHostelId = computed(() => user.value?.adminData?.hostelId ?? undefined);

  const route = useRoute();
  const router = useRouter();
  const toast = useToast();

  const selectedHostelId = ref<number | undefined>(
    route.query.hostelId ? Number(route.query.hostelId) : undefined,
  );

  const hostelId = computed(() => {
    if (isPlatformAdminOrOwner.value) {
      return selectedHostelId.value || assignedHostelId.value || 0;
    }
    return assignedHostelId.value || 0;
  });

  const { hostels, status: hostelsStatus } = useFetchRoomData();

  const hostelOptions = computed(() => {
    return hostels.value.map(hostel => ({
      label: hostel.name,
      value: hostel.id,
    }));
  });

  const isHostelDropdownLoading = computed(() => hostelsStatus.value === "pending");

  watch([selectedHostelId, isPlatformAdminOrOwner], ([id, allowed]) => {
    if (allowed && id) {
      const existingQueries = router.currentRoute.value.query;
      if (existingQueries.hostelId !== String(id)) {
        void router.push({
          path: route.path,
          query: {
            ...existingQueries,
            hostelId: String(id),
          },
        });
      }
    }
  });

  watchEffect(() => {
    if (isPlatformAdminOrOwner.value && hostels.value.length > 0 && !selectedHostelId.value) {
      selectedHostelId.value = hostels.value[0]?.id;
    }
  });

  const settingsKey = computed(() => `hostelSettings:${hostelId.value}`);

  const { data, status, refresh } = useFetch<HostelSettingsResponseData>(
    () => `/api/settings/hostel/${hostelId.value}`,
    {
      key: settingsKey,
      lazy: true,
      watch: [hostelId],
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

  const generalState = ref<Partial<HostelBrandingSchema>>({});
  const policiesState = ref<Partial<HostelPoliciesSchema>>({});
  const operationsState = ref<Partial<HostelOperationsSchema>>({});
  const amenitiesState = ref<Partial<HostelAmenitiesSchema>>({});

  watchEffect(() => {
    const setting = settings.value;
    if (!setting) return;

    generalState.value = {
      logoUrl: setting.logoUrl ?? undefined,
      primaryColor: setting.primaryColor ?? undefined,
      accentColor: setting.accentColor ?? undefined,
      supportEmail: setting.supportEmail ?? undefined,
      supportPhone: setting.supportPhone ?? undefined,
    };

    policiesState.value = {
      genderPolicy: setting.genderPolicy ?? "per_room",
      hostelGender: setting.hostelGender ?? undefined,
      visitorPolicy: setting.visitorPolicy ?? undefined,
      maxVisitorsPerRoom: setting.maxVisitorsPerRoom ?? 2,
      quietHoursStart: setting.quietHoursStart ?? undefined,
      quietHoursEnd: setting.quietHoursEnd ?? undefined,
    };

    operationsState.value = {
      checkInTime: setting.checkInTime ?? undefined,
      checkOutTime: setting.checkOutTime ?? undefined,
      wifiAvailable: setting.wifiAvailable ?? false,
      wifiDetails: setting.wifiDetails ?? undefined,
      parkingAvailable: setting.parkingAvailable ?? false,
      parkingDetails: setting.parkingDetails ?? undefined,
    };

    amenitiesState.value = {
      amenities: setting.amenities ?? [],
    };
  });

  const activeTab = computed({
    get() {
      return (route.query.tab as HostelSettingsTab) || "general";
    },
    set(tab: HostelSettingsTab) {
      void router.push({
        path: route.path,
        query: { ...route.query, tab },
      });
    },
  });

  const isSaving = ref(false);

  async function save(_tab: HostelSettingsTab, payload: Record<string, unknown>) {
    isSaving.value = true;
    try {
      await $apiFetch(`/api/settings/hostel/${hostelId.value}`, {
        method: "PATCH",
        body: payload,
      });

      toast.add({
        title: "Settings saved",
        description: "Hostel settings updated successfully.",
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

  return {
    hostelOptions,
    selectedHostelId,
    isPlatformAdminOrOwner,
    isHostelDropdownLoading,

    hostelId,
    settings,
    status,
    isFirstSetup,

    generalState,
    policiesState,
    operationsState,
    amenitiesState,

    activeTab,
    isSaving,
    save,
    refresh,
    handleFormError: $handleFormError,
  };
}
