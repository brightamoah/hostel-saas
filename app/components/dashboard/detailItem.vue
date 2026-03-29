<script setup lang="ts">
defineProps<{
  label: string;
  value?: string | number | boolean;
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
      <slot
        name="label"
        :label
      >
        {{ label }}
      </slot>
    </p>

    <p
      class="font-medium text-base"
      :class="[valueClass]"
    >
      <slot :value>
        {{ value }}
      </slot>
    </p>
  </div>
</template>

<style scoped>

</style>
