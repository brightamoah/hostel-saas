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
const { userProfile } = useUser();
const { tenantContext } = useTenantContext();
const { isPlatformAdminOrOwner } = usePortalUserSession();

const links = computed(() => {
  const items: NavigationMenuItem[] = [
    {
      label: "Dashboard",
      icon: "i-lucide-house",
      to: { name: "admin-dashboard" },
      onSelect: () => open.value = false,
    },
    {
      label: "Rooms",
      icon: "i-lucide-building-2",
      to: { name: "admin-rooms" },
      onSelect: () => open.value = false,
    },
    {
      label: "Users",
      icon: "i-lucide-user",
      to: { name: "admin-users" },
      onSelect: () => open.value = false,
    },
    {
      label: "Visitors",
      icon: "i-lucide-users",
      to: { name: "admin-visitors" },
      onSelect: () => open.value = false,
    },
    {
      label: "Maintenance",
      icon: "i-heroicons-wrench-screwdriver",
      to: { name: "admin-maintenance" },
      onSelect: () => open.value = false,
    },
    {
      label: "Complaints",
      icon: "i-lucide-message-square-warning",
      to: { name: "admin-complaints" },
      onSelect: () => open.value = false,
    },
    {
      label: "Billings",
      icon: "i-lucide-credit-card",
      to: { name: "admin-billings" },
      onSelect: () => open.value = false,
    },
    {
      label: "Announcements",
      icon: "i-lucide-megaphone",
      to: { name: "admin-announcements" },
      badge: unreadAnnouncementCount.value,
      onSelect: () => open.value = false,
    },
    {
      label: "Analytics",
      icon: "i-lucide-chart-no-axes-combined",
      to: { name: "admin-analytics" },
      onSelect: () => open.value = false,
    },

  // {
  //   label: "Settings",
  //   to: "/settings",
  //   icon: "i-lucide-settings",
  //   defaultOpen: true,
  //   type: "trigger",
  //   children: [{
  //     label: "General",
  //     to: "/settings",
  //     exact: true,
  //     onSelect: () => {
  //       open.value = false;
  //     },
  //   }, {
  //     label: "Members",
  //     to: "/settings/members",
  //     onSelect: () => {
  //       open.value = false;
  //     },
  //   }, {
  //     label: "Notifications",
  //     to: "/settings/notifications",
  //     onSelect: () => {
  //       open.value = false;
  //     },
  //   }, {
  //     label: "Security",
  //     to: "/settings/security",
  //     onSelect: () => {
  //       open.value = false;
  //     },
  //   }],
  // },
  ];
  // [{
  //   label: "Feedback",
  //   icon: "i-lucide-message-circle",
  //   to: "https://github.com/brightamoah/hostel-app.git",
  //   target: "_blank",
  // }, {
  //   label: "Help & Support",
  //   icon: "i-lucide-info",
  //   to: "https://github.com/brightamoah/hostel-app.git",
  //   target: "_blank",
  // }]

  if (isPlatformAdminOrOwner) {
    items.push(
      {
        label: "Onboarding",
        to: { name: "admin-onboarding" },
        icon: "i-lucide-cloud-upload",
        onSelect: () => open.value = false,
      },
    );
  }

  return items;
});

const pages = computed(() => [
  {
    label: "Company Settings",
    icon: "i-lucide-building",
    to: { name: "admin-settings-company" },
    onSelect: () => open.value = false,
  },
  {
    label: "Hostel Settings",
    icon: "i-lucide-hotel",
    to: { name: "admin-settings-hostel" },
    onSelect: () => open.value = false,
  },
  {
    label: "Profile",
    icon: "i-lucide-user",
    to: { name: "admin-profile" },
  },
  {
    label: "Change Password",
    icon: "i-lucide-key",
    to: { name: "admin-profile-settings-changePassword" },
  },
  {
    label: "Login History",
    icon: "i-lucide-history",
    to: { name: "admin-profile-settings-loginHistory" },
  },
  {
    label: "Security",
    icon: "i-lucide-shield",
    to: { name: "admin-profile-settings-security" },
  },
  {
    label: "Analytics",
    icon: "i-lucide-line-chart",
    to: { name: "admin-analytics" },
  },
  {
    label: "Uploads",
    icon: "i-lucide-upload-cloud",
    to: { name: "admin-uploads" },
  },
  {
    label: "Privacy Policy",
    icon: "i-lucide-file-text",
    to: { name: "admin-profile-settings-privacy" },
  },
  {
    label: "About",
    icon: "i-lucide-info",
    to: { name: "about" },
  },
  {
    label: "Contact Us",
    icon: "i-lucide-phone",
    to: { name: "contact" },
  },
  {
    label: "FAQ",
    icon: "i-lucide-message-circle-question-mark",
    to: { name: "faq" },
  },
  {
    label: "Features",
    icon: "i-lucide-sparkles",
    to: { name: "features" },
  },
  {
    label: "Home Page",
    icon: "i-lucide-home",
    to: { name: "index" },
  },
] satisfies NavigationMenuItem[]);

const groupItems = computed(() => [...links.value.flat(), ...pages.value]);

const groups = computed(() => [
  {
    id: "links",
    label: "Go to",
    items: groupItems.value.map((link): CommandPaletteItem => ({
      label: link.label as string,
      icon: link.icon,
      to: link.to,
      onSelect: link.onSelect,
    })),
  },
  // {
  //   id: "code",
  //   label: "Code",
  //   items: [{
  //     id: "source",
  //     label: "View page source",
  //     icon: "i-lucide-github",
  //     to: "https://github.com/brightamoah/hostel-app.git",
  //     target: "_blank",
  //   }],
  // },
]);

function persistOptOut() {
  // Use localStorage for opt-out persistence
  localStorage.setItem("cookie-consent-optout", "1");
}

function isOptedOut() {
  return localStorage.getItem("cookie-consent-optout") === "1";
}

onMounted(async () => {
  await refreshSession();

  const cookie = useCookie("cookie-consent");
  if (cookie.value === "accepted" || isOptedOut()) return;

  toast.add({
    title: "We use first-party cookies to enhance your experience on our website.",
    duration: 0,
    close: false,
    actions: [
      {
        label: "Accept",
        color: "neutral",
        variant: "outline",
        onClick: () => {
          cookie.value = "accepted";
        },
      },
      {
        label: "Opt out",
        color: "neutral",
        variant: "ghost",
        onClick: () => {
          persistOptOut();
          toast.clear?.();
        },
      },
    ],
  });
});
</script>

<template>
  <UDashboardGroup unit="rem">
    <UDashboardSidebar
      v-if="sidebar"
      id="admin-sidebar"
      v-model:open="open"
      collapsible
      collapsed
      resizable
      class="bg-elevated/25"
      :menu="{
        transition: false,
      }"
      :ui="{
        footer: 'lg:border-t lg:border-default',
        content: 'w-[65dvw] max-w-[65dvw] sm:w-full sm:max-w-xs',
      }"
    >
      <template #header="{ collapsed }">
        <NuxtLink
          :to="{ name: 'admin-dashboard' }"
          class="flex justify-center items-center gap-2"
        >
          <NuxtImg
            v-if="tenantContext?.branding?.logoUrl"
            :src="tenantContext.branding.logoUrl"
            alt="Logo"
            class="size-6 md:size-8 object-contain"
            :class="{
              'mx-auto': collapsed,
              'mx-0': !collapsed,
            }"
          />

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
            class="font-newsreader font-semibold text-2xl"
          >
            {{ userProfile?.hostel ?? "Kayanest" }}
          </h2>
        </NuxtLink>
      </template>

      <template #default="{ collapsed }">
        <UDashboardSearchButton
          :collapsed="collapsed && !open"
          class="bg-transparent ring-default cursor-pointer"
        />

        <UNavigationMenu
          :collapsed="collapsed && !open"
          :items="links"
          orientation="vertical"
          tooltip
          popover
          :ui="{
            item: 'py-2 last:py-0 last:mt-2',
            linkLabel: 'text-base',
            linkLeadingIcon: 'size-5',
          }"
        />

        <!-- <UNavigationMenu
          :collapsed="collapsed && !open"
          :items="links[1]"
          orientation="vertical"
          tooltip
          class="mt-auto"
        /> -->
      </template>

      <template #footer="{ collapsed }">
        <UserMenu :collapsed />
      </template>
    </UDashboardSidebar>

    <UDashboardSearch :groups />

    <slot />

    <DashboardNotificationSlideOver />
  </UDashboardGroup>
</template>
