<script setup lang="ts">
import type { CommandPaletteItem, NavigationMenuItem } from "@nuxt/ui";

const {
  sidebar = true,
} = defineProps<{
  sidebar?: boolean;
}>();

const toast = useToast();

const open = ref(false);

const { refreshSession } = useAuthStore();

const { unreadAnnouncementCount } = useAnnouncementData();
const { tenantContext } = useTenantContext();
const { userProfile } = useUser();

const links = computed(() => {
  const baseLinks: NavigationMenuItem[] = [
    {
      label: "Dashboard",
      icon: "i-lucide-house",
      to: { name: "student-dashboard" },
      onSelect: () => open.value = false,
    },
    {
      label: "Rooms",
      icon: "i-lucide-building-2",
      to: { name: "student-rooms" },
      onSelect: () => open.value = false,
    },
    {
      label: "Visitors",
      icon: "i-lucide-users",
      to: { name: "student-visitors" },
      onSelect: () => open.value = false,
    },
  ];

  if (tenantContext.value?.portal?.allowStudentMaintenanceRequests !== false) {
    baseLinks.push({
      label: "Maintenance",
      icon: "i-heroicons-wrench-screwdriver",
      to: { name: "student-maintenance" },
      onSelect: () => open.value = false,
    });
  }

  if (tenantContext.value?.portal?.allowStudentComplaints !== false) {
    baseLinks.push({
      label: "Complaints",
      icon: "i-lucide-message-square-warning",
      to: { name: "student-complaints" },
      onSelect: () => open.value = false,
    });
  }

  if (tenantContext.value?.portal?.allowStudentSelfCheckout !== false) {
    baseLinks.push({
      label: "Billings",
      icon: "i-lucide-credit-card",
      to: { name: "student-billing" },
      onSelect: () => open.value = false,
    });
  }

  baseLinks.push(
    {
      label: "Announcements",
      icon: "i-lucide-megaphone",
      to: { name: "student-announcements" },
      badge: unreadAnnouncementCount.value,
      onSelect: () => open.value = false,
    },
  );

  return [baseLinks];
});

const groups = computed(() => [
  {
    id: "links",
    label: "Go to",
    items: links.value.flat().map((link): CommandPaletteItem => ({
      label: link.label as string,
      icon: link.icon,
      to: link.to,
      onSelect: link.onSelect,
    })),
  },
  {
    id: "code",
    label: "Code",
    items: [{
      label: "View page source",
      icon: "i-lucide-github",
      to: "https://github.com/brightamoah/hostel-app.git",
      target: "_blank",
    }] satisfies CommandPaletteItem[],
  },
]);

onMounted(async () => {
  await refreshSession();

  const cookie = useCookie("cookie-consent");
  if (cookie.value === "accepted") return;

  toast.add({
    title: "We use first-party cookies to enhance your experience on our website.",
    duration: 0,
    close: false,
    actions: [{
      label: "Accept",
      color: "neutral",
      variant: "outline",
      onClick: () => {
        cookie.value = "accepted";
      },
    }, {
      label: "Opt out",
      color: "neutral",
      variant: "ghost",
      onClick: () => {
        cookie.value = "rejected";
      },
    }],
  });
});
</script>

<template>
  <UDashboardGroup unit="rem">
    <UDashboardSidebar
      v-if="sidebar"
      id="student-sidebar"
      v-model:open="open"
      collapsible
      collapsed
      resizable
      class="bg-elevated/25"
      :menu="{
        transition: true,
      }"
      :ui="{
        footer: 'lg:border-t lg:border-default',
        content: 'w-[65dvw] max-w-[65dvw] sm:w-full sm:max-w-xs',
      }"
    >
      <template #header="{ collapsed }">
        <NuxtLink
          :to="{ name: 'student-dashboard' }"
          class="flex justify-center items-center gap-2"
        >
          <img
            v-if="tenantContext?.branding?.logoUrl"
            :src="tenantContext.branding.logoUrl"
            alt="Logo"
            class="h-8 w-auto object-contain"
            :class="{
              'mx-auto': collapsed,
              'mx-0': !collapsed,
            }"
          >

          <AppLogo
            v-else
            class="size-6 md:size-8"
            :class="{
              'mx-auto': collapsed,
              'mx-0': !collapsed,
            }"
          />

          <h2
            v-if="!collapsed"
            class="font-newsreader font-semibold text-2xl truncate max-w-50"
          >
            {{ userProfile?.hostel ?? userProfile?.company ?? "Kayanest HMS" }}
          </h2>
        </NuxtLink>
      </template>

      <template #default="{ collapsed }">
        <UDashboardSearchButton
          :collapsed="collapsed && !open"
          class="bg-transparent ring-default"
        />

        <UNavigationMenu
          :collapsed="collapsed && !open"
          :items="links[0]"
          orientation="vertical"
          tooltip
          popover
          :ui="{
            item: 'py-2 last:py-0 last:mt-2',
            linkLabel: 'text-base',
            linkLeadingIcon: 'size-5',
          }"
        />
      </template>

      <template #footer="{ collapsed }">
        <UserMenu :collapsed="collapsed && !open" />
      </template>
    </UDashboardSidebar>

    <UDashboardSearch :groups />

    <slot />

    <DashboardNotificationSlideOver />
  </UDashboardGroup>
</template>
