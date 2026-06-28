import type { SelectMenuItem } from "@nuxt/ui";
import { defineStore } from "pinia";

export const useCompanyHostelFilterStore = defineStore("companyHostelFilter", () => {
  const { isPlatformAdmin, user } = usePortalUserSession();
  const route = useRoute();
  const router = useRouter();

  // Selected state from URL query
  const companyId = ref<number | undefined>(
    route.query.companyId ? Number(route.query.companyId) : undefined,
  );
  const hostelId = ref<number | undefined>(
    route.query.hostelId ? Number(route.query.hostelId) : undefined,
  );

  watch(companyId, (newId, oldId) => {
    if (oldId !== undefined && newId !== oldId) hostelId.value = undefined;
  });

  // Sync state to URL
  watch([companyId, hostelId], async ([newCompanyId, newHostelId]) => {
    const query = { ...route.query };

    if (newCompanyId) query.companyId = String(newCompanyId);
    else delete query.companyId;

    if (newHostelId) query.hostelId = String(newHostelId);
    else delete query.hostelId;

    await router.replace({ query });
  });

  // Watch URL to sync back to state (e.g. on navigation)
  watch(
    () => route.query,
    (query) => {
      companyId.value = query.companyId ? Number(query.companyId) : undefined;
      hostelId.value = query.hostelId ? Number(query.hostelId) : undefined;
    },
  );

  // Platform Admin: Fetch Companies
  const { data: companiesResponse, status: companiesStatus } = useFetch("/api/admin/company", {
    key: "admin-companies-list",
    immediate: isPlatformAdmin.value,
    lazy: true,
  });

  const companies = computed(() => companiesResponse.value || []);

  const companyOptions = computed(() =>
    companies.value.map(c => ({
      id: c.id,
      label: c.name,
      value: c.id,
      hostels: c.hostels || [],
    })),
  );

  // Hostel Options
  const { hostels: ownerHostels } = useFetchRoomData();

  const hostelOptions = computed<SelectMenuItem[]>(() => {
    if (isPlatformAdmin.value) {
      if (!companyId.value) return [];

      const selectedCompany = companyOptions.value.find(c => c.value === companyId.value);

      if (!selectedCompany) return [];
      return selectedCompany.hostels.map(h => ({
        id: h.id,
        label: h.name,
        value: h.id,
      }));
    }

    if (user.value?.companyRole === "owner") {
      return ownerHostels.value.map(h => ({
        id: h.id,
        label: h.name,
        value: h.id,
      }));
    }

    return [];
  });

  // Visibility flags
  const showCompanyFilter = computed(() => isPlatformAdmin.value);
  const showHostelFilter = computed(() =>
    (isPlatformAdmin.value && !!companyId.value)
    || user.value?.companyRole === "owner",
  );

  return {
    companyId,
    hostelId,
    companyOptions,
    hostelOptions,
    companiesStatus,
    showCompanyFilter,
    showHostelFilter,
  };
});
