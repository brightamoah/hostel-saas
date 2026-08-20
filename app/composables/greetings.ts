export function useGreetings() {
  const currentHour = ref(new Date().getHours());

  const greeting = computed(() => {
    if (currentHour.value < 12) return "Good Morning";

    else if (currentHour.value < 18) return "Good Afternoon";

    return "Good Evening";
  });

  const dayNightImageUrlLight = computed(() => {
    if (greeting.value === "Good Morning") return "svgs/light/sunnyCloud.svg";
    else if (greeting.value === "Good Afternoon") return "svgs/light/sunny.svg";
    else return "svgs/light/moon.svg";
  });

  const dayNightImageUrlDark = computed(() => {
    if (greeting.value === "Good Morning") return "svgs/dark/sunnyCloud.svg";
    else if (greeting.value === "Good Afternoon") return "svgs/dark/sunny.svg";
    else return "svgs/dark/moon.svg";
  });

  return {
    greeting,
    dayNightImageUrlDark,
    dayNightImageUrlLight,
  };
}
