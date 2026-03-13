import type { SelectMenuItem } from "@nuxt/ui";

export function useFetchStudentRoomData(hostelSlug: Ref<string> | ComputedRef<string>) {
  // const { user } = usePortalUserSession();

  // const { data, status, refresh } = useFetch<StudentRoomData>("/api/room/student/rooms", {
  //   method: "GET",
  //   key: computed(() => `roomData:${user.value?.role}`),
  //   lazy: true,
  //   cache: "default",
  //   default: () => ({
  //     rooms: [],
  //     hostels: [],
  //     totalRooms: 0,
  //   }),
  //   getCachedData: (key, nuxtApp, ctx) => {
  //     if (ctx.cause === "refresh:manual" || ctx.cause === "refresh:hook") return undefined;
  //     return nuxtApp.payload.data[key] ?? nuxtApp.static.data[key];
  //   },
  // });

  const { data, status, error, refresh } = useFetch<HostelDetailsResponse>(`/api/student/hostels/${hostelSlug.value}`, {
    method: "GET",
    key: computed(() => `hostelRooms:${hostelSlug.value}`),
    lazy: true,
    getCachedData: (key, nuxtApp, ctx) => {
      if (ctx.cause === "refresh:manual" || ctx.cause === "refresh:hook") return undefined;
      return nuxtApp.payload.data[key] ?? nuxtApp.static.data[key];
    },
  });

  const rooms = computed<HostelRoom[]>(() => data.value?.rooms ?? []);

  const hostel = computed(() => data.value?.hostel ?? null);

  const hostelItem = computed<SelectMenuItem[]>(() => {
    if (!data.value?.hostel) return [];
    return [{
      label: data.value.hostel.name,
      value: data.value.hostel.id,
    }];
  });

  const stats = computed(() => data.value?.stats ?? {
    totalRooms: 0,
    availableRooms: 0,
    minimumPrice: 0,
    maximumPrice: 0,
  });

  const roomTypes = computed<string[]>(() => data.value?.roomTypes ?? []);

  const studentGender = computed<"male" | "female">(() => data.value?.studentGender ?? "male");

  const {
    canResend,
    coolDownTime,
    isLoading,
    handleRefresh,
  } = useDataRefresh(
    `roomDataCoolDown:${hostelSlug.value}`,
    "useFetchStudentRoomData",
    refresh,
  );

  return {
    rooms,
    data,
    roomTypes,
    studentGender,
    stats,
    status,
    coolDownTime,
    isLoading,
    canResend,
    hostel,
    hostelItem,
    error,
    refresh,
    handleRefresh,
  };
}
