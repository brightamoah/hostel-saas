<script lang="ts" setup>
const { showGridBg = false } = defineProps<{
  showGridBg?: boolean;
}>();

const { fetch: refreshSession } = usePortalUserSession();

await refreshSession();
</script>

<template>
  <div class="relative min-h-screen">
    <SvgsLine1
      v-if="showGridBg"
      class="-z-10 absolute inset-0 opacity-10 w-full h-full pointer-events-none"
    />

    <div class="top-8 right-8 z-10 absolute">
      <AppThemeToggle />
    </div>

    <slot />
  </div>
</template>

<style scoped>

</style>
