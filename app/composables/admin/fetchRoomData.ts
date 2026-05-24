import type { SelectMenuItem } from "@nuxt/ui";

export function useFetchRoomData() {
  const { user } = usePortalUserSession();

  const { data, status, refresh, error } = useFetch<RoomDataResponse>("/api/room/getRoomData", {
    method: "get",
    key: computed(() => `roomData:${user.value?.adminData?.accessLevel}`),
    cache: "default",
    lazy: true,
    default: () => ({
      rooms: [],
      hostels: [],
      totalRooms: 0,
      totalOccupiedRooms: 0,
      totalAvailableRooms: 0,
      totalUnderMaintenance: 0,
      totalFullyOccupiedRooms: 0,
      totalVacantRooms: 0,
      totalPartiallyOccupiedRooms: 0,
      totalReservedRooms: 0,
      totalRoomsNew: {
        value: 0,
        percentage: 0,
        period: "monthly" as const,
      },
      availableRooms: {
        value: 0,
        percentage: 0,
        period: "monthly" as const,
      },
      maintenanceRooms: {
        value: 0,
        percentage: 0,
        period: "monthly" as const,
      },
      occupiedRooms: {
        value: 0,
        percentage: 0,
        period: "monthly" as const,
      },

    }),
    getCachedData: (key, nuxtApp, ctx) => {
      if (ctx.cause === "refresh:manual" || ctx.cause === "refresh:hook") return undefined;
      return nuxtApp.payload.data[key] ?? nuxtApp.static.data[key];
    },
  });

  const isMounted = ref(false);
  onMounted(() => {
    isMounted.value = true;
  });

  const uiStatus = computed(() => {
    if (!isMounted.value) return "pending";
    if (data.value && data.value.rooms?.length > 0) return "success";
    return status.value;
  });

  const rooms = computed<Room[]>(() => data.value?.rooms ?? []);

  const hostels = computed(() => data.value?.hostels ?? []);

  const hostelItem = computed<SelectMenuItem[]>(() =>
    hostels.value.map(h => ({ label: h.name, value: h.id })));

  const {
    canResend,
    coolDownTime,
    isLoading,
    handleRefresh,
  } = useDataRefresh(
    "roomDataCoolDown",
    "useFetchRoomData",
    refresh,
  );

  return {
    rooms,
    data,
    status,
    uiStatus,
    coolDownTime,
    isLoading,
    canResend,
    hostels,
    hostelItem,
    error,
    refresh,
    handleRefresh,
  };
}
