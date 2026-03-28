<script setup lang="ts">
import type { ProfileSettingsItem } from "~~/shared/types";

const {
  id,
  title,
  icon,
  description,
  link,
  buttonLabel,
} = defineProps<ProfileSettingsItem>();
</script>

<template>
  <UCard
    :key="id"
    variant="subtle"
    class="flex flex-col justify-center items-center gap-3 shadow-md text-center"
  >
    <h1 class="font-semibold text-xl">
      {{ title }}
    </h1>

    <UIcon
      :name="icon"
      class="size-20 text-dimmed"
    />

    <p>{{ description }}</p>

    <UButton
      :label="buttonLabel"
      :to="link"
      variant="link"
      trailing-icon="i-lucide-circle-arrow-right"
      class="mt-4 cursor-pointer"
    />
  </UCard>
</template>

<style scoped>

</style>
