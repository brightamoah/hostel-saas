<script setup lang="ts">
defineProps<{
  label: string;
  value?: string | number;
  valueClass?: string;
  labelClass?: string;
}>();
</script>

<template>
  <div>
    <p
      class="text-muted text-sm"
      :class="[labelClass]"
    >
      <slot name="label">
        {{ label }}
      </slot>
    </p>

    <div
      class="font-medium text-base"
      :class="[valueClass]"
    >
      <slot>{{ value }}</slot>
    </div>
  </div>
</template>

<style scoped>

</style>
