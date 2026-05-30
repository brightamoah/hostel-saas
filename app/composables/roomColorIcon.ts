type RoomRef = Ref<Room | undefined> | ComputedRef<Room | undefined>;

export function useRoomColorIcon(roomRef: RoomRef) {
  const room = computed(() => roomRef.value);

  const statusColorMap = ref<Record<Room["status"], ColorType>>({
    "vacant": "success",
    "partially occupied": "info",
    "fully occupied": "error",
    "under maintenance": "warning",
    "reserved": "neutral",
  });

  const featureIcons = computed(() => {
    if (!room.value || !room.value.features) return [];

    const featuresArray = Array.isArray(room.value.features)
      ? room.value.features
      : String(room.value.features).split(",").map(feature => feature.trim()).filter(feature => feature);

    return featuresArray.map((feature) => {
      const icon = featureIconMap[feature];
      return { name: feature, icon };
    });
  });

  return { statusColorMap: statusColorMap.value, featureIcons };
}
