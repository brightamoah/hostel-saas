<script lang="ts" setup>
import { useAuthStore } from "~/stores/authStore";

const { showNavbar = true, showBg = true } = defineProps<{
  showNavbar?: boolean;
  showBg?: boolean;
}>();

const authStore = useAuthStore();
const { refreshSession } = authStore;

await refreshSession();
</script>

<template>
  <div class="relative min-h-screen">
    <SvgsLine1
      v-if="showBg"
      class="-z-10 fixed inset-0 opacity-15 w-full h-full pointer-events-none"
    />

    <!-- <div
      class="absolute inset-0 overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      <div class="absolute inset-0 hero-grid-overlay opacity-[0.035] dark:opacity-[0.06]" />

      <div class="top-0 left-1/2 absolute bg-primary/30 w-150 h-px -translate-x-1/2" />
    </div> -->

    <AppNavbar v-if="showNavbar" />

    <UMain>
      <slot />
    </UMain>

    <AppFooter />
  </div>
</template>

<style>
  .hero-grid-overlay {
  background-image:
    linear-gradient(to right, currentColor 3px, transparent 2px),
    linear-gradient(to bottom, currentColor 3px, transparent 2px);
  background-size: 48px 48px;
  color: var(--ui-color-neutral-800);
}
</style>
