<script setup lang="ts">
import type { User } from "#auth-utils";
import type { NavigationFailure, RouteLocationRaw } from "vue-router";

const { handleSignOut, isLoggedIn, user } = defineProps<{
  isLoggedIn: boolean;
  user: User | null;
  handleSignOut: () => Promise<false | void | RouteLocationRaw | NavigationFailure>;
}>();

const portalSurface = usePortalSurface();

const { isPlatformAdminOrOwner } = usePortalUserSession();

const { userInitials, userBadgeColor, avatarBgColor } = useUseUserItems();

const dashboardIcon = computed(() =>
  user?.role === "admin" ? "i-lucide-monitor" : "i-lucide-graduation-cap",
);

const signUpRouteName = computed<RouteLocationRaw>(() => portalSurface === "admin"
  ? { name: "auth-registerCompany" }
  : { name: "auth-signup" },
);

const userMenuItems = computed<UserMenuItem[][]>(() => {
  if (!isLoggedIn || !user) return [];

  const items: UserMenuItem[][] = [
    [
      {
        label: user.name,
        avatar: {
          src: "https://github.com/benjamincanac.png",
        },
        slot: "profile",
        type: "label",
      },
    ],
    [
      {
        label: "View Profile",
        icon: "i-lucide-user",
        to: (user.role === "admin"
          ? { name: "admin-profile" }
          : { name: "student-profile" }),
      },
      {
        label: "Settings",
        icon: "i-lucide-settings",
        to: (user.role === "admin"
          ? { name: "admin-profile-settings-security" }
          : { name: "student-profile-settings-security" }),
      },
    ],
    [
      {
        label: "Dashboard",
        icon: dashboardIcon.value,
        to: (user.role === "admin"
          ? { name: "admin-dashboard" }
          : { name: "student-dashboard" }),
      },

    ],
  ];

  if (isPlatformAdminOrOwner.value) {
    items.push([
      {
        label: "Company Settings",
        icon: "i-lucide-building-2",
        to: { name: "admin-companySettings" },
      },
    ]);
  }

  items.push([
    {
      label: "Log Out",
      icon: "i-lucide-log-out",
      color: "error",
      onSelect: () => handleSignOut(),
    },
  ]);

  return items;
});
</script>

<template>
  <div>
    <UDropdownMenu
      v-if="user && isLoggedIn"
      arrow
      :items="userMenuItems"
      :ui="{
        content: 'max-w-64',
        item: 'cursor-pointer rounded',
      }"
    >
      <UAvatar
        :alt="user?.name || 'User'"
        :src="user?.image!"
        :text="userInitials"
        size="lg"
        class="text-highlighted cursor-pointer"
        :ui="{ fallback: 'text-white' }"
        :style="`background-color: ${avatarBgColor}`"
      />

      <template #profile>
        <UUser
          :name="user?.name"
          :description="user?.email"
          size="lg"
          :avatar="{
            src: user?.image!,
            text: userInitials,
            style: `background-color: ${avatarBgColor}`,
            ui: { fallback: 'text-white' },
          }"
        >
          <template #description>
            <p class="block max-w-[85%] truncate">
              {{ user?.email }}
            </p>

            <UBadge
              :label="user?.role"
              :color="userBadgeColor"
              variant="subtle"
              size="sm"
              class="justify-center items-center mt-1 text-center"
            />
          </template>
        </UUser>
      </template>
    </UDropdownMenu>

    <div
      v-else-if="!isLoggedIn && user === null"
      class="flex justify-between gap-2"
    >
      <UButton
        label="Login"
        color="primary"
        :to="{ name: 'auth-login' }"
        block
      />

      <UButton
        label="Signup"
        color="neutral"
        variant="subtle"
        :to="signUpRouteName"
        block
      />
    </div>

    <div
      v-else
      class="flex gap-2"
    >
      <USkeleton class="rounded w-16 h-8" />

      <USkeleton class="rounded w-16 h-8" />
    </div>
  </div>
</template>

<style scoped>

</style>
