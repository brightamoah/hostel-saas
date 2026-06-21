<script setup lang="ts">
import type { ButtonProps } from "@nuxt/ui";

definePageMeta({
  layout: {
    name: "default",
    props: {
      // showNavbar: false,
      showBg: false,
    },
  },
});

const features = [
  {
    id: "room",
    icon: "i-lucide-building-2",
    label: "Room Management",
    headline: "Every room, perfectly organized.",
    description: "Assign rooms, track occupancy, manage bed spaces, and handle transfers - all from a single view. No spreadsheets, no chaos.",
    details: ["Real-time occupancy status", "Room type & capacity tracking", "Transfer & swap requests", "Vacancy alerts"],
  },
  {
    id: "maintenance",
    icon: "i-lucide-wrench",
    label: "Maintenance Requests",
    headline: "Issues reported. Issues resolved.",
    description: "Students submit requests with photo or video evidence. Staff triage, assign, and resolve - with full status visibility on both ends.",
    details: ["Photo & video attachments", "Priority levels", "Staff assignment", "Status tracking"],
  },
  {
    id: "payments",
    icon: "i-heroicons-credit-card",
    label: "Payments",
    headline: "Fee collection without friction.",
    description: "Accept hostel fees securely via Paystack. Automated receipts, payment history, and outstanding balance tracking built in.",
    details: ["Paystack integration", "Automated receipts", "Payment history", "Outstanding balance alerts"],
  },
  {
    id: "announcements",
    icon: "i-lucide-megaphone",
    label: "Announcements",
    headline: "Keep everyone in the loop.",
    description: "Post rich announcements to all students or specific floors and rooms. Important notices are never buried in a chat thread again.",
    details: ["Rich text editor", "Targeted broadcasts", "Pinned notices", "Read receipts"],
  },
  {
    id: "portal",
    icon: "i-lucide-circle-user",
    label: "Student Portal",
    headline: "A home for every student.",
    description: "Students access their room details, payment history, maintenance requests, and announcements from a clean, dedicated portal.",
    details: ["Room & booking info", "Payment history", "Request tracking", "Notification centre"],
  },
  {
    id: "admin",
    icon: "i-lucide-layout-dashboard",
    label: "Admin Dashboard",
    headline: "Full visibility. Full control.",
    description: "A command centre for hostel managers. Monitor everything from occupancy rates to pending maintenance across all floors at a glance.",
    details: ["Occupancy analytics", "Revenue overview", "Staff activity logs", "Export reports"],
  },
  {
    id: "visitors",
    icon: "i-lucide-users",
    label: "Visitor Management",
    headline: `Know who's on your premises.`,
    description: "Log visitor check-ins and check-outs, link visits to student hosts, and maintain a complete access record for security.",
    details: ["Check-in / check-out log", "Host student linking", "Visit history", "Access reports"],
  },
  {
    id: "complaints",
    icon: "i-lucide-message-square-warning",
    label: "Complaints",
    headline: "Every voice, heard and resolved.",
    description: "Students raise formal complaints confidentially. Admins review, respond, and close with a full audit trail kept for accountability.",
    details: ["Confidential submissions", "Admin review workflow", "Resolution tracking", "Audit trail"],
  },
];

const activeId = ref("room");
const activeFeature = computed(() => features.find(f => f.id === activeId.value)!);

const isActive = computed(() => (id: string) => id === activeId.value);

const links = ref<ButtonProps[]>([
  {
    label: "Get started",
    color: "primary",
    class: "cursor-pointer",
    trailingIcon: "i-lucide-arrow-right",
    size: "lg",
    to: { name: "auth-login" },
  },
  {
    label: "Book a demo",
    color: "neutral",
    class: "cursor-pointer",
    size: "lg",
    to: { name: "contact" },
  },
]);
</script>

<template>
  <div>
    <UContainer class="py-6">
      <UColorModeButton class="top-4 right-4 absolute" />

      <section class="m-auto my-10 max-w-2xl text-center">
        <UBadge
          color="primary"
          variant="subtle"
          class="mb-2 rounded-full font-bold text-xs uppercase"
        >
          Platform Features
        </UBadge>

        <h1 class="font-newsreader font-semibold text-[clamp(2.2rem,5vw,3.75rem)] text-highlighted leading-[1.1]">
          Everything a hostel<br>

          needs to run <span class="text-primary">efficiently.</span>
        </h1>

        <p class="mt-2 text-muted text-lg">
          Manage rooms, maintenance, payments, communication and more from one streamlined platform built for efficiency.
        </p>
      </section>

      <section class="m-auto my-16 w-full max-w-5xl">
        <div class="gap-3 grid grid-cols-2 md:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] px-3">
          <UButton
            v-for="feature in features"
            :key="feature.id"
            :color="isActive(feature.id) ? 'primary' : 'neutral'"
            :variant="isActive(feature.id) ? 'solid' : 'subtle'"
            size="lg"
            class="group flex justify-between items-center gap-3 py-3.5 hover:border-accented rounded-xl w-full transition-colors duration-200 cursor-pointer"
            @click="activeId = feature.id"
          >
            <div class="flex items-center gap-2 w-full">
              <UIcon
                :name="feature.icon"
                class="size-5 shrink-0"
              />

              <span class="truncate card-label">{{ feature.label }}</span>
            </div>

            <UIcon
              name="i-lucide-arrow-right"
              class="opacity-0 group-hover:opacity-100 size-4.5 transition-all -translate-x-1 group-hover:translate-x-0 duration-300 ease-out shrink-0"
            />
          </UButton>
        </div>
      </section>

      <section class="m-auto px-2 pb-18 w-full md:max-w-6xl">
        <Transition
          name="fade"
          mode="out-in"
        >
          <div
            :key="activeFeature.id"
            class="flex md:flex-row flex-col gap-12 bg-muted shadow-md p-6 md:p-16 border border-muted rounded-xl"
          >
            <div class="flex flex-col items-start gap-3">
              <UIcon
                :name="activeFeature.icon"
                class="size-7 text-primary"
              />

              <p class="font-semibold text-muted text-sm uppercase">
                {{ activeFeature.label }}
              </p>

              <h2 class="font-newsreader font-bold text-[clamp(1.5rem,3vw,2.1rem)] text-2xl leading-[1.2] tracking-tight">
                {{ activeFeature.headline }}
              </h2>

              <p class="md:max-w-lg max-w-xl text-muted">
                {{ activeFeature.description }}
              </p>
            </div>

            <div>
              <p class="font-semibold text-lg">
                What's included
              </p>

              <ul class="flex flex-col gap-3 mt-4 font-medium">
                <li
                  v-for="item in activeFeature.details"
                  :key="item"
                  class="flex items-center gap-2"
                >
                  <UIcon
                    name="i-lucide-check"
                    class="check-icon"
                  />
                  {{ item }}
                </li>
              </ul>
            </div>
          </div>
        </Transition>
      </section>
    </UContainer>

    <UPageCTA
      variant="subtle"
      :links
      :ui="{
        title: 'font-newsreader tracking-tight',
      }"
      class="shadow-md"
    >
      <template #title>
        <h2 class="mb-4 font-newsreader font-bold text-highlighted text-4xl lg:text-5xl tracking-tight">
          Ready to simplify your hostel operations?
        </h2>
      </template>

      <template #description>
        <p class="mx-auto text-muted text-lg">
          Join Kayanest today and experience the future of hostel management with our all-in-one platform!
        </p>
      </template>
    </UPageCTA>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(6px);
}

.fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
