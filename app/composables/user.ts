export function useUser() {
  const { user, loggedIn } = usePortalUserSession();

  const { data } = useFetch("/api/user/userProfile", {
    method: "GET",
    immediate: loggedIn.value,
    key: computed(() => `user-profile-${user.value?.id}`),
    lazy: true,
    cache: "default",
    getCachedData: (key, nuxtApp, ctx) => {
      if (ctx.cause === "refresh:manual" || ctx.cause === "refresh:hook") return undefined;
      return nuxtApp.payload.data[key] ?? nuxtApp.static.data[key];
    },
    watch: [loggedIn],
  });

  const userProfile = computed<UserProfile | null>(() => {
    const profile = data.value?.data;

    if (!profile) return null;

    return {
      ...profile,
      createdAt: new Date(profile.createdAt),
      lastLogin: profile.lastLogin ? new Date(profile.lastLogin) : null,
    };
  });

  return {
    userProfile,
  };
}
