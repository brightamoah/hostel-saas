<script lang="ts" setup>
defineProps<{
  dayNightImageUrlLight: string;
  dayNightImageUrlDark: string;
}>();
</script>

<template>
  <div>
    <UColorModeImage
      :light="dayNightImageUrlLight"
      :dark="dayNightImageUrlDark"
      width="100"
      height="100"
      alt="Weather"
      class="rounded-lg"
    />
  </div>
</template>

<style scoped>

</style>
