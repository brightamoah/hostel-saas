<script setup lang="ts">
const { loggedIn, user } = usePortalUserSession();
const config = useRuntimeConfig();

const dashboardRoute = computed(() => {
  if (!loggedIn.value || !user.value) return "auth-login";
  switch (user.value.role) {
    case "admin": return "admin-dashboard";
    case "student": return "auth-hostelHub";
    default: return "auth-login";
  }
});

const isAdminDomain = computed(() => {
  const adminUrl = config.public.adminBaseUrl;
  if (!adminUrl) return false;
  const currentUrl = useRequestURL().href;
  return currentUrl.startsWith(adminUrl) || currentUrl.includes("admin.");
});

const features = ref([
  {
    icon: "i-lucide-bed",
    title: "Smart Room Management",
    description: "Intelligent room allocation, maintenance tracking, and occupancy optimization all from a single dashboard.",
  },
  {
    icon: "i-lucide-users",
    title: "Resident Portal",
    description: "Self-service portal for bookings, payments, and real-time communication with management.",
  },
  {
    icon: "i-lucide-credit-card",
    title: "Automated Billing",
    description: "Seamless payment processing with multiple payment options and instant receipts.",
  },
  {
    icon: "i-lucide-bar-chart-3",
    title: "Analytics Dashboard",
    description: "Real-time insights and reporting so you always have the full picture.",
  },
  {
    icon: "i-lucide-shield-check",
    title: "Secure & Reliable",
    description: "Bank-grade security with 99.9% uptime so your data is always safe.",
  },
  {
    icon: "i-lucide-headphones",
    title: "24/7 Support",
    description: "Round-the-clock customer support whenever and wherever you need help.",
  },
]);

// const stats = ref([
//   { value: "10k+", label: "Students Managed" },
//   { value: "99.9%", label: "Uptime" },
//   { value: "500+", label: "Hostels Onboarded" },
//   { value: "< 2min", label: "Setup Time" },
// ]);
</script>

<template>
  <div
    id="home"
    class="relative flex flex-col items-center bg-transparent mx-auto w-full h-full overflow-hidden"
  >
    <!-- Hero Section -->
    <section class="relative w-full">
      <div class="z-10 relative mx-auto px-4 pt-20 pb-10 max-w-5xl text-center">
        <!-- eyebrow badge -->
        <div class="flex justify-center mb-3 animate-fade-in-up">
          <UBadge
            variant="subtle"
            color="primary"
            class="px-3 py-1 rounded-full font-geist text-xs uppercase tracking-widest"
          >
            Hostel Management · Reimagined
          </UBadge>
        </div>

        <!-- Headline -->
        <h1 class="font-newsreader font-semibold text-highlighted text-4xl sm:text-6xl lg:text-7xl leading-[1.08] tracking-tight animate-fade-in-up animation-delay-600">
          The smarter way<br>

          <em class="text-primary not-italic">to run your hostel.</em>
        </h1>

        <!-- Subtext -->
        <p class="mx-auto mt-6 max-w-2xl font-geist text-muted text-base sm:text-lg leading-relaxed animate-fade-in-up animation-delay-1000">
          <span class="hidden md:inline">
            Seamlessly book rooms, manage tenants, and track payments - whether you're a resident or an admin, everything stays organized and effortless.
          </span>

          <span class="md:hidden inline">
            Book rooms, manage tenants and track payments - all in one place.
          </span>
        </p>

        <!-- CTA buttons -->
        <div class="flex flex-wrap justify-center gap-3 mt-8 animate-fade-in-up animation-delay-1000">
          <UButton
            label="Get Started"
            icon="i-lucide-rocket"
            variant="solid"
            color="primary"
            size="xl"
            class="font-geist cursor-pointer"
            @click="navigateTo({ name: dashboardRoute })"
          />

          <UButton
            v-if="isAdminDomain"
            label="Register Your Company"
            icon="i-lucide-building-2"
            variant="subtle"
            color="neutral"
            size="xl"
            class="font-geist cursor-pointer"
            @click="navigateTo({ name: 'auth-registerCompany' })"
          />
        </div>
      </div>

      <!-- Dashboard image with floating frame effect -->
      <div class="relative mx-auto px-4 max-w-5xl hero-image">
        <div class="relative shadow-2xl shadow-primary/5 rounded-2xl ring-1 ring-muted/40 overflow-hidden">
          <!-- Top bar chrome detail -->
          <div class="flex items-center gap-1.5 bg-muted/30 px-4 py-2.5 border-muted/40 border-b">
            <span class="bg-muted/60 rounded-full size-2.5" />

            <span class="bg-muted/60 rounded-full size-2.5" />

            <span class="bg-muted/60 rounded-full size-2.5" />

            <span class="ml-2 font-geist text-dimmed text-xs">kayanest.app/dashboard</span>
          </div>

          <UColorModeImage
            light="https://res.cloudinary.com/eves-oasis/image/upload/v1768310662/Screenshot_20260113_131446_Chrome_uenak4.jpg"
            dark="https://res.cloudinary.com/eves-oasis/image/upload/v1768248510/Screenshot_20260112_195234_Chrome_f7tcdb.jpg"
            class="block w-full"
          />
        </div>
      </div>
    </section>

    <!-- Stats strip -->
    <!-- <section class="mx-auto mt-16 mb-2 px-4 w-full max-w-5xl">
      <div class="gap-px grid grid-cols-2 sm:grid-cols-4 bg-muted/30 rounded-2xl ring-1 ring-muted/30 overflow-hidden">
        <div
          v-for="stat in stats"
          :key="stat.label"
          class="group flex flex-col justify-center items-center bg-default hover:bg-muted/10 px-4 py-6 transition-colors duration-200"
        >
          <span class="font-newsreader font-semibold tabular-nums text-highlighted group-hover:text-primary text-3xl transition-colors duration-200">
            {{ stat.value }}
          </span>

          <span class="mt-1 font-geist text-dimmed text-xs uppercase tracking-wide">
            {{ stat.label }}
          </span>
        </div>
      </div>
    </section> -->

    <div class="my-12 linebreak" />

    <UPageSection
      id="features"
      :ui="{
        container: 'max-w-5xl',
        title: 'font-newsreader animate-fade-in-up text-2xl md:text-4xl lg:text-5xl font-semibold tracking-tight',
        description: 'animate-fade-in-up animation-delay-600 font-geist text-muted mt-3',
      }"
    >
      <template #headline>
        <div class="text-center animate-fade-in-up animation-delay-1600">
          <UBadge
            variant="subtle"
            size="lg"
            color="primary"
            class="justify-center items-center rounded-full"
            label="Features"
          />
        </div>
      </template>

      <template #title>
        Everything you need for<br>

        <em class="text-primary not-italic">efficient hostel administration</em>
      </template>

      <template #description>
        Our comprehensive hostel management system streamlines operations for both administrators and residents — from day one.
      </template>

      <UPageGrid class="mt-2">
        <UPageCard
          v-for="item in features"
          :key="item.title"
          v-bind="item"
          spotlight
          :ui="{
            root: 'group hover:-translate-y-0.5 transition-transform duration-200',
            title: 'font-geist font-medium text-highlighted',
            description: 'font-geist text-muted text-sm leading-relaxed',
          }"
        />
      </UPageGrid>

      <div class="mt-12 mb-10 linebreak" />

      <AppHeroCta />
    </UPageSection>

    <div class="my-12 linebreak" />

    <AppFaq id="faq" />

    <div class="my-12 linebreak" />

    <AppContactUs id="contact" />
  </div>
</template>

<style scoped>

</style>
