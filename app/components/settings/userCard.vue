<script setup lang="ts">
import { useDateFormat } from "@vueuse/core";

const { userInitials, userBadgeColor, avatarBgColor } = useUseUserItems();

const { user } = usePortalUserSession();

const userProfile = inject(userProfileKey);

type UserItemId = "email" | "role" | "joined" | "hostel" | "company" | "companyRole";

interface UserItem {
  id: UserItemId;
  label: string;
  value: string | number | undefined;
}

const userItems = computed<UserItem[]>(() => {
  const items: UserItem[] = [
    {
      id: "email",
      label: "Email:",
      value: user.value?.email,
    },
    {
      id: "role",
      label: "Role:",
      value: user.value?.role,
    },
    {
      id: "joined",
      label: "Joined:",
      value: user.value?.createdAt
        ? useDateFormat(new Date(user.value.createdAt), "Do MMMM, YYYY").value
        : undefined,
    },
    {
      id: "hostel",
      label: "Hostel:",
      value: userProfile?.value?.hostel,
    },
  ];

  if (user.value?.role === "admin") {
    items.push(
      {
        id: "company",
        label: "Company:",
        value: userProfile?.value?.company,
      },
    );
  }

  return items;
});
</script>

<template>
  <UCard
    variant="subtle"
    class="flex flex-col md:col-span-1 md:row-span-2 shadow-md w-fit max-w-80"
  >
    <div class="flex flex-col items-center gap-3 py-4">
      <UAvatar
        :src="user?.image!"
        :alt="user?.name"
        :text="userInitials"
        :ui="{
          fallback: `text-white text-4xl`,
        }"
        :style=" `background-color: ${avatarBgColor}`"
        class="size-30"
      />

      <div class="flex items-center gap-1.5">
        <p class="font-semibold text-highlighted text-xl">
          {{ user?.name }}
        </p>

        <UTooltip
          :text="user?.emailVerified ? 'Email Verified' : 'Email Not Verified'"
          arrow
        >
          <UIcon
            v-if="user?.emailVerified"
            name="i-lucide-badge-check"
            class="size-5 text-success shrink-0"
          />

          <UIcon
            v-else
            name="i-lucide-badge-x"
            class="size-5 text-error shrink-0"
          />
        </UTooltip>
      </div>

      <USeparator
        size="sm"
        class="mt-4"
      />

      <div class="flex flex-col gap-3 py-4 text-sm">
        <DashboardDetailItem
          v-for="item in userItems"
          :key="item.id"
          :label="item.label"
          :value="item.value!"
          class="gap-3 w-full"
          label-class="font-medium text-muted shrink-0"
        >
          <template #default>
            <UBadge
              v-if="item.id === 'role'"
              variant="subtle"
              :color="userBadgeColor"
              class="justify-center items-center w-fit"
            >
              {{ item.value }}
            </UBadge>
          </template>
        </DashboardDetailItem>
      </div>
    </div>
  </UCard>
</template>

<style scoped>

</style>
